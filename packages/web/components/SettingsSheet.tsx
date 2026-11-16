'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '@/lib/layout';
import { SURFACE_PHONE_QUERY } from '@/lib/surface';
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
import { useDictationSupported } from '@/lib/dictation';
import { REPLY_TYPES_HELP, SENT_FOR_RANKING, RECENT_SENDS, RECENT_SETTING, providerCopy } from '@/lib/rankingProvider';
import { pickVoice } from '@/lib/speech';
import type { VoicesState } from '@/lib/useVoices';
import { Button } from './Button';
import { Confirm } from './Confirm';
import { Icon } from './Icon';
import { NOT_A_MEDICAL_DEVICE, WebsiteLink } from './Footer';
import { DICTATION_NOTICE } from './PartnerTurn';
import { Sheet } from './Sheet';

export const VOICE_PICKER_ID = 'voice-picker';
/** Settings > Typing > Finish words (web-ui Req 31.1). */
/** Settings > Partner strip (web-ui Req 33.1). */
export const PARTNER_STRIP_HELP =
  'A band at the top of the screen for the other person. It says "Typing…" while you type, then shows what you said after you speak or show it. It never shows your words before you speak.';
export const PARTNER_STRIP_TOO_SHORT = 'This screen is too short for the strip, so it is hidden here. Nothing else on the screen changes.';
export const FINISH_WORDS_HELP = 'Show up to 3 words that start with your keys. One press puts the whole word in. When off, you type every letter.';

type Access = Settings['access'];
const isScan = (a: Access) => a === 'scan1' || a === 'scan2';
const ACCESS_LABEL: Record<Access, string> = { keyboard: 'Keyboard', touch: 'Touch', scan1: 'One switch', scan2: 'Two switches' };

/**
 * Plan F11, web-ui Req 16.7: a switch user who picks Keyboard or Touch is asked first, because once
 * scanning is off they cannot turn it back on by switch. Cancel is the first cell, so a stray press
 * keeps scanning. The question replaces the sheet's settings until it is answered, so its row comes
 * straight after Close. The one confirm style (web-ui Req 39.3); it can be undone, so no red frame. Focus rests on
 * the question itself while scanning (Req 16.6).
 */
