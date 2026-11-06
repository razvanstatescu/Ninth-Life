'use client';
import { useId, type ReactNode } from 'react';
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
      <div className="seg">
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
  display,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {help ? <p className="field__help">{help}</p> : null}
      <div className="field__row">
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
        <output className="field__value" htmlFor={id}>
          {display}
        </output>
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
}: {
  open: boolean;
  focusVoice?: boolean;
  settings: Settings;
  voices: VoicesState;
  onChange: (s: Settings) => void;
  onTestVoice: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange(sanitizeSettings({ ...settings, [k]: v }));
  const current = pickVoice(voices.voices, settings.voiceURI);
  const loopsId = useId();
  const llmHelpId = useId();
  const scanning = settings.access === 'scan1' || settings.access === 'scan2';

  return (
    <Sheet open={open} title="Settings" onClose={onClose} initialFocusId={focusVoice ? VOICE_PICKER_ID : undefined}>
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
          </div>
        )}
        <Range label="Speed" value={settings.rate} min={RATE.min} max={RATE.max} step={RATE.step} display={`${settings.rate.toFixed(1)}x`} onChange={(v) => set('rate', v)} />
        <Range label="Pitch" value={settings.pitch} min={PITCH.min} max={PITCH.max} step={PITCH.step} display={settings.pitch.toFixed(1)} onChange={(v) => set('pitch', v)} />
        <div className="field__row">
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
          onChange={(v) => set('access', v)}
          options={[
            { value: 'keyboard', label: 'Keyboard' },
            { value: 'touch', label: 'Touch' },
            { value: 'scan1', label: 'One switch' },
            { value: 'scan2', label: 'Two switches' },
          ]}
          help="One switch scans on its own; press to choose. Two switches: Space moves, Enter chooses."
        />
        <Range
          label="Scan speed"
          value={settings.scanMs}
          min={SCAN_MS.min}
          max={SCAN_MS.max}
          step={SCAN_MS.step}
          display={`${formatSeconds(settings.scanMs)} a step`}
          onChange={(v) => set('scanMs', v)}
          help={scanning ? 'How long the highlight stays on each row or key. There is no time limit to finish a sentence.' : 'Used when switch scanning is on.'}
        />
        <div className="field">
          <label className="field__label" htmlFor={loopsId}>
            Passes before scanning pauses
          </label>
          <div className="field__row">
            <input
              id={loopsId}
              className="input number"
              type="number"
              inputMode="numeric"
              min={SCAN_LOOPS.min}
              max={SCAN_LOOPS.max}
              value={settings.scanLoops}
              onChange={(e) => set('scanLoops', Number(e.target.value))}
            />
          </div>
        </div>
        <Range
          label="Accept delay"
          value={settings.acceptDelayMs}
          min={ACCEPT_DELAY.min}
          max={ACCEPT_DELAY.max}
          step={ACCEPT_DELAY.step}
          display={`${settings.acceptDelayMs} ms`}
          onChange={(v) => set('acceptDelayMs', v)}
          help="A second press of the same key or switch within this time is ignored, so a tremor does not type twice."
        />
      </section>

      <section className="group" aria-labelledby="set-model">
        <h3 className="group__title" id="set-model">
          Model ranking
        </h3>
        <label className="toggle">
          <input type="checkbox" role="switch" checked={settings.llm} aria-describedby={llmHelpId} onChange={(e) => set('llm', e.target.checked)} />
          <span className="toggle__text">Model ranking</span>
          <span className="toggle__state" aria-hidden="true">
            {settings.llm ? 'On' : 'Off'}
          </span>
        </label>
        <p className="field__help" id={llmHelpId}>
          Off by default. When on, your keys and the last thing they said are sent to Anthropic&apos;s Claude API, which suggests the order of the sentences. Anthropic says it deletes them within 30 days unless it must keep them for policy or legal reasons. Every word is still checked against your keys, and nothing is spoken until you press Speak. Offline, your dictionary is used.
        </p>
      </section>
    </Sheet>
  );
}
