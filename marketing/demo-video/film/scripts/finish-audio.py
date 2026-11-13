"""
Loudness finish: two-pass EBU R128 normalisation of the film's audio to -14 LUFS integrated,
true peak -1 dBTP (what YouTube plays at), picture stream copied unchanged.

    python3 -I scripts/finish-audio.py out/film-raw.mp4 out/ninth-life-hello-again.mp4
"""
import json
import re
import subprocess
import sys

TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.6, 11.0


def measure(path):
    p = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', path, '-af', f'loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True,
    )
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not m:
        raise SystemExit('finish-audio: could not measure loudness:\n' + p.stderr[-2000:])
    return json.loads(m.group(0))


def ebur128(path):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', p.stderr)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', p.stderr)
    return (float(i[-1]) if i else None, float(tp[-1]) if tp else None)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    m = measure(src)
    af = (
        f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
        f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000"
    )
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', dst], check=True)
    before = (m['input_i'], m['input_tp'])
    after = ebur128(dst)
    print(f'finish-audio: before I={before[0]} LUFS TP={before[1]} dBTP; after I={after[0]} LUFS TP={after[1]} dBTP -> {dst}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
