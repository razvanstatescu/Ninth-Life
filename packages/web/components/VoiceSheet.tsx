'use client';
import type { Settings } from '@/lib/settings';
import type { VoicesState } from '@/lib/useVoices';
import { VOICE_PICKER_ID, VoiceControls } from './SettingsSheet';
import { Sheet } from './Sheet';

/**
 * Voice (web-ui Req 37.4): the voice picker, Speed, Pitch and Test voice, the same controls as Settings > Voice. A short
 * sheet on phones (Menu > Voice), a popover under the laptop header's Voice button. Opens with focus on the picker.
 */
export function VoiceSheet({
  open,
  scanning,
  settings,
  voices,
  onChange,
  onTestVoice,
  onClose,
}: {
  open: boolean;
  scanning?: boolean;
  settings: Settings;
  voices: VoicesState;
  onChange: (s: Settings) => void;
  onTestVoice: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} name="voice" kind="fit" title="Voice" onClose={onClose} scanning={scanning} initialFocusId={VOICE_PICKER_ID}>
      <div className="group">
        <VoiceControls settings={settings} voices={voices} onChange={onChange} onTestVoice={onTestVoice} />
      </div>
    </Sheet>
  );
}
