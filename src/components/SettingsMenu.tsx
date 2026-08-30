type SettingsMenuProps = Readonly<{
  open: boolean;
  panelOpen: boolean;
  orbitsHidden: boolean;
  labelsHidden: boolean;
  onToggleOpen: () => void;
  onToggleOrbits: () => void;
  onToggleLabels: () => void;
}>;

export function SettingsMenu({
  open,
  panelOpen,
  orbitsHidden,
  labelsHidden,
  onToggleOpen,
  onToggleOrbits,
  onToggleLabels,
}: SettingsMenuProps) {
  return (
    <div className="atlas-settings">
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
        </div>
      ) : null}
    </div>
  );
}
