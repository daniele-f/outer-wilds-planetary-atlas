import { NAVIGATION_BODY_IDS, getBody, type BodyId, type CelestialBody } from '../data/celestialBodies';

type InfoPanelProps = Readonly<{
  body: CelestialBody;
  onClose: () => void;
  onSelectBody: (id: BodyId) => void;
  onFocusBody: (id: BodyId) => void;
  onNavigateBody: (direction: -1 | 1) => void;
  navigationBodyIds?: readonly BodyId[];
  spoilerNotes?: readonly string[];
  panelRef?: (element: HTMLElement | null) => void;
}>;

function FactList({ items }: Readonly<{ items: readonly string[] }>) {
  return (
    <ul className="info-panel__list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

/** Spoiler-conscious body details shown as a non-modal overlay beside the live map. */
export function InfoPanel({ body, onClose, onSelectBody, onFocusBody, onNavigateBody, spoilerNotes, panelRef, navigationBodyIds = NAVIGATION_BODY_IDS }: InfoPanelProps) {
  const headingId = `info-panel-${body.id}-title`;
  const satellites = body.satelliteIds.flatMap((id) => {
    const satellite = getBody(id);
    return satellite === undefined ? [] : [satellite];
  });
  const bodyIndex = navigationBodyIds.indexOf(body.id);
  const previousId = navigationBodyIds[(bodyIndex - 1 + navigationBodyIds.length) % navigationBodyIds.length];
  const nextId = navigationBodyIds[(bodyIndex + 1) % navigationBodyIds.length];
  const previousBody = previousId === undefined ? undefined : getBody(previousId);
  const nextBody = nextId === undefined ? undefined : getBody(nextId);

  return (
    <aside ref={panelRef} className="info-panel" aria-labelledby={headingId}>
      <div className="info-panel__topline">
        <p className="info-panel__eyebrow">Outer Wilds Travel Bureau</p>
        <button
          className="info-panel__close"
          type="button"
          aria-label={`Close ${body.name} details`}
          title={`Close ${body.name} details`}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <header className="info-panel__header">
        <h2 id={headingId}>{body.name}</h2>
        <p className="info-panel__classification">
          <span>{body.classification}</span>
          <span aria-hidden="true">·</span>
          <span>{body.type}</span>
        </p>
      </header>

      <div className="info-panel__scroll">
        <p className="info-panel__tagline">{body.tagline}</p>
        <p className="info-panel__description">{body.pitch}</p>

        <section className="info-panel__section" aria-labelledby={`${headingId}-features`}>
          <h3 id={`${headingId}-features`}>Worth the trip</h3>
          <FactList items={body.attractions} />
        </section>

        {satellites.length === 0 ? null : (
          <section className="info-panel__section" aria-labelledby={`${headingId}-satellites`}>
            <h3 id={`${headingId}-satellites`}>Nearby detour</h3>
            <ul className="info-panel__satellites">
              {satellites.map((satellite) => (
                <li key={satellite.id}>
                  <button
                    type="button"
                    aria-label={`Explore ${satellite.name}`}
                    onClick={() => onSelectBody(satellite.id)}
                  >
                    <span>{satellite.name}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="info-panel__section" aria-labelledby={`${headingId}-facts`}>
          <h3 id={`${headingId}-facts`}>Before you launch</h3>
          <FactList items={body.travelTips} />
        </section>

        {spoilerNotes === undefined || spoilerNotes.length === 0 ? null : (
          <details className="info-panel__spoilers">
            <summary>Spoiler notes</summary>
            <FactList items={spoilerNotes} />
          </details>
        )}
      </div>
      <div className="info-panel__actions" role="group" aria-label="Destination controls">
        <div className="info-panel__navigation">
          <button
            type="button"
            aria-label={`Previous destination: ${previousBody?.name ?? ''}`}
            title={`Previous: ${previousBody?.name ?? ''}`}
            onClick={() => onNavigateBody(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label={`Next destination: ${nextBody?.name ?? ''}`}
            title={`Next: ${nextBody?.name ?? ''}`}
            onClick={() => onNavigateBody(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <button
          className="info-panel__focus"
          type="button"
          aria-label={`Focus camera on ${body.name}`}
          onClick={() => onFocusBody(body.id)}
        >
          <span aria-hidden="true">◎</span>
          <span>Take me there</span>
        </button>
      </div>
    </aside>
  );
}
