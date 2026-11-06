'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button';

export const PARTNER_MAX = 280;

/**
 * "They said": an optional line typed by the other person. It is only used as context for model
 * ranking when that is on, and is never stored.
 */
export function PartnerTurn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const id = useId();

  // Focus moves into the field when editing starts and back to Change or Add when it ends.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (wasEditing.current) changeRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const done = () => {
    onChange(draft.trim().slice(0, PARTNER_MAX));
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        className="partner order-partner"
        onSubmit={(e) => {
          e.preventDefault();
          done();
        }}
      >
        <div className="partner__body">
          <label className="partner__label" htmlFor={id}>
            They said
          </label>
        </div>
        <div className="partner__form">
          <input
            ref={inputRef}
            id={id}
            className="input"
            type="text"
            value={draft}
            maxLength={PARTNER_MAX}
            placeholder="Type what the other person said"
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(value);
                setEditing(false);
              }
            }}
          />
          <Button variant="secondary" type="submit">
            Done
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="partner order-partner">
      <div className="partner__body">
        <span className="partner__label">They said</span>
        <span className={value ? 'partner__text' : 'partner__text is-empty'}>{value || 'Nothing yet. Add what the other person said, if you like.'}</span>
      </div>
      <div className="partner__actions">
        <Button
          ref={changeRef}
          variant="secondary"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {value ? 'Change' : 'Add'}
        </Button>
        {value ? (
          <Button variant="secondary" onClick={() => onChange('')}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
