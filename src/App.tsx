import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AtlasHeader } from './components/AtlasHeader';
import { Controls, type SimulationSpeed } from './components/Controls';
import { InfoPanel } from './components/InfoPanel';
import { SettingsMenu } from './components/SettingsMenu';
import { SpoilerPrompt } from './components/SpoilerPrompt';
import { SolarSystem, type SolarSystemHandle } from './components/SolarSystem';
import { MusicPlayer } from './components/MusicPlayer';
import { NAVIGATION_BODY_IDS, getBody, type BodyId } from './data/celestialBodies';
import './styles/ui.css';

const ORBITS_HIDDEN_STORAGE_KEY = 'outer-wilds-atlas.orbits-hidden';
const LABELS_HIDDEN_STORAGE_KEY = 'outer-wilds-atlas.labels-hidden';
const SPOILERS_ENABLED_STORAGE_KEY = 'outer-wilds-atlas.spoilers-enabled';
const MUSIC_AUTOPLAY_STORAGE_KEY = 'outer-wilds-atlas.music-autoplay';
const PANEL_ANIMATION_MILLISECONDS = 220;

function readStoredBoolean(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function hasStoredValue(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(key) !== null; } catch { return false; }
}

function writeStoredBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export default function App() {
  const [selectedId, setSelectedId] = useState<BodyId | null>(null);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const [paused, setPaused] = useState(false);
  const [quantumStatus, setQuantumStatus] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [orbitsHidden, setOrbitsHidden] = useState(() => readStoredBoolean(ORBITS_HIDDEN_STORAGE_KEY));
  const [labelsHidden, setLabelsHidden] = useState(() => readStoredBoolean(LABELS_HIDDEN_STORAGE_KEY));
  const [spoilersEnabled, setSpoilersEnabled] = useState(() => readStoredBoolean(SPOILERS_ENABLED_STORAGE_KEY));
  const [musicAutoplayEnabled, setMusicAutoplayEnabled] = useState(() => readStoredBoolean(MUSIC_AUTOPLAY_STORAGE_KEY));
  const [spoilerPromptOpen, setSpoilerPromptOpen] = useState(() => !hasStoredValue(SPOILERS_ENABLED_STORAGE_KEY));
  const [focusViewportOffsetX, setFocusViewportOffsetX] = useState(0);
  const [focusViewportOffsetY, setFocusViewportOffsetY] = useState(0);
  const [offscreenInsets, setOffscreenInsets] = useState({ right: 0, bottom: 0 });
  const solarSystemRef = useRef<SolarSystemHandle | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const infoPanelRef = useRef<HTMLElement | null>(null);
  const panelCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setInfoPanelElement = useCallback((element: HTMLElement | null) => {
    infoPanelRef.current = element;
  }, []);
  const showPanel = useCallback(() => {
    if (panelCloseTimerRef.current !== null) clearTimeout(panelCloseTimerRef.current);
    panelCloseTimerRef.current = null;
    setPanelClosing(false);
    setPanelOpen(true);
  }, []);
  const hidePanel = useCallback(() => {
    if (!panelOpen || panelClosing) return;
    setPanelClosing(true);
    panelCloseTimerRef.current = setTimeout(() => {
      setPanelOpen(false);
      setPanelClosing(false);
      panelCloseTimerRef.current = null;
    }, PANEL_ANIMATION_MILLISECONDS);
  }, [panelClosing, panelOpen]);
  useEffect(() => () => {
    if (panelCloseTimerRef.current !== null) clearTimeout(panelCloseTimerRef.current);
  }, []);
  const onSelect = useCallback((id: BodyId) => {
    setSelectedId(id);
    showPanel();
  }, [showPanel]);
  const selectedBody = selectedId === null ? undefined : getBody(selectedId);
  const navigationBodyIds = spoilersEnabled
    ? NAVIGATION_BODY_IDS
    : NAVIGATION_BODY_IDS.filter((id) => id !== 'quantum-moon' && id !== 'sun-station' && id !== 'white-hole-station' && id !== 'white-hole' && id !== 'orbital-probe-cannon');
  const simulationSpeed = paused ? 0 : speed;

  useEffect(() => writeStoredBoolean(ORBITS_HIDDEN_STORAGE_KEY, orbitsHidden), [orbitsHidden]);
  useEffect(() => writeStoredBoolean(LABELS_HIDDEN_STORAGE_KEY, labelsHidden), [labelsHidden]);
  useEffect(() => {
    if (!spoilerPromptOpen) writeStoredBoolean(SPOILERS_ENABLED_STORAGE_KEY, spoilersEnabled);
  }, [spoilerPromptOpen, spoilersEnabled]);
  useEffect(() => writeStoredBoolean(MUSIC_AUTOPLAY_STORAGE_KEY, musicAutoplayEnabled), [musicAutoplayEnabled]);
  useEffect(() => {
    if (!spoilersEnabled && (selectedId === 'quantum-moon' || selectedId === 'sun-station' || selectedId === 'white-hole-station' || selectedId === 'white-hole' || selectedId === 'orbital-probe-cannon')) {
      solarSystemRef.current?.unfocusBody();
      setSelectedId(null);
      setPanelOpen(false);
      setSettingsOpen(false);
    }
  }, [selectedId, spoilersEnabled]);
  const navigateBody = useCallback((direction: -1 | 1) => {
    if (selectedId === null) return;
    const currentIndex = (navigationBodyIds as readonly BodyId[]).indexOf(selectedId);
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + navigationBodyIds.length) % navigationBodyIds.length;
    const nextId = navigationBodyIds[nextIndex];
    if (nextId === undefined) return;
    setSelectedId(nextId);
    showPanel();
    solarSystemRef.current?.focusBody(nextId);
  }, [navigationBodyIds, selectedId, showPanel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (panelOpen) {
        hidePanel();
        return;
      }
      if (solarSystemRef.current?.unfocusBody() === true) return;
      if (selectedId !== null) setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hidePanel, panelOpen, selectedId, settingsOpen]);

  const selectedBodyHiddenBySpoilers = selectedId === 'quantum-moon'
    || selectedId === 'sun-station'
    || selectedId === 'white-hole-station'
    || selectedId === 'white-hole'
    || selectedId === 'orbital-probe-cannon';
  const panelVisible = panelOpen && selectedBody !== undefined && (spoilersEnabled || !selectedBodyHiddenBySpoilers);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = infoPanelRef.current;
    if (!panelVisible || stage === null || panel === null) {
      setFocusViewportOffsetX(0);
      setFocusViewportOffsetY(0);
      setOffscreenInsets((current) => current.right === 0 && current.bottom === 0 ? current : { right: 0, bottom: 0 });
      return;
    }
    const updateOffset = () => {
      const stageRect = stage.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      if (window.matchMedia('(max-width: 760px)').matches) {
        setFocusViewportOffsetX(0);
        const panelInset = Math.max(0, stageRect.bottom - panelRect.top);
        const offset = -panelInset / 2;
        setFocusViewportOffsetY((current) => Math.abs(current - offset) < 0.01 ? current : offset);
        setOffscreenInsets((current) => current.right === 0 && Math.abs(current.bottom - panelInset) < 0.01 ? current : { right: 0, bottom: panelInset });
        return;
      }
      setFocusViewportOffsetY(0);
      const panelInset = Math.max(0, stageRect.right - panelRect.left);
      const offset = -panelInset / 2;
      setFocusViewportOffsetX((current) => Math.abs(current - offset) < 0.01 ? current : offset);
      setOffscreenInsets((current) => current.bottom === 0 && Math.abs(current.right - panelInset) < 0.01 ? current : { right: panelInset, bottom: 0 });
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(stage);
    observer.observe(panel);
    window.addEventListener('resize', updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, [panelVisible]);

  return (
    <main
      className={`atlas-shell${panelOpen && selectedBody !== undefined ? ' atlas-shell--panel-open' : ''}`}
      aria-labelledby="atlas-title"
    >
      <AtlasHeader subtitle="A field guide to the local system" />
      <section ref={stageRef} className="atlas-stage" aria-label="Solar system atlas">
        <SolarSystem
          ref={solarSystemRef}
          selectedId={selectedId}
          onSelect={onSelect}
          speed={simulationSpeed}
          showOrbits={!orbitsHidden}
          showLabels={!labelsHidden}
          showQuantumMoon={spoilersEnabled}
          onQuantumStatusChange={setQuantumStatus}
          focusViewportOffsetX={focusViewportOffsetX}
          focusViewportOffsetY={focusViewportOffsetY}
          offscreenInsets={offscreenInsets}
        />
        {!panelVisible ? null : (
          <InfoPanel
            panelRef={setInfoPanelElement}
            body={selectedBody}
            closing={panelClosing}
            onClose={hidePanel}
            onSelectBody={onSelect}
            onFocusBody={(id) => solarSystemRef.current?.focusBody(id)}
            onNavigateBody={navigateBody}
            navigationBodyIds={navigationBodyIds}
          />
        )}
        <SettingsMenu
          open={settingsOpen}
          panelOpen={panelVisible}
          orbitsHidden={orbitsHidden}
          labelsHidden={labelsHidden}
          onToggleOpen={() => setSettingsOpen((current) => !current)}
          onRequestClose={() => setSettingsOpen(false)}
          onToggleOrbits={() => setOrbitsHidden((current) => !current)}
          onToggleLabels={() => setLabelsHidden((current) => !current)}
          spoilersEnabled={spoilersEnabled}
          onToggleSpoilers={() => setSpoilersEnabled((current) => !current)}
          musicAutoplayEnabled={musicAutoplayEnabled}
          onToggleMusicAutoplay={() => setMusicAutoplayEnabled((current) => !current)}
        />
        <Controls
          paused={paused}
          speed={speed}
          onZoomIn={() => solarSystemRef.current?.zoomIn()}
          onZoomOut={() => solarSystemRef.current?.zoomOut()}
          onResetView={() => solarSystemRef.current?.resetCamera()}
          onTogglePaused={() => setPaused((current) => !current)}
          onSpeedChange={setSpeed}
        />
        <MusicPlayer autoplayOnLoad={musicAutoplayEnabled} />
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {selectedBody === undefined
            ? 'No celestial body selected.'
            : `${selectedBody.name} details opened.`}
        </p>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {quantumStatus}
        </p>
      </section>
      {spoilerPromptOpen ? <SpoilerPrompt onChoose={(enabled) => { setSpoilersEnabled(enabled); setSpoilerPromptOpen(false); }} /> : null}
    </main>
  );
}
