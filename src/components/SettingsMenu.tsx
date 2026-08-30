import { useEffect, useRef } from 'react';

type SettingsMenuProps = Readonly<{
  open: boolean;
  panelOpen: boolean;
  orbitsHidden: boolean;
  labelsHidden: boolean;
  spoilersEnabled: boolean;
  onToggleOpen: () => void;
  onRequestClose: () => void;
  onToggleOrbits: () => void;
  onToggleLabels: () => void;
  onToggleSpoilers: () => void;
}>;

export function SettingsMenu({
  open,
  panelOpen,
  orbitsHidden,
  labelsHidden,
  onToggleOpen,
  onRequestClose,
  onToggleOrbits,
  onToggleLabels,
  onToggleSpoilers,
  spoilersEnabled,
}: SettingsMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onRequestClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onRequestClose, open]);

  return (
    <div ref={rootRef} className="atlas-settings">
      <button
        className={`atlas-settings__trigger${panelOpen ? ' atlas-settings__trigger--panel-open' : ''}`}
        type="button"
        aria-label="Map settings"
        aria-expanded={open}
        title="Map settings"
        onClick={onToggleOpen}
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open ? (
        <div className={`atlas-settings__menu${panelOpen ? ' atlas-settings__menu--panel-open' : ''}`} role="group" aria-label="Map display settings">
          <button type="button" aria-pressed={orbitsHidden} onClick={onToggleOrbits}>
            <span aria-hidden="true">{orbitsHidden ? '○' : '●'}</span>
            <span>Hide orbit lines</span>
          </button>
          <button type="button" aria-pressed={labelsHidden} onClick={onToggleLabels}>
            <span aria-hidden="true">{labelsHidden ? '○' : '●'}</span>
            <span>Hide planet names</span>
          </button>
          <button type="button" aria-pressed={spoilersEnabled} onClick={onToggleSpoilers}>
            <span aria-hidden="true">{spoilersEnabled ? '●' : '○'}</span>
            <span>{spoilersEnabled ? 'Hide Quantum Moon' : 'Show Quantum Moon'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
