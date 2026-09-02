import { useEffect, useRef, useState } from 'react';
import { BACKGROUND_PRESETS, backgroundPresetLabel, type BackgroundPreset } from './Starfield';

type SettingsMenuProps = Readonly<{
  open: boolean;
  panelOpen: boolean;
  orbitsHidden: boolean;
  labelsHidden: boolean;
  spoilersEnabled: boolean;
  musicAutoplayEnabled: boolean;
  imageArtworkEnabled: boolean;
  backgroundPreset: BackgroundPreset;
  onToggleOpen: () => void;
  onRequestClose: () => void;
  onToggleOrbits: () => void;
  onToggleLabels: () => void;
  onToggleSpoilers: () => void;
  onToggleMusicAutoplay: () => void;
  onToggleImageArtwork: () => void;
  onChangeBackground: (preset: BackgroundPreset) => void;
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
  musicAutoplayEnabled,
  onToggleMusicAutoplay,
  imageArtworkEnabled,
  onToggleImageArtwork,
  backgroundPreset,
  onChangeBackground,
  spoilersEnabled,
}: SettingsMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);

  useEffect(() => {
    if (!open) setBackgroundModalOpen(false);
  }, [open]);

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
          <button type="button" aria-pressed={labelsHidden} onClick={onToggleLabels}>
            <span aria-hidden="true">{labelsHidden ? '○' : '●'}</span>
            <span>{labelsHidden ? 'Show planet names' : 'Hide planet names'}</span>
          </button>
          <button type="button" aria-pressed={orbitsHidden} onClick={onToggleOrbits}>
            <span aria-hidden="true">{orbitsHidden ? '○' : '●'}</span>
            <span>{orbitsHidden ? 'Show orbit lines' : 'Hide orbit lines'}</span>
          </button>
          <button type="button" aria-pressed={musicAutoplayEnabled} onClick={onToggleMusicAutoplay}>
            <span aria-hidden="true">{musicAutoplayEnabled ? '●' : '○'}</span>
            <span>{musicAutoplayEnabled ? 'Disable autoplay music' : 'Enable autoplay music'}</span>
          </button>
          <button type="button" aria-pressed={imageArtworkEnabled} onClick={onToggleImageArtwork}>
            <span aria-hidden="true">{imageArtworkEnabled ? '●' : '○'}</span>
            <span>{imageArtworkEnabled ? 'Use default artwork' : 'Use alternative artwork'}</span>
          </button>
          <button type="button" onClick={() => setBackgroundModalOpen(true)}>
            <span aria-hidden="true">◌</span><span>Change background</span>
          </button>
          <button className="atlas-settings__spoiler-option" type="button" aria-pressed={spoilersEnabled} onClick={onToggleSpoilers}>
            <span aria-hidden="true">{spoilersEnabled ? '●' : '○'}</span>
            <span>{spoilersEnabled ? 'Hide spoilers' : 'Show spoilers'}</span>
          </button>
        </div>
      ) : null}
      {backgroundModalOpen ? <div className="background-modal-backdrop" onPointerDown={() => setBackgroundModalOpen(false)}>
        <div className="background-modal" role="dialog" aria-modal="true" aria-label="Choose background" onPointerDown={(event) => event.stopPropagation()}>
          <div className="background-modal__header"><h2>Choose background</h2><button type="button" aria-label="Close background chooser" onClick={() => setBackgroundModalOpen(false)}>×</button></div>
          <div className="background-modal__grid">
            {BACKGROUND_PRESETS.map((preset) => <button key={preset} className={`background-option background-option--${preset}${backgroundPreset === preset ? ' background-option--active' : ''}`} type="button" aria-pressed={backgroundPreset === preset} onClick={() => onChangeBackground(preset)}><svg viewBox="0 0 160 90" aria-hidden="true"><rect width="160" height="90" /><circle cx="28" cy="24" r="1.3" /><circle cx="116" cy="20" r="1" /><circle cx="84" cy="62" r="1.2" /><ellipse cx="46" cy="46" rx="42" ry="24" /><ellipse cx="124" cy="62" rx="32" ry="18" /></svg><span>{backgroundPresetLabel(preset)}</span></button>)}
          </div>
        </div>
      </div> : null}
    </div>
  );
}
