# NAMI York-Adams Learning Studio

Public deployment source for the NAMI York-Adams Learning Studio.

Star Wars audio is extracted from the supplied archives during `npm run build`.
The browser loads `resources/sw-audio/sounds.json` and fetches individual clips as
needed; ZIP files are kept as build inputs and omitted from the published site.

Audio regression check: install Chromium with `npx playwright install chromium`,
then run `npm run test:audio`. It checks real audio decoding, playback controls,
load failures, mute races, theme changes, mobile layout, and bounded memory.
