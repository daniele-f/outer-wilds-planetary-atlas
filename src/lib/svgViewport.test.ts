import { describe, expect, it } from 'vitest';
import { zoomAtPoint, type Camera } from './camera';
import {
  ATLAS_VIEW_BOX,
  clientPointToSvg,
  clientPointToWorld,
  hitRadiusForMinimumPixels,
  labelFontSizeForMinimumPixels,
  svgViewportScale,
  worldPointToClient,
} from './svgViewport';

const precision = 8;

describe('SVG viewport coordinate composition', () => {
  it('keeps a client-space point fixed through camera zoom in a non-1:1 meet viewport', () => {
    const viewport = { width: 1_000, height: 500 };
    const clientPoint = { x: 313.953488372093, y: 174.418604651163 };
    const camera: Camera = { offset: { x: 0, y: 0 }, scale: 1 };
    const svgPoint = clientPointToSvg(clientPoint, viewport, ATLAS_VIEW_BOX);
    const worldPoint = clientPointToWorld(clientPoint, camera, viewport, ATLAS_VIEW_BOX);

    const zoomed = zoomAtPoint(camera, svgPoint, 2);
    const renderedClientPoint = worldPointToClient(worldPoint, zoomed, viewport, ATLAS_VIEW_BOX);

    expect(svgPoint.x).toBeCloseTo(-320, precision);
    expect(svgPoint.y).toBeCloseTo(-130, precision);
    expect(renderedClientPoint.x).toBeCloseTo(clientPoint.x, precision);
    expect(renderedClientPoint.y).toBeCloseTo(clientPoint.y, precision);
  });

  it('converts a client pan delta into the SVG units used by the rendered transform', () => {
    const viewport = { width: 1_000, height: 500 };
    const start = clientPointToSvg({ x: 300, y: 200 }, viewport, ATLAS_VIEW_BOX);
    const end = clientPointToSvg({ x: 400, y: 250 }, viewport, ATLAS_VIEW_BOX);

    expect(end.x - start.x).toBeCloseTo(172, precision);
    expect(end.y - start.y).toBeCloseTo(86, precision);
  });
});

describe('hitRadiusForMinimumPixels', () => {
  it('preserves a 22px minimum radius at narrow width and minimum camera zoom', () => {
    const viewport = { width: 390, height: 844 };
    const radius = hitRadiusForMinimumPixels({
      minimumPixels: 22,
      visualRadius: 8,
      visualPadding: 7,
      cameraScale: 0.45,
      viewport,
      viewBox: ATLAS_VIEW_BOX,
    });

    expect(radius * 0.45 * (390 / 1_440)).toBeCloseTo(22, precision);
    expect(radius).toBeGreaterThan(15);
  });

  it.each([
    {
      names: 'Timber Hearth and Attlerock',
      hostVisualRadius: 19,
      satelliteVisualRadius: 8,
    },
    {
      names: "Brittle Hollow and Hollow's Lantern",
      hostVisualRadius: 23,
      satelliteVisualRadius: 9,
      separation: 35,
    },
  ])('keeps $names at a 44px client diameter and relies on nearest-target arbitration', ({
    hostVisualRadius,
    satelliteVisualRadius,
    separation,
  }) => {
    const viewport = { width: 390, height: 844 };
    const hostRadius = hitRadiusForMinimumPixels({
      minimumPixels: 22,
      visualRadius: hostVisualRadius,
      visualPadding: 0,
      cameraScale: 0.45,
      viewport,
      viewBox: ATLAS_VIEW_BOX,
    });
    const satelliteRadius = hitRadiusForMinimumPixels({
      minimumPixels: 22,
      visualRadius: satelliteVisualRadius,
      visualPadding: 0,
      cameraScale: 0.45,
      viewport,
      viewBox: ATLAS_VIEW_BOX,
    });

    const clientScale = svgViewportScale(viewport, ATLAS_VIEW_BOX) * 0.45;
    expect(hostRadius * clientScale * 2).toBeGreaterThanOrEqual(44);
    expect(satelliteRadius * clientScale * 2).toBeGreaterThanOrEqual(44);
  });
});

describe('labelFontSizeForMinimumPixels', () => {
  it.each(['ordinary bodies', 'nested moons'])(
    'keeps %s readable at 390x844 and the minimum camera zoom',
    () => {
      const viewport = { width: 390, height: 844 };
      const fontSize = labelFontSizeForMinimumPixels({
        minimumPixels: 14,
        cameraScale: 0.45,
        viewport,
        viewBox: ATLAS_VIEW_BOX,
      });

      expect(fontSize * svgViewportScale(viewport, ATLAS_VIEW_BOX) * 0.45).toBeGreaterThanOrEqual(14);
    },
  );
});
