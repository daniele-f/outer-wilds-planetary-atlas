export type SimulationSpeed = 0.5 | 1 | 2;

type ControlsProps = Readonly<{
  paused: boolean;
  speed: SimulationSpeed;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onTogglePaused: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
}>;

const SPEEDS: readonly SimulationSpeed[] = [0.5, 1, 2];

function ToolButton({
  label,
  symbol,
  onClick,
  pressed,
}: Readonly<{
  label: string;
  symbol: string;
  onClick: () => void;
  pressed?: boolean;
}>) {
  return (
    <button
      className="atlas-control-button"
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

/** Camera and simulation commands; all durable camera state stays inside the map hook. */
export function Controls({
  paused,
  speed,
  onZoomIn,
  onZoomOut,
  onResetView,
  onTogglePaused,
  onSpeedChange,
}: ControlsProps) {
  return (
    <div className="atlas-controls" role="group" aria-label="Atlas controls">
      <div className="atlas-controls__group" role="group" aria-label="Map view controls">
        <ToolButton label="Zoom in" symbol="+" onClick={onZoomIn} />
        <ToolButton label="Zoom out" symbol="−" onClick={onZoomOut} />
        <ToolButton label="Reset view" symbol="⌂" onClick={onResetView} />
      </div>
      <div className="atlas-controls__group" role="group" aria-label="Simulation controls">
        <ToolButton
          label="Pause simulation toggle"
          symbol={paused ? '▶' : 'Ⅱ'}
          pressed={paused}
          onClick={onTogglePaused}
        />
        <div className="atlas-speed" role="group" aria-label="Simulation speed">
          {SPEEDS.map((option) => {
            const label = `Set simulation speed to ${option}x`;
            return (
              <button
                key={option}
                className="atlas-speed__button"
                type="button"
                aria-label={label}
                aria-pressed={speed === option}
                title={label}
                onClick={() => onSpeedChange(option)}
              >
                {option}×
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
