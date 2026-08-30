import { useCallback, useRef, useState, type DragEvent, type PointerEvent, type WheelEvent } from 'react';
import {
  clampZoom,
  resetCamera,
  screenToWorld,
  zoomAtPoint,
  type Camera,
} from '../lib/camera';
import type { Size } from '../lib/svgViewport';
import type { Point } from '../types/celestial';

const DEFAULT_CAMERA: Camera = Object.freeze({
  offset: Object.freeze({ x: 0, y: 0 }),
  scale: 1,
});
export const MAP_DRAG_THRESHOLD = 4;
const DEFAULT_ZOOM_STEP = 1.2;
const WHEEL_ZOOM_RATE = 0.0015;

type CameraHandlers = Readonly<{
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
}>;

export type UseMapCameraOptions = Readonly<{
  initialCamera?: Camera;
  dragThreshold?: number;
  zoomStep?: number;
  mapClientPoint?: (clientPoint: Point, viewport: Size) => Point;
}>;

export type MapCamera = Readonly<{
  camera: Camera;
  handlers: CameraHandlers;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  rebaseOffset: (offset: Point) => void;
  screenToWorld: (screenPoint: Point) => Point;
}>;

type DragState = Readonly<{
  pointerId: number;
  start: Point;
  startClient: Point;
  startOffset: Point;
  moved: boolean;
}>;

type PointerState = Readonly<{ map: Point; client: Point }>;

type PinchState = Readonly<{
  camera: Camera;
  center: Point;
  distance: number;
}>;

function localPoint(
  event: PointerEvent<HTMLElement> | WheelEvent<HTMLElement>,
  mapClientPoint?: (clientPoint: Point, viewport: Size) => Point,
): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  const clientPoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  return mapClientPoint?.(clientPoint, { width: bounds.width, height: bounds.height }) ?? clientPoint;
}

