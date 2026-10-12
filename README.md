# NAMI York-Adams Learning Studio

Public deployment source for the NAMI York-Adams volunteer Learning Studio.

## Story Mode

Story Mode is the single support-group simulator. It now presents two practice types under one navigation item:

- **Branching meetings** — longer meetings where facilitator decisions affect the room over time and can reach different outcomes.
- **Focused branches** — the shorter scenario/debrief exercises that formerly appeared as a separate Simulation Room.

The former Simulation Room navigation item has been retired. Its routes remain usable internally so old bookmarks and scenario deep links do not break, but the learner sees one Story Mode experience.

## Release integrity

Production builds generate `build-meta.json` with the Git commit, build id and timestamp. The service-worker cache name is generated from that build id instead of a manually incremented version number. Netlify headers require revalidation for the application shell, service worker and build metadata while large media keeps normal long-lived HTTP caching.

CI now watches `src/**`, `public/**`, `scripts/**`, `tests/**`, PWA files and package/build configuration. Every release build runs a Story Mode/accessibility/background smoke test plus the existing Star Wars audio regression suite before its artifact is accepted.

## Star Wars media

The soundtrack has one event-driven 53-track browser implementation. The duplicate controller previously present in `src/main.ts` was removed, along with permanent MutationObserver/interval polling.

Background video is defined by `public/resources/sw-video/rotation-v1.json`. With two clips the player alternates between them. With three or more, it uses a shuffled bag so every clip plays before reshuffling and the same clip is not immediately repeated. Video stays muted and inline, respects reduced-motion behavior and remains outside service-worker Cache Storage.

To add another video when the instruction is **“add to background package rotation”**, optimize the clip for background playback, put it in `public/resources/sw-video/`, and add one manifest entry. Player logic does not need to change.

## Audio assets

The curated Star Wars SFX archives are canonical build inputs in this repository. `npm run build` extracts only the approved catalog to `dist/resources/sw-audio/`; source ZIPs and the embedded fallback archive are removed from production output. The former AppDeploy-to-GitHub synchronization workflow has been removed so there is one source of truth.

## Tests

- `npm test` — production build, unified Story Mode/release/accessibility/background smoke test, and Star Wars audio regression.
- `npm run test:smoke` — production build plus release smoke test.
- `npm run test:audio` — production build plus curated Star Wars audio regression.
- `npm run test:video` — production build plus release/background smoke test.
