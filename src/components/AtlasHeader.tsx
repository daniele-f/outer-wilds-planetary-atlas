type AtlasHeaderProps = Readonly<{
  subtitle?: string;
}>;

/** Quiet atlas identity that stays legible without competing with the map. */
export function AtlasHeader({ subtitle }: AtlasHeaderProps) {
  return (
    <header className="atlas-header">
      <h1 id="atlas-title" aria-label="Outer Wilds Planetary Atlas">
        <span className="atlas-title__line">Outer Wilds</span>
        <span className="atlas-title__divider" aria-hidden="true">/</span>
        <span className="atlas-title__line atlas-title__line--atlas">Planetary Atlas</span>
      </h1>
      {subtitle === undefined ? null : <p className="atlas-subtitle">{subtitle}</p>}
    </header>
  );
}
