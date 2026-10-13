# V1 HDR → 59.94 FPS local test (experimental)

This test harness is intentionally on the `test/v1-hdr-cfr-5994` branch only. It does **not** change the live website, V1's processing path, V2, or the ADJN worker.

## What it tests

- Re-encodes confirmed HDR10/PQ or HLG video to HEVC Main10 at constant (60000/1001) FPS (59.94).
- Keeps the source width and height; no 720p scaling.
- Uses FFmpeg's `fps` filter, which duplicates/drops frames; it does not perform motion interpolation.
- Probes the output and fails unless the reported frame rate, native dimensions, high bit depth, and HDR color signaling pass basic checks.
- Stops for Dolby Vision or HDR10+ dynamic metadata because this pipeline cannot promise that such dynamic metadata survives.

This is an experimental local test, not a guarantee of lossless re-encoding. Video is re-encoded and may have quality loss.

## Prerequisites

Install a local FFmpeg build that includes `libx265` Main10 support and `ffprobe`. Confirm support with:

```sh
ffmpeg -hide_banner -encoders
ffmpeg -hide_banner -h encoder=libx265
ffprobe -version
```

The script uses `FFMPEG_PATH` and `FFPROBE_PATH` environment variables if the binaries are not on PATH.

## Run on a sample file

From the repository root:

```sh
node scripts/hdr-cfr-test.js "/path/to/sample-hdr.mp4" "/path/to/sample-hdr-5994-test.mp4"
```

The output path must not already exist. Use a short sample first. Inspect the result visually and with a trusted HDR playback device before considering any production integration.

## Why this is separate from the web app

The current web app performs browser-side processing and the server only configures `ffprobe-static`; it does not provide a secure FFmpeg upload/transcode/download pipeline. This script validates the encoder locally without publishing or changing the site. Integrating it into the site is a separate step after testing the FFmpeg build and sample output.
