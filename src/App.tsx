import { useCallback, useEffect, useRef, useState } from 'react';
import { AtlasHeader } from './components/AtlasHeader';
import { Controls, type SimulationSpeed } from './components/Controls';
import { InfoPanel } from './components/InfoPanel';
import { SettingsMenu } from './components/SettingsMenu';
import { SolarSystem, type SolarSystemHandle } from './components/SolarSystem';
import { BODY_IDS, getBody, type BodyId } from './data/celestialBodies';
import './styles/ui.css';

export default function App() {
  const [selectedId, setSelectedId] = useState<BodyId | null>(null);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const [paused, setPaused] = useState(false);
  const [quantumStatus, setQuantumStatus] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [orbitsHidden, setOrbitsHidden] = useState(false);
  const [labelsHidden, setLabelsHidden] = useState(false);
  const solarSystemRef = useRef<SolarSystemHandle | null>(null);
  const onSelect = useCallback((id: BodyId) => {
    setSelectedId(id);
    setPanelOpen(true);
  }, []);
  const selectedBody = selectedId === null ? undefined : getBody(selectedId);
  const simulationSpeed = paused ? 0 : speed;
  const navigateBody = useCallback((direction: -1 | 1) => {
    if (selectedId === null) return;
    const currentIndex = BODY_IDS.indexOf(selectedId);
    const nextIndex = (currentIndex + direction + BODY_IDS.length) % BODY_IDS.length;
    const nextId = BODY_IDS[nextIndex];
    if (nextId === undefined) return;
    setSelectedId(nextId);
    setPanelOpen(true);
    solarSystemRef.current?.focusBody(nextId);
  }, [selectedId]);

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

  return (
    <main
      className={`atlas-shell${panelOpen && selectedBody !== undefined ? ' atlas-shell--panel-open' : ''}`}
      aria-labelledby="atlas-title"
    >
      <AtlasHeader subtitle="A field guide to the local system" />
      <section className="atlas-stage" aria-label="Solar system atlas">
        <SolarSystem
          ref={solarSystemRef}
          selectedId={selectedId}
          onSelect={onSelect}
          speed={simulationSpeed}
          showOrbits={!orbitsHidden}
          showLabels={!labelsHidden}
          onQuantumStatusChange={setQuantumStatus}
        />
        {!panelOpen || selectedBody === undefined ? null : (
          <InfoPanel
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
          onToggleOrbits={() => setOrbitsHidden((current) => !current)}
          onToggleLabels={() => setLabelsHidden((current) => !current)}
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
    </main>
  );
}
