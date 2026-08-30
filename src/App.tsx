import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AtlasHeader } from './components/AtlasHeader';
import { Controls, type SimulationSpeed } from './components/Controls';
import { InfoPanel } from './components/InfoPanel';
import { SettingsMenu } from './components/SettingsMenu';
import { SpoilerPrompt } from './components/SpoilerPrompt';
import { SolarSystem, type SolarSystemHandle } from './components/SolarSystem';
import { NAVIGATION_BODY_IDS, getBody, type BodyId } from './data/celestialBodies';
import './styles/ui.css';

const ORBITS_HIDDEN_STORAGE_KEY = 'outer-wilds-atlas.orbits-hidden';
const LABELS_HIDDEN_STORAGE_KEY = 'outer-wilds-atlas.labels-hidden';
const SPOILERS_ENABLED_STORAGE_KEY = 'outer-wilds-atlas.spoilers-enabled';

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
  const [orbitsHidden, setOrbitsHidden] = useState(() => readStoredBoolean(ORBITS_HIDDEN_STORAGE_KEY));
  const [labelsHidden, setLabelsHidden] = useState(() => readStoredBoolean(LABELS_HIDDEN_STORAGE_KEY));
  const [spoilersEnabled, setSpoilersEnabled] = useState(() => readStoredBoolean(SPOILERS_ENABLED_STORAGE_KEY));
  const [spoilerPromptOpen, setSpoilerPromptOpen] = useState(() => !hasStoredValue(SPOILERS_ENABLED_STORAGE_KEY));
  const [focusViewportOffsetX, setFocusViewportOffsetX] = useState(0);
  const [focusViewportOffsetY, setFocusViewportOffsetY] = useState(0);
  const solarSystemRef = useRef<SolarSystemHandle | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const infoPanelRef = useRef<HTMLElement | null>(null);
  const setInfoPanelElement = useCallback((element: HTMLElement | null) => {
    infoPanelRef.current = element;
  }, []);
  const onSelect = useCallback((id: BodyId) => {
    setSelectedId(id);
    setPanelOpen(true);
  }, []);
  const selectedBody = selectedId === null ? undefined : getBody(selectedId);
  const navigationBodyIds = spoilersEnabled
    ? NAVIGATION_BODY_IDS
    : NAVIGATION_BODY_IDS.filter((id) => id !== 'quantum-moon' && id !== 'sun-station');
  const simulationSpeed = paused ? 0 : speed;

  useEffect(() => writeStoredBoolean(ORBITS_HIDDEN_STORAGE_KEY, orbitsHidden), [orbitsHidden]);
  useEffect(() => writeStoredBoolean(LABELS_HIDDEN_STORAGE_KEY, labelsHidden), [labelsHidden]);
  useEffect(() => {
    if (!spoilerPromptOpen) writeStoredBoolean(SPOILERS_ENABLED_STORAGE_KEY, spoilersEnabled);
  }, [spoilerPromptOpen, spoilersEnabled]);
  useEffect(() => {
    if (!spoilersEnabled && (selectedId === 'quantum-moon' || selectedId === 'sun-station')) {
      solarSystemRef.current?.unfocusBody();
      setSelectedId(null);
      setPanelOpen(false);
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
    setPanelOpen(true);
    solarSystemRef.current?.focusBody(nextId);
  }, [navigationBodyIds, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (panelOpen) {
        setPanelOpen(false);
        return;
      }
      if (solarSystemRef.current?.unfocusBody() === true) return;
      if (selectedId !== null) setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panelOpen, selectedId, settingsOpen]);

  const panelVisible = panelOpen && selectedBody !== undefined;
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = infoPanelRef.current;
    if (!panelVisible || stage === null || panel === null) {
      setFocusViewportOffsetX(0);
      setFocusViewportOffsetY(0);
      return;
    }
    const updateOffset = () => {
      if (window.matchMedia('(max-width: 760px)').matches) {
        setFocusViewportOffsetX(0);
        const panelHeight = panel.getBoundingClientRect().height;
        const panelBottom = Number.parseFloat(window.getComputedStyle(panel).bottom);
        const offset = -(panelHeight + (Number.isFinite(panelBottom) ? panelBottom : 0)) / 2;
        setFocusViewportOffsetY((current) => Math.abs(current - offset) < 0.01 ? current : offset);
        return;
      }
      setFocusViewportOffsetY(0);
      const panelWidth = panel.getBoundingClientRect().width;
      const panelRight = Number.parseFloat(window.getComputedStyle(panel).right);
      const offset = -(panelWidth + (Number.isFinite(panelRight) ? panelRight : 0)) / 2;
      setFocusViewportOffsetX((current) => Math.abs(current - offset) < 0.01 ? current : offset);
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
        />
        {!panelOpen || selectedBody === undefined ? null : (
          <InfoPanel
            panelRef={setInfoPanelElement}
            body={selectedBody}
            onClose={() => setPanelOpen(false)}
            onSelectBody={onSelect}
            onFocusBody={(id) => solarSystemRef.current?.focusBody(id)}
            onNavigateBody={navigateBody}
          />
        )}
        <SettingsMenu
          open={settingsOpen}
          panelOpen={panelOpen && selectedBody !== undefined}
          orbitsHidden={orbitsHidden}
          labelsHidden={labelsHidden}
          onToggleOpen={() => setSettingsOpen((current) => !current)}
          onRequestClose={() => setSettingsOpen(false)}
          onToggleOrbits={() => setOrbitsHidden((current) => !current)}
          onToggleLabels={() => setLabelsHidden((current) => !current)}
          spoilersEnabled={spoilersEnabled}
          onToggleSpoilers={() => setSpoilersEnabled((current) => !current)}
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