function clientLocalPoint(event: PointerEvent<HTMLElement> | WheelEvent<HTMLElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function distance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function center(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

/** Supplies pointer-driven pan/zoom state for the solar-system map surface. */
export function useMapCamera(options: UseMapCameraOptions = {}): MapCamera {
  const initialCameraRef = useRef<Camera>(resetCamera(options.initialCamera ?? DEFAULT_CAMERA));
  const dragThreshold = options.dragThreshold ?? MAP_DRAG_THRESHOLD;
  const zoomStep = options.zoomStep ?? DEFAULT_ZOOM_STEP;
  const mapClientPoint = options.mapClientPoint;
  const [camera, setCamera] = useState<Camera>(initialCameraRef.current);
  const currentCameraRef = useRef<Camera>(initialCameraRef.current);
  const pointersRef = useRef(new Map<number, PointerState>());
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);

  const setCurrentCamera = useCallback((nextCamera: Camera) => {
    currentCameraRef.current = nextCamera;
    setCamera(nextCamera);
  }, []);

  const establishPinch = useCallback(() => {
    const points = [...pointersRef.current.values()].map((pointer) => pointer.map);
    const first = points[0];
    const second = points[1];
    if (first === undefined || second === undefined) {
      pinchRef.current = null;
      return;
    }

    pinchRef.current = {
      camera: currentCameraRef.current,
      center: center(first, second),
      distance: distance(first, second),
    };
    dragRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const client = clientLocalPoint(event);
      const map = localPoint(event, mapClientPoint);
      pointersRef.current.set(event.pointerId, { client, map });

      if (pointersRef.current.size >= 2) {
        establishPinch();
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        start: map,
        startClient: client,
        startOffset: currentCameraRef.current.offset,
        moved: false,
      };
    },
    [establishPinch, mapClientPoint],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }
      const currentClient = clientLocalPoint(event);
      const current = localPoint(event, mapClientPoint);
      pointersRef.current.set(event.pointerId, { client: currentClient, map: current });

      const pinch = pinchRef.current;
      if (pinch !== null && pointersRef.current.size >= 2) {
        const points = [...pointersRef.current.values()].map((pointer) => pointer.map);
        const first = points[0];
        const second = points[1];
        if (first === undefined || second === undefined) {
          return;
        }
        const currentCenter = center(first, second);
        const nextScale = pinch.distance === 0 ? pinch.camera.scale : pinch.camera.scale * distance(first, second) / pinch.distance;
        const zoomed = zoomAtPoint(pinch.camera, pinch.center, nextScale);
        setCurrentCamera({
          offset: {
            x: zoomed.offset.x + currentCenter.x - pinch.center.x,
            y: zoomed.offset.y + currentCenter.y - pinch.center.y,
          },
          scale: zoomed.scale,
        });
        return;
      }

      const drag = dragRef.current;
      if (drag === null || drag.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = current.x - drag.start.x;
      const deltaY = current.y - drag.start.y;
      const clientDeltaX = currentClient.x - drag.startClient.x;
      const clientDeltaY = currentClient.y - drag.startClient.y;
      const moved = drag.moved || Math.hypot(clientDeltaX, clientDeltaY) >= dragThreshold;
      if (!moved) {
        return;
      }
      dragRef.current = { ...drag, moved: true };
      setCurrentCamera({
        ...currentCameraRef.current,
        offset: { x: drag.startOffset.x + deltaX, y: drag.startOffset.y + deltaY },
      });
    },
    [dragThreshold, mapClientPoint, setCurrentCamera],
  );

  const finishPointer = useCallback(
    (event: PointerEvent<HTMLElement>, releaseCapture: boolean) => {
      pointersRef.current.delete(event.pointerId);
      if (releaseCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (pointersRef.current.size >= 2) {
        establishPinch();
        return;
      }
      pinchRef.current = null;
      const remaining = [...pointersRef.current.entries()][0];
      if (remaining !== undefined) {
        dragRef.current = {
          pointerId: remaining[0],
          start: remaining[1].map,
          startClient: remaining[1].client,
          startOffset: currentCameraRef.current.offset,
          moved: false,
        };
      } else {
        dragRef.current = null;
      }
    },
    [establishPinch],
  );

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_RATE);
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewport = { width: bounds.width, height: bounds.height };
    const clientCenter = { x: bounds.width / 2, y: bounds.height / 2 };
    const zoomCenter = mapClientPoint?.(clientCenter, viewport) ?? clientCenter;
    const currentCamera = currentCameraRef.current;
    setCurrentCamera(zoomAtPoint(currentCamera, zoomCenter, currentCamera.scale * factor));
  }, [mapClientPoint, setCurrentCamera]);

  const zoomIn = useCallback(() => {
    const currentCamera = currentCameraRef.current;
    setCurrentCamera(zoomAtPoint(currentCamera, currentCamera.offset, clampZoom(currentCamera.scale * zoomStep)));
  }, [setCurrentCamera, zoomStep]);

  const zoomOut = useCallback(() => {
    const currentCamera = currentCameraRef.current;
    setCurrentCamera(zoomAtPoint(currentCamera, currentCamera.offset, clampZoom(currentCamera.scale / zoomStep)));
  }, [setCurrentCamera, zoomStep]);

  const reset = useCallback(() => setCurrentCamera(resetCamera(initialCameraRef.current)), [setCurrentCamera]);
  const rebaseOffset = useCallback((offset: Point) => {
    const nextCamera = { ...currentCameraRef.current, offset: { ...offset } };
    setCurrentCamera(nextCamera);
    const drag = dragRef.current;
    if (drag !== null) dragRef.current = { ...drag, startOffset: nextCamera.offset };
  }, [setCurrentCamera]);
  const toWorld = useCallback((screenPoint: Point) => screenToWorld(screenPoint, camera), [camera]);
  const onDragStart = useCallback((event: DragEvent<HTMLElement>) => event.preventDefault(), []);

  return {
    camera,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => finishPointer(event, true),
      onPointerCancel: (event) => finishPointer(event, true),
      onLostPointerCapture: (event) => finishPointer(event, false),
      onWheel,
      onDragStart,
    },
    zoomIn,
    zoomOut,
    reset,
    rebaseOffset,
    screenToWorld: toWorld,
  };
}
