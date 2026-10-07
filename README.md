# NAMI York-Adams Learning Studio

Public deployment source for the NAMI York-Adams Learning Studio.

The Star Wars background plays the user-supplied October 6, 2026 space-battle
recording as a muted, inline, looping video. Versioned H.264 files in
`public/resources/sw-video/` provide a 1156×512 desktop version and a 720×318
mobile version at 24 fps, plus a static poster. The original upload was
`ScreenRecording_10-06-2026 14-13-07_1.mp4` (110.23 seconds).
The clip's audio is absent; the existing music and curated SFX remain independent.

Video is loaded only when Star Wars motion is enabled, pauses when the page is
hidden or the theme changes, and shares the existing Pause motion control.
Reduced-motion mode displays the poster without downloading the video.
Playback failures restore the procedural battle. The canvas animation loop stops
while the video is active. Video uses HTTP caching rather than service-worker
storage. The previous procedural version is preserved in
`backup/starwars-procedural-v12`.

Background regression check: `npm run build && node tests/starwars-video-browser.mjs`.
It checks decoded frames, looping, motion controls, theme/navigation lifecycle,
mobile layouts, reduced motion, and missing-video fallback. `VIDEO_TEST_URL`
can point the same check at a deployed build.

Star Wars audio is extracted from the supplied archives during `npm run build`.
The browser loads `resources/sw-audio/sounds.json` and fetches individual clips as
needed; ZIP files are kept as build inputs and omitted from the published site.

`scripts/starwars-audio-catalog.json` preserves the user's organized pack: 91
clicks, 323 ambient quotes, 110 ambient effects, and 106 feedback clips split
between Right/Wrong Answer and Single/Whole Task. Only these 630 entries (617
unique recordings) are published. The build verifies every recording by hash.
Movie provenance is based on the user's curation, not an automated film guess.

Each pool uses a shuffled deck with no repeats until all recordings have played.
Ambient quotes wait 7–15 seconds after playback; nonverbal/battle effects wait
15–25 seconds independently and can overlap dialogue. The effects timeline also
includes the clicking folder's blasters. Graded feedback interrupts ambient
dialogue and plays sequentially. Workable/okay outcomes remain neutral. The
ambience slider controls volume, leaving the requested timing ranges unchanged.

Audio regression check: install Chromium with `npx playwright install chromium`,
then run `npm run test:audio`. It checks real audio decoding, playback controls,
load failures, mute races, theme changes, mobile layout, and bounded memory.