function ConfirmScanOff({ to, scanning, onCancel, onConfirm }: { to: Access; scanning?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Confirm
      name="scan-off"
      role="alertdialog"
      question="Turn off switch scanning?"
      detail="You will need a keyboard or touch to turn it back on."
      safe="Cancel"
      action={`Turn off, use ${ACCESS_LABEL[to]}`}
      scanning={scanning}
      scanRow="confirm-scan-off"
      onSafe={onCancel}
      onAction={onConfirm}
    />
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

/**
 * The voice: picker (with Previous and Next for a switch), Speed, Pitch and Test voice. One component with two homes:
 * Settings > Voice, and the Voice surface (the laptop header's Voice, Menu > Voice; web-ui Req 37.4).
 */
export function VoiceControls({
  settings,
  voices,
  onChange,
  onTestVoice,
}: {
  settings: Settings;
  voices: VoicesState;
  onChange: (s: Settings) => void;
  onTestVoice: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange(sanitizeSettings({ ...settings, [k]: v }));
  const current = pickVoice(voices.voices, settings.voiceURI);
  const voiceIndex = current ? voices.voices.findIndex((v) => v.voiceURI === current.voiceURI) : -1;
  const stepVoice = (d: 1 | -1) => {
    const n = voices.voices.length;
    if (n === 0) return;
    const next = voices.voices[(Math.max(0, voiceIndex) + d + n) % n];
    if (next) set('voiceURI', next.voiceURI);
  };
  return (
    <>
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
    </>
  );
}

/** Settings, in groups (web-ui Req 38.1). Voice to text shows only where the browser can do it. */
export type SettingsSection = 'voice' | 'look' | 'access' | 'typing' | 'replies' | 'partner' | 'model' | 'dictation' | 'about';
export const SETTINGS_SECTIONS: readonly { id: SettingsSection; title: string }[] = [
  { id: 'voice', title: 'Voice' },
  { id: 'look', title: 'Look' },
  { id: 'access', title: 'Ways to type' },
  { id: 'typing', title: 'Typing' },
  { id: 'replies', title: 'Quick replies' },
  { id: 'partner', title: 'Partner strip' },
  { id: 'model', title: 'Model ranking' },
  { id: 'dictation', title: 'Voice to text' },
  { id: 'about', title: 'About' },
];
const navId = (id: SettingsSection) => `settings-nav-${id}`;
const onOff = (on: boolean) => (on ? 'On' : 'Off');
const PARTNER_LABEL: Record<Settings['partnerStrip'], string> = { off: 'Off', facing: 'Facing them', upright: 'Upright' };
const THEME_LABEL: Record<Settings['theme'], string> = { night: 'Night', day: 'Day', system: 'Match device' };

/** The current value shown on a group's row (web-ui Req 38.1). */
export function sectionValue(id: SettingsSection, s: Settings, voices: VoicesState): string {
  switch (id) {
    case 'voice':
      return pickVoice(voices.voices, s.voiceURI)?.name ?? (voices.supported ? 'Default' : 'None');
    case 'look':
      return `${THEME_LABEL[s.theme]}, ${s.targetSize === 'xl' ? '128' : '96'} px keys`;
    case 'access':
      return ACCESS_LABEL[s.access];
    case 'typing':
      return `Finish words ${onOff(s.wordCompletion).toLowerCase()}`;
    case 'replies':
      return onOff(s.quickReplies);
    case 'partner':
      return PARTNER_LABEL[s.partnerStrip];
    case 'model':
      return onOff(s.llm);
    case 'dictation':
      return onOff(s.dictation);
    case 'about':
      return '';
  }
}

/** The section a larger screen opens on: the last one used in this visit (memory only), or Voice. */
let lastSection: SettingsSection = 'voice';
/** Back to Voice (tests start each case fresh). */
export function resetSettingsSection(): void {
  lastSection = 'voice';
}

/**
 * How Settings is laid out (web-ui Req 38): on phones a list of the groups, each with its current value, that drills
 * into one group in the same sheet with "All settings" as the second scan row; on larger screens a centred dialog with
 * the groups on the left (the chosen one marked) and its settings on the right. The scan-off question replaces the
 * group's settings, alone, so its row comes straight after Close (web-ui Req 16.7).
 */
function SettingsLayout({
  open,
  onClose,
  scanning,
  settings,
  voices,
  dictationOk,
  deepLink,
  confirming,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  scanning?: boolean;
  settings: Settings;
  voices: VoicesState;
  dictationOk: boolean;
  deepLink?: SettingsSection;
  confirming: ReactNode;
  sections: Record<SettingsSection, ReactNode>;
}) {
  const phone = useMediaQuery(SURFACE_PHONE_QUERY);
  const list = SETTINGS_SECTIONS.filter((s) => s.id !== 'dictation' || dictationOk);
  // Phones: null is the list. Larger screens: always a section.
  const [active, setActive] = useState<SettingsSection | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setActive(deepLink ?? (phone ? null : lastSection));
  }
  const current = active ?? (phone ? null : lastSection);
  const shown = current && list.some((s) => s.id === current) ? current : phone ? null : 'voice';
  const paneRef = useRef<HTMLDivElement>(null);
  const moved = useRef<'in' | SettingsSection | null>(null);

  const choose = (id: SettingsSection) => {
    lastSection = id;
    if (phone) moved.current = 'in';
    setActive(id);
  };
  const toList = () => {
    moved.current = shown;
    setActive(null);
  };
  // Phones: into a group, focus its first control; back to the list, focus the group's row. Never while scanning.
  useEffect(() => {
    const m = moved.current;
    moved.current = null;
    if (!m || scanning) return;
    if (m === 'in') paneRef.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select, a[href]')?.focus();
    else document.getElementById(navId(m))?.focus();
  }, [shown, scanning]);

  const nav = (
    <nav className="settings__nav" aria-label="Settings groups">
      <div className="settings__list scan-cluster" data-scan-row="sections">
        {list.map((s) => {
          const value = sectionValue(s.id, settings, voices);
          const on = !phone && s.id === shown;
          return (
            <Button
              key={s.id}
              id={navId(s.id)}
              variant="quiet"
              className={on ? 'menu-row settings__item is-current' : 'menu-row settings__item'}
              aria-current={on ? 'true' : undefined}
              onClick={() => choose(s.id)}
              data-autofocus={(phone ? s.id === list[0]!.id : on) ? '' : undefined}
            >
              <span className="menu-row__label">{s.title}</span>
              {value ? <span className="menu-row__value">{value}</span> : null}
              {phone ? <Icon name="next" className="menu-row__chevron" /> : null}
            </Button>
          );
        })}
      </div>
    </nav>
  );
  const pane = shown ? (
    <div className="settings__pane" ref={paneRef}>
      {confirming ?? sections[shown]}
    </div>
  ) : null;
  const drilled = phone && shown !== null;
  return (
    <Sheet
      open={open}
      name="settings"
      kind="dialog"
      title="Settings"
      onClose={onClose}
      scanning={scanning}
      initialFocusId={deepLink === 'voice' ? VOICE_PICKER_ID : undefined}
      back={drilled && !confirming ? { label: 'All settings', onBack: toList } : undefined}
    >
      <div className={phone ? 'settings settings--phone' : 'settings settings--panes'} data-section={shown ?? 'list'}>
        {confirming && !phone ? pane : phone ? (drilled ? pane : nav) : (
          <>
            {nav}
            {pane}
          </>
        )}
      </div>
    </Sheet>
  );
}

export function SettingsSheet({
  open,
  focusVoice,
  section,
  settings,
  voices,
  onChange,
  onTestVoice,
  onClose,
  scanning: scanningSheet,
  partnerTooShort = false,
}: {
  open: boolean;
  /** The strip is on but this screen is too short for it (web-ui Req 33.5). */
  partnerTooShort?: boolean;
  /** Switch scanning drives the sheet (web-ui Req 16). */
  scanning?: boolean;
  /** Open on Settings > Voice (kept for deep links; Voice is also its own surface, VoiceSheet). */
  focusVoice?: boolean;
  /** Open on this section (web-ui Req 38.4). */
  section?: SettingsSection;
  settings: Settings;
  voices: VoicesState;
  onChange: (s: Settings) => void;
  onTestVoice: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange(sanitizeSettings({ ...settings, [k]: v }));
  const llmHelpId = useId();
  const recentHelpId = useId();
  const dictationHelpId = useId();
  const repliesHelpId = useId();
  const wordsHelpId = useId();
  const dictationOk = useDictationSupported();
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

  const sections: Record<SettingsSection, ReactNode> = {
    voice: (
      <section className="group" aria-labelledby="set-voice">
        <h3 className="group__title" id="set-voice">
          Voice
        </h3>
        <VoiceControls settings={settings} voices={voices} onChange={onChange} onTestVoice={onTestVoice} />
      </section>
    ),
    look: (
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
    ),
    access: (
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
    ),
    typing: (
      <section className="group" aria-labelledby="set-typing">
        <h3 className="group__title" id="set-typing">
          Typing
        </h3>
        <div className="scan-cluster" data-scan-row="typing">
          <label className="toggle">
            <input type="checkbox" role="switch" checked={settings.wordCompletion} aria-describedby={wordsHelpId} onChange={(e) => set('wordCompletion', e.target.checked)} />
            <span className="toggle__text">Finish words</span>
            <span className="toggle__state" aria-hidden="true">
              {settings.wordCompletion ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        <p className="field__help" id={wordsHelpId}>
          {FINISH_WORDS_HELP}
        </p>
      </section>
    ),
    replies: (
      <section className="group" aria-labelledby="set-replies">
        <h3 className="group__title" id="set-replies">
          Quick replies
        </h3>
        <div className="scan-cluster" data-scan-row="quick-replies">
          <label className="toggle">
            <input type="checkbox" role="switch" checked={settings.quickReplies} aria-describedby={repliesHelpId} onChange={(e) => set('quickReplies', e.target.checked)} />
            <span className="toggle__text">Quick replies</span>
            <span className="toggle__state" aria-hidden="true">
              {settings.quickReplies ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        <p className="field__help" id={repliesHelpId}>
          Show your pinned phrases and Yes, No, Hold on and other replies when nothing is typed. Each one speaks when you press it. Pin up to 5 of your phrases in Phrases. When off, they are still in Menu, or in Phrases on a laptop.
        </p>
        <p className="field__help">After the other person speaks, you can also pick a reply type. {REPLY_TYPES_HELP}</p>
      </section>
    ),
    partner: (
      <section className="group" aria-labelledby="set-partner">
        <h3 className="group__title" id="set-partner">
          Partner strip
        </h3>
        <Seg
          legend="Partner strip"
          name="partner-strip"
          value={settings.partnerStrip}
          onChange={(v) => set('partnerStrip', v)}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'facing', label: 'Turned to face the person opposite' },
            { value: 'upright', label: 'Upright, for someone beside you' },
          ]}
          help={PARTNER_STRIP_HELP}
        />
        {partnerTooShort && settings.partnerStrip !== 'off' ? <p className="field__help">{PARTNER_STRIP_TOO_SHORT}</p> : null}
      </section>
    ),
    model: (
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
          Off by default. When on, {SENT_FOR_RANKING} are sent to {providerCopy().service}, which suggests the order of the sentences. {providerCopy().retention} Every word is still checked against your keys, and nothing is spoken until you press Speak. Offline, your dictionary is used.
        </p>
        {settings.llm ? (
          // Web-ui Req 27.11, ADR-007: a second, separate yes for sending what you said.
          <div className="field field--sub">
            <div className="scan-cluster" data-scan-row="llm-recent">
              <label className="toggle">
                <input type="checkbox" role="switch" checked={settings.llmRecent} aria-describedby={recentHelpId} onChange={(e) => set('llmRecent', e.target.checked)} />
                <span className="toggle__text">{RECENT_SETTING}</span>
                <span className="toggle__state" aria-hidden="true">
                  {settings.llmRecent ? 'On' : 'Off'}
                </span>
              </label>
            </div>
            <p className="field__help" id={recentHelpId}>
              Off by default. When on, {RECENT_SENDS} are sent too. The conversation itself is never saved.
            </p>
          </div>
        ) : null}
      </section>
    ),
    dictation: (
      <section className="group" aria-labelledby="set-dictation">
        <h3 className="group__title" id="set-dictation">
          Voice to text
        </h3>
        <div className="scan-cluster" data-scan-row="dictation">
          <label className="toggle">
            <input type="checkbox" role="switch" checked={settings.dictation} aria-describedby={dictationHelpId} onChange={(e) => set('dictation', e.target.checked)} />
            <span className="toggle__text">Listen in They said</span>
            <span className="toggle__state" aria-hidden="true">
              {settings.dictation ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        <p className="field__help" id={dictationHelpId}>
          {DICTATION_NOTICE} Off until you allow it.
        </p>
      </section>
    ),
    about: (
      <section className="group" aria-labelledby="set-about">
        <h3 className="group__title" id="set-about">
          About
        </h3>
        <p className="field__help">{NOT_A_MEDICAL_DEVICE}</p>
        <div className="field__row scan-cluster" data-scan-row="about">
          <WebsiteLink className="nl-btn nl-btn--secondary" href="/about">
            About Ninth Life
          </WebsiteLink>
          <WebsiteLink className="nl-btn nl-btn--secondary" href="/">
            How Ninth Life works
          </WebsiteLink>
        </div>
      </section>
    ),
  };
  return (
    <SettingsLayout
      open={open}
      onClose={onClose}
      scanning={scanningSheet}
      settings={settings}
      voices={voices}
      dictationOk={dictationOk}
      deepLink={section ?? (focusVoice ? 'voice' : undefined)}
      confirming={pendingAccess ? <ConfirmScanOff to={pendingAccess} scanning={scanningSheet} onCancel={() => answer(false)} onConfirm={() => answer(true)} /> : null}
      sections={sections}
    />
  );
}
