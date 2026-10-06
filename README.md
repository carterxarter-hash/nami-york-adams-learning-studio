# NAMI York-Adams Learning Studio

Public deployment source for the NAMI York-Adams Learning Studio.

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
