# SoundQuest

An adaptive soundtrack studio for indie games. The current demo uses three locally separated stems from the supplied El Cargo recording: other instruments, bass, and drums. Each covers 0:25–0:45; vocals are excluded from the demo. No API key is required for playback.

## First release
- Three game states, per-state stem gain, next-beat/bar transitions, configurable crossfades.
- Playable keyboard/touch arena with proximity-based tension and attacks.
- Compatible audio uploads to R2; waveform and loop-length analysis in the browser.
- Owner-scoped D1 project storage with immutable saved versions.
- JSON export and a dependency-free browser SDK at `public/sdk.js`.

## Studio workspace
- Open and close Mixer, Game preview, Transitions, and Integration windows from the workspace toolbar.
- Detach, drag, resize, expand, or dock windows on desktop; use the stacked layout on mobile.
- Switch between persistent light and dark themes. Reset layout restores the default workspace.

## Development
Use Node 22.13+ and `npm ci`, then `npm run dev`. Local sign-in is available at `/signin-with-chatgpt?return_to=/`.
Generate schema migrations with `npm run db:generate`. Build with `npm run build`, then apply each local migration once using Wrangler's D1 command and the generated `dist/server/wrangler.json`, persisting to `.wrangler/state`.

Production uses Sites private access, authenticated user headers, D1 (`DB`) and R2 (`BUCKET`). Every stored-project and uploaded-asset endpoint checks authenticated ownership. Keep this access policy private unless you intentionally broaden sharing.

## Audio contract
Supply stems with the same musical start, tempo, and duration (within 50 ms); set the project BPM manually. Audio is not time-stretched or BPM-detected. Upload limit: 20 MB per file, 120 seconds per loop, 16 stems per project. The browser must support the supplied audio codec. The master chain includes a compressor. Avoid changing BPM during playback.

The SDK uses AudioContext time for playback, quantization, and gain ramps. All loop sources start at a shared epoch. Run `load(config)` before calling `start(config, state)` from a user gesture. Call `setState('combat')`, `stop()` and `dispose()` as needed.

Uploaded URLs on this private site require sign-in. Download and host audio alongside your game, and replace each URL in exported configuration. The current demo audio is bundled in public/demo/el-cargo. Its 120 BPM setting is a placeholder and the excerpt is not a seamless musical loop. The SDK also retains its original synthesizer for older demo configurations.

## Verification
TypeScript and production build passed. A local API integration check covered save, version increment, history, validation, audio upload/download, and anonymous rejection. Audio scheduling checks covered aligned start times, next-bar scheduling, fade duration and invalid states. Browser checks covered theme switching and persistence, opening and closing windows, expand/Escape restore, dragging, layout reset, and a 390px mobile layout without horizontal overflow. Sampled text and button contrast exceeded 4.5:1 in both themes. Audible output still requires listening verification. Publishing remains pending because the environment rejected input to the Sites publishing process.

## Next iteration
AI-assisted edits, asynchronous server audio analysis, collaborator roles, and external game-service authentication are not included in this first release. Projects and uploaded audio are stored remotely; device storage is not the source of truth.

