/**
 * design-system Candidate (nl-candidate): one full sentence for the keys, already proofed.
 * Selecting does not speak; Speak does. aria-pressed carries the selection.
 */
export function CandidateButton({
  rank,
  text,
  selected,
  lit,
  onSelect,
}: {
  rank: number;
  text: string;
  selected: boolean;
  lit?: boolean;
  onSelect: () => void;
}) {
  const cls = ['nl-candidate', selected ? 'is-selected' : '', lit ? 'is-lit' : ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={selected} onClick={onSelect} data-rank={rank}>
      <span className="nl-candidate__rank" aria-hidden="true">
        {rank}
      </span>
      <span className="nl-candidate__text">
        <span className="nl-sr-only">Sentence {rank}: </span>
        {text}
      </span>
    </button>
  );
}
