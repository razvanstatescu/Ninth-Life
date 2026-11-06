'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  ACCEPT_DELAY,
  PITCH,
  RATE,
  SCAN_LOOPS,
  SCAN_MS,
  formatSeconds,
  sanitizeSettings,
  type Settings,
} from '@/lib/settings';
import { pickVoice } from '@/lib/speech';
import type { VoicesState } from '@/lib/useVoices';
import { Button } from './Button';
import { Sheet } from './Sheet';

export const VOICE_PICKER_ID = 'voice-picker';

type Access = Settings['access'];
const isScan = (a: Access) => a === 'scan1' || a === 'scan2';
const ACCESS_LABEL: Record<Access, string> = { keyboard: 'Keyboard', touch: 'Touch', scan1: 'One switch', scan2: 'Two switches' };

/**
 * Plan F11, web-ui Req 16.7: a switch user who picks Keyboard or Touch is asked first, because once
 * scanning is off they cannot turn it back on by switch. Cancel is the first cell, so a stray press
 * keeps scanning. The question replaces the sheet's settings until it is answered, so its row comes
 * straight after Close in the scan order.
 */
function ConfirmScanOff({ to, onCancel, onConfirm }: { to: Access; onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();
  const textId = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Focus the question itself, not a button: while scanning, a focus ring would be a second ember thing (Req 16.6).
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="group" role="alertdialog" aria-labelledby={titleId} aria-describedby={textId} tabIndex={-1} ref={ref} data-confirm="scan-off">
      <h3 className="group__title" id={titleId}>
        Turn off switch scanning?
      </h3>
      <p className="field__help" id={textId}>
        You will need a keyboard or touch to turn it back on.
      </p>
      <div className="field__row scan-cluster" data-scan-row="confirm-scan-off">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onConfirm}>
          {`Turn off, use ${ACCESS_LABEL[to]}`}
        </Button>
      </div>
    </div>
  );
}

