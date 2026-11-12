/**
 * The closing call to action (#start, content.md §11, design.md §11). Its "Open the app" is the only
 * ember fill in any viewport that shows it (MS-9.1). Never marked for a reveal: it holds the logo.
 */
export function Start() {
  return (
    <section id="start" className="site-band site-band--surface site-start" aria-labelledby="start-title">
      <div className="site-wrap site-start__inner">
        <img className="site-start__icon" src="/icons/icon.svg" alt="" width={96} height={96} />
        <h2 id="start-title" className="site-h2">
          Type your first sentence
        </h2>
        <p className="site-lead">Free, works offline, no account.</p>
        <a className="nl-btn nl-btn--primary nl-btn--xl" href="/app">
          Open the app
        </a>
      </div>
    </section>
  );
}
