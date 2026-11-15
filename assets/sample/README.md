# Sample asset pack

Blueprint feature 173: "Bundled sample asset pack: test video, known-BPM test song with verified
beat times, demo map/scene/show."

Present now (M0–M1):

- `grid-1080p.renderrequest.json` — a `mps.renderRequest` document for the headless harness:
  `MarshallProjectionStudio.exe --render-frame assets/sample/grid-1080p.renderrequest.json --out grid.png`
- `test-clip.mp4` — a short H.264 clip, 320x240, 24 frames at 12 fps (2 seconds). Each frame is a
  flat colour from a fixed four-colour cycle with a white marker block that walks left to right, so
  the frame on screen at any moment is identifiable at a glance and, more usefully, by a test.

  It is **generated, not authored**, which keeps the repository text and lets anyone remake it at a
  different size:

  ```
  MarshallProjectionStudio.exe --make-test-video assets/sample/test-clip.mp4
  ```

  That needs the Windows H.264 encoder. Every normal Windows 10/11 install has it; a Windows N
  edition needs the Media Feature Pack.

- `test-song-60s.mp3` — the known-BPM test song (feature 173's missing piece and the fixture
  the TestAI plan in `docs/TestAI-Plan.md` loads): 60.000 s, 44.1 kHz stereo, 128 kbps CBR,
  **120 BPM**, intro (hats only) → verse → chorus (energy jump at 24 s) → breakdown (40–48 s,
  no drums) → final chorus fading out from 56 s. Synthesized, not recorded, so it is free to
  ship and byte-identical on every regeneration:

  ```
  pip install numpy lameenc
  python assets/sample/make-test-song.py
  ```

  Beside it, from the same run: `test-song-60s.truth.json` (every beat time, the downbeats and
  the section boundaries — the ground truth a beat-detection or Generate Show check compares
  against) and `test-song-60s.srt` (eight timed lyric lines for the Load Lyrics… path).

Still to come, with the milestone that needs them:

- **M2** — demo map traced over a reference photo.
- **M4** — demo scene and show built on the demo map.
