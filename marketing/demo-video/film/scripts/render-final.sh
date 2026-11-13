#!/usr/bin/env bash
# Final render and checks (05-production-guide.md, sections 9 and 10; second cut 07-revision-v2.md). Run from film/.
#   CONCURRENCY=8 bash scripts/render-final.sh
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsx scripts/build-data.ts
npx tsc -p tsconfig.json --noEmit
(cd ../../.. && node scripts/tm-lint.mjs)
npx tsx src/components/close/verify-kiro.ts
# Where the narrator sits: fails on overlaps, quiet zones or an unmeasured line.
npx tsx scripts/check-narration.ts
mkdir -p out
npx remotion render src/index.ts Film out/film-raw.mp4 \
  --codec h264 --crf 16 --pixel-format yuv420p --color-space bt709 \
  --image-format jpeg --jpeg-quality 95 --gl=angle --concurrency "${CONCURRENCY:-50%}"
python3 -I scripts/check-flashes.py out/film-raw.mp4 --json out/flash-report.json
python3 -I scripts/finish-audio.py out/film-raw.mp4 out/ninth-life-hello-again.mp4
npx tsx scripts/make-srt.ts
npx remotion still src/index.ts Thumbnail out/thumbnail.png --gl=angle
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact out/ninth-life-hello-again.mp4