function Seg<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  help,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  help?: ReactNode;
}) {
  return (
    <fieldset className="field">
      <legend className="field__label">{legend}</legend>
      {help ? <p className="field__help">{help}</p> : null}
      <div className="seg scan-cluster" data-scan-row={name}>
        {options.map((o) => (
          <label key={o.value} className="seg__opt">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  stepBy = step,
  display,
  down,
  up,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** How far one press of the buttons moves the value (defaults to step). */
  stepBy?: number;
  display: string;
  /** Words on the buttons that lower and raise the value ("Faster", "Slower"). */
  down: string;
  up: string;
  onChange: (v: number) => void;
  help?: string;
}) {
  const id = useId();
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return (
    <div className="field">
      <div className="field__head">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <output className="field__value" htmlFor={id}>
          {display}
        </output>
      </div>
      {help ? <p className="field__help">{help}</p> : null}
      {/* The buttons make the setting work with a switch or a single tap; the slider is for dragging. */}
      <div className="field__row scan-cluster" data-scan-row={label}>
        <Button variant="secondary" disabled={value <= min} onClick={() => onChange(round(Math.max(min, value - stepBy)))} aria-label={`${down}: ${label}, now ${display}`}>
          {down}
        </Button>
        <input
          id={id}
          className="range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={display}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <Button variant="secondary" disabled={value >= max} onClick={() => onChange(round(Math.min(max, value + stepBy)))} aria-label={`${up}: ${label}, now ${display}`}>
          {up}
        </Button>
      </div>
    </div>
  );
}

export function SettingsSheet({
  open,
  focusVoice,
  settings,
  voices,
  onChange,
  onTestVoice,
  onClose,
  scanning: scanningSheet,
}: {
  open: boolean;
  /** Switch scanning drives the sheet (web-ui Req 16). */
  scanning?: boolean;
  focusVoice?: boolean;
  settings: Settings;
  voices: VoicesState;
  onChange: (s: Settings) => void;
  onTestVoice: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange(sanitizeSettings({ ...settings, [k]: v }));
  const current = pickVoice(voices.voices, settings.voiceURI);
  const llmHelpId = useId();
  const voiceIndex = current ? voices.voices.findIndex((v) => v.voiceURI === current.voiceURI) : -1;
  const stepVoice = (d: 1 | -1) => {
    const n = voices.voices.length;
    if (n === 0) return;
    const next = voices.voices[(Math.max(0, voiceIndex) + d + n) % n];
    if (next) set('voiceURI', next.voiceURI);
  };
  const scanning = isScan(settings.access);
  // F11: the way to type that waits for "Turn off switch scanning?" to be answered.
  const [pendingAccess, setPendingAccess] = useState<Access | null>(null);
  useEffect(() => {
    if (!open) setPendingAccess(null);
  }, [open]);
  const chooseAccess = (v: Access) => {
    if (scanningSheet && isScan(settings.access) && !isScan(v)) setPendingAccess(v);
    else set('access', v);
  };
  const answer = (turnOff: boolean) => {
    const to = pendingAccess;
    // Put focus back on the sheet (not a control) before the question disappears.
    (document.querySelector('dialog[data-overlay="settings"] .sheet__inner') as HTMLElement | null)?.focus();
    setPendingAccess(null);
    if (turnOff && to) set('access', to);
  };

  if (pendingAccess) {
    return (
      <Sheet open={open} name="settings" title="Settings" onClose={onClose} scanning={scanningSheet}>
        <ConfirmScanOff to={pendingAccess} onCancel={() => answer(false)} onConfirm={() => answer(true)} />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} name="settings" title="Settings" onClose={onClose} initialFocusId={focusVoice ? VOICE_PICKER_ID : undefined} scanning={scanningSheet}>
      <section className="group" aria-labelledby="set-voice">
        <h3 className="group__title" id="set-voice">
          Voice
        </h3>
        {!voices.supported ? (
          <p className="field__help">This browser has no speech voices. Speak shows your sentence in big text instead.</p>
        ) : voices.loaded && voices.voices.length === 0 ? (
          <p className="field__help">No voices are installed yet. Speak shows your sentence in big text until a voice is added in your device settings.</p>
        ) : (
          <div className="field">
            <label className="field__label" htmlFor={VOICE_PICKER_ID}>
              Choose a voice
            </label>
            <p className="field__help">Voices marked &quot;on this device&quot; work offline and keep your words on the device. Online voices send the text to the browser maker.</p>
            <select
              id={VOICE_PICKER_ID}
              className="select"
              value={current?.voiceURI ?? ''}
              onChange={(e) => set('voiceURI', e.target.value || undefined)}
            >
              {!voices.loaded ? <option value="">Loading voices</option> : null}
              {voices.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}, {v.localService ? 'on this device' : 'online'})
                </option>
              ))}
            </select>
            {voices.voices.length > 1 ? (
              <div className="field__row scan-cluster" data-scan-row="voice">
                <Button variant="secondary" onClick={() => stepVoice(-1)} aria-label={`Previous voice, now ${current?.name ?? 'none'}`}>
                  Previous voice
                </Button>
                <Button variant="secondary" onClick={() => stepVoice(1)} aria-label={`Next voice, now ${current?.name ?? 'none'}`}>
                  Next voice
                </Button>
              </div>
            ) : null}
          </div>
        )}
        <Range label="Speed" value={settings.rate} min={RATE.min} max={RATE.max} step={RATE.step} display={`${settings.rate.toFixed(1)}x`} down="Slower" up="Faster" onChange={(v) => set('rate', v)} />
        <Range label="Pitch" value={settings.pitch} min={PITCH.min} max={PITCH.max} step={PITCH.step} display={settings.pitch.toFixed(1)} down="Lower" up="Higher" onChange={(v) => set('pitch', v)} />
        <div className="field__row scan-cluster" data-scan-row="test-voice">
          <Button variant="quiet" icon="speaker" onClick={onTestVoice}>
            Test voice
          </Button>
        </div>
      </section>

      <section className="group" aria-labelledby="set-look">
        <h3 className="group__title" id="set-look">
          Look
        </h3>
        <Seg
          legend="Theme"
          name="theme"
          value={settings.theme}
          onChange={(v) => set('theme', v)}
          options={[
            { value: 'night', label: 'Night' },
            { value: 'day', label: 'Day' },
            { value: 'system', label: 'Match device' },
          ]}
        />
        <Seg
          legend="Key size"
          name="keysize"
          value={settings.targetSize}
          onChange={(v) => set('targetSize', v)}
          options={[
            { value: 'l', label: 'Large, 96 px' },
            { value: 'xl', label: 'Extra large, 128 px' },
          ]}
          help="Keys shrink to fit narrow phones, never below 72 px."
        />
      </section>

      <section className="group" aria-labelledby="set-access">
        <h3 className="group__title" id="set-access">
          Ways to type
        </h3>
        <Seg
          legend="Access"
          name="access"
          value={settings.access}
          onChange={chooseAccess}
          options={[
            { value: 'keyboard', label: 'Keyboard' },
            { value: 'touch', label: 'Touch' },
            { value: 'scan1', label: 'One switch' },
            { value: 'scan2', label: 'Two switches' },
          ]}
          help={
            <>
              One switch scans on its own; press to choose. Two switches: Space moves, Enter chooses.
              {scanningSheet ? ' While this sheet is open, scanning keeps working the way it did when you opened it, so you can change your mind. The new way to type starts when you close it.' : null}
            </>
          }
        />
        <Range
          label="Scan speed"
          value={settings.scanMs}
          min={SCAN_MS.min}
          max={SCAN_MS.max}
          step={SCAN_MS.step}
          stepBy={200}
          display={`${formatSeconds(settings.scanMs)} a step`}
          down="Faster"
          up="Slower"
          onChange={(v) => set('scanMs', v)}
          help={scanning ? 'How long the highlight stays on each row or key. There is no time limit to finish a sentence.' : 'Used when switch scanning is on.'}
        />
        <Range
          label="Passes before scanning pauses"
          value={settings.scanLoops}
          min={SCAN_LOOPS.min}
          max={SCAN_LOOPS.max}
          step={1}
          display={`${settings.scanLoops} ${settings.scanLoops === 1 ? 'pass' : 'passes'}`}
          down="Fewer"
          up="More"
          onChange={(v) => set('scanLoops', v)}
        />
        <Range
          label="Accept delay"
          value={settings.acceptDelayMs}
          min={ACCEPT_DELAY.min}
          max={ACCEPT_DELAY.max}
          step={ACCEPT_DELAY.step}
          display={`${settings.acceptDelayMs} ms`}
          down="Shorter"
          up="Longer"
          onChange={(v) => set('acceptDelayMs', v)}
          help="A second press of the same key or switch within this time is ignored, so a tremor does not type twice."
        />
      </section>

      <section className="group" aria-labelledby="set-model">
        <h3 className="group__title" id="set-model">
          Model ranking
        </h3>
        <div className="scan-cluster" data-scan-row="llm">
        <label className="toggle">
          <input type="checkbox" role="switch" checked={settings.llm} aria-describedby={llmHelpId} onChange={(e) => set('llm', e.target.checked)} />
          <span className="toggle__text">Model ranking</span>
          <span className="toggle__state" aria-hidden="true">
            {settings.llm ? 'On' : 'Off'}
          </span>
        </label>
        </div>
        <p className="field__help" id={llmHelpId}>
          Off by default. When on, your keys and the last thing they said are sent to Anthropic&apos;s Claude API, which suggests the order of the sentences. Anthropic says it deletes them within 30 days unless it must keep them for policy or legal reasons. Every word is still checked against your keys, and nothing is spoken until you press Speak. Offline, your dictionary is used.
        </p>
      </section>
    </Sheet>
  );
}
