type SpoilerPromptProps = Readonly<{ onChoose: (enabled: boolean) => void }>;

export function SpoilerPrompt({ onChoose }: SpoilerPromptProps) {
  return (
    <div className="spoiler-backdrop">
      <section className="spoiler-prompt" role="dialog" aria-modal="true" aria-labelledby="spoiler-title">
        <p className="spoiler-prompt__eyebrow">Explorer’s notice</p>
        <h2 id="spoiler-title">Show Spoilers?</h2>
        <p className="spoiler-prompt__warning">Remember: You cannot unsee spoilers.</p>
        <div className="spoiler-prompt__actions">
          <button type="button" className="spoiler-prompt__reveal" onClick={() => onChoose(false)}>Keep spoilers hidden</button>
          <button type="button" onClick={() => onChoose(true)}>Show spoilers</button>
        </div>
        <p className="spoiler-prompt__hint">You can change this later in the <span className="spoiler-prompt__gear">⚙</span> <strong>settings menu</strong>.</p>
      </section>
    </div>
  );
}
