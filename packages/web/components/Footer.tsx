export const NOT_A_MEDICAL_DEVICE =
  'Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.';

export function Footer({ about = true }: { about?: boolean }) {
  return (
    <footer className="app-footer">
      <p>{NOT_A_MEDICAL_DEVICE}</p>
      <nav aria-label="Footer">
        {about ? <a href="/about">About Ninth Life</a> : <a href="/">Back to the keypad</a>}
      </nav>
    </footer>
  );
}
