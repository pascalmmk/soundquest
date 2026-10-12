# SoundQuest

A browser-based studio for creating game-state music mixes and hearing how they change during play.

Load synchronized audio stems, adjust their levels for exploration, danger, and combat, and choose when transitions happen. Projects and version history are saved to Cloudflare D1; uploaded audio is stored in Cloudflare R2. Export the settings and browser SDK to connect the soundtrack to your game.

## Run

### Prerequisites

- Node.js **22.13.0 or later**, as required by `package.json`.
- npm and Git.
- A modern browser with Web Audio, Canvas, and support for the codecs you upload.

### Install and initialize local storage

```sh
git clone https://github.com/pascalmmk/soundquest.git
cd soundquest
npm ci
npm run build
```

The build produces `dist/server/wrangler.json`, which is also used by `npm start`. Initialize a **fresh local** D1 database with the checked-in migration:

```sh
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_modern_skrulls.sql
```

Apply this file once per local database. It contains `CREATE TABLE` statements without `IF NOT EXISTS`, so repeatedly executing it against an initialized database will fail. Keep `.wrangler/state` consistent between database commands and the application. Future schema changes require their own migrations; `db:generate` generates SQL but does not apply it.

Start development:

```sh
npm run dev
```

The portable development script requests port **5173**. Open the address printed by the server, normally `http://localhost:5173`.

To enable saving and uploads, visit `/signin-with-chatgpt?return_to=/` on that same local origin. Portable development supplies a mock identity through a local-only cookie; this is not a real ChatGPT OAuth login. `/signout-with-chatgpt?return_to=/` clears that cookie. Use `localhost` or another supported loopback host, not a LAN address: the mock-auth middleware checks both the host and the connecting address.

Bundled demo playback does not require an API key or a storage login. Uploads and saved projects require authentication plus working D1 and R2 bindings.

### Preview a production build locally

```sh
npm run build
npm start
```

`npm start` runs Wrangler locally against the generated worker configuration, binds to `127.0.0.1`, and persists state under `.wrangler/state`. It does not deploy the application. The Vite development sign-in middleware is not installed by this command; use `npm run dev` for the built-in mock-login workflow.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies. |
| `npm run install:ci` | Repository installer wrapper, with execution-profile-specific behavior and install checks. |
| `npm run dev` | Start development through the framework wrapper. |
| `npm run build` | Build through the framework wrapper. |
| `npm start` | Serve the built worker locally with Wrangler. |
| `npm run lint` | Run ESLint, excluding generated `dist` and `.next` output. |
| `npm run db:generate` | Generate SQLite migrations from `db/schema.ts` into `drizzle/`. |

## Workflow

1. Press **Play** to hear the bundled three-stem session, or open **Projects → New empty project** and import your own audio.
2. Select **Exploration**, **Danger**, or **Combat** and adjust each stem's gain.
3. Open **Transitions** and choose a beat boundary and fade duration.
4. Switch states during playback, or click **Enter the arena** and approach enemies to trigger changes automatically.
5. Sign in and click **Save project** to store the mix and create a version.
6. Click **Export**, download the SDK and audio from the integration guide, and update the exported audio URLs for your game's host.

Playback and waveform analysis happen in the browser. Saving and uploading use the server. Unsaved project changes are not stored locally and can be lost when the page reloads.

## Controls and features

### 1. Audition the bundled session

The initial project contains **Other instruments**, **Bass**, and **Drums** from the bundled El Cargo 0:25–0:45 excerpts. Each is 20 seconds long; vocals are excluded from this initial session. Press Play to decode the files and start all three loops together.

The demo's **120 BPM is a placeholder**, and its excerpt boundary is **not a seamless musical loop**. Playback does not detect tempo, separate stems, or repair loop boundaries. Other audio files in `public/demo/el-cargo` support older configurations; they are not all part of the initial session.

### 2. Set each game state's mix

Choose `exploration`, `danger`, or `combat` through the state tabs or sidebar. Every stem stores an independent 0–100 gain for each state. The horizontal arrangement slider and vertical channel fader edit the same value.

- The numbered channel button mutes the selected state's gain to zero; enabling it sets the gain to **65**, rather than restoring its previous value.
- Master volume controls overall output and starts at 65%. It is session state, not part of a saved/exported project.
- The sidebar search filters the current project's stem names, case-insensitively. It does not search an external sound library.
- Removing a stem stops playback and removes it from the draft. It does not delete its stored audio object.
- The displayed channel meters represent configured gain; they are not measured audio peak/RMS meters.

The transport shows a four-beat bar/beat counter and waveform playhead. Stop ends the current sources; Play starts again from the beginning. Reset transport also selects exploration. BPM is clamped to 40–240 in the UI and cannot be edited while playback is active.

### 3. Configure transitions

Open the **Transitions** window to select:

| Setting | Choices |
| --- | --- |
| Transition boundary | Next beat (`1`), next four-beat bar (`4`), or every two bars (`8`). |
| Fade duration | Instant (`0`), `1`, `2`, or `4` beats. |

State changes schedule gain ramps at the next selected boundary. All stems continue looping throughout; a state change adjusts their gains rather than switching audio files. The selected state may appear in the editor before the transport reports it as the applied state.

### 4. Import your own audio

Use **Projects → New empty project** for a different loop length, or add compatible stems to the current session through the file picker or drop zone.

The upload flow stops playback, decodes each file in the browser, checks its duration, sends it to `/api/assets`, caches the decoded buffer, and adds a waveform and default gains of 65 for all three states. Files are processed sequentially; if a later file fails, earlier successful uploads remain in the draft.

Audio requirements:

- At most **16 stems** per project.
- At most **20 MiB** (`20 × 1024 × 1024` bytes) per file; UI messages call this 20 MB.
- At most **120 seconds** per loop.
- Stem durations must match the first stem within **50 milliseconds**.
- The server accepts filename extensions `.wav`, `.mp3`, `.ogg`, `.m4a`, `.aac`, `.flac`, and `.webm`; actual decoding depends on browser codec support.
- Stems must already share the musical start point and tempo. The application does not time-stretch, detect BPM, or automatically align their contents.

Duration and waveform analysis happen in the browser. The upload endpoint checks size and extension but does not perform server-side audio decoding or transcoding.

### 5. Play the arena

Choose **Enter the arena** to start soundtrack playback if needed and enable the canvas game. Move with **WASD** or the **arrow keys**; **Space** attacks. On-screen pointer controls provide movement and attack buttons.

The nearest enemy determines the requested music state in canvas coordinates:

| Nearest enemy distance | State |
| --- | --- |
| Less than 68 | `combat` |
| 68 to less than 150 | `danger` |
| 150 or farther, or no enemies | `exploration` |

Enemies approach when within 145 units and remain outside a 32-unit distance. Attacks remove enemies within 70 units, with a 400 ms interval between attacks. Clearing all enemies reveals a reset button. Arena artwork includes obstacles, but obstacle collision, health, scoring, and damage systems are not implemented.

Pausing the arena leaves audio playing. Selecting a state manually disables automatic arena control; stopping the transport stops both playback and the arena.

### 6. Save, open, and restore

**Save project** sends the current configuration to the server. A new project receives a UUID; each save updates its current configuration and inserts a numbered version. **Projects** lists the signed-in owner's saved projects. **Version history** lists a saved project's versions newest first.

Opening a saved project stops playback and selects exploration. Loading a historical version creates an unsaved draft; saving that draft creates a new version instead of rewriting the historical snapshot.

Project data is not automatically saved to browser storage. Unsaved changes live in React state and can be lost on reload or navigation; there is no autosave or unsaved-navigation confirmation. Theme preference is the browser-persisted exception.

### 7. Arrange the workspace

The toolbar opens/closes **Mixer**, **Game preview**, **Transitions**, and **Integration** windows. Desktop windows can detach, move by their title bar, resize, expand, and dock. Escape restores an expanded window. The layout adapts to a stacked arrangement on smaller screens.

Reset layout opens Mixer and Game preview, closes Transitions and Integration, and resets floating/expanded sizing. Window layout is not persisted across reloads. Light/dark theme is stored under `soundquest-theme` in `localStorage`, with system preference as the fallback.

### 8. Export and host with your game

Export downloads a JSON file containing the project configuration plus `schemaVersion: 1`. Waveform arrays are omitted. The Integration guide provides downloads for `sdk.js` and the referenced audio files.

The export is not an audio render or an asset archive. Download and host the audio alongside your game, then replace each `url` in the JSON with a reachable game asset path. Uploaded `/api/assets/...` URLs require the owner's authenticated session on this application. Demo URLs are also application-relative and must be copied or changed for another host. Cross-origin audio hosting must permit browser fetches.

## Development

After installing dependencies, the available checks are:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

The repository has no `test` package script or checked-in automated test suite. This README does not assert that the commands above currently pass. Earlier narrative verification claims are not a substitute for rerunning checks in your environment.

A practical manual check covers demo playback, delayed state transitions, independent state gains, matching/mismatched uploads, authenticated save/reload/history, anonymous API rejection, JSON/SDK integration, themes, and desktop/mobile window behavior. Listen to the audio to assess alignment and loop boundaries; visual inspection cannot establish audio quality.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| “Sign in to save projects or upload stems.” | Visit the local sign-in path under `npm run dev`, or verify the production trusted-auth layer. |
| Local mock sign-in returns 403 | Use a loopback host/address and same-origin navigation; mock auth is deliberately local-only. |
| Storage unavailable / generic save failure | Confirm both bindings, migration application, and the local persistence directory; inspect server logs for the underlying error. |
| `no such table` in server logs | Apply the checked-in migration to the database actually used by the server. |
| Tables already exist while initializing | The raw migration was already applied; do not rerun it against the same initialized database. |
| Upload duration mismatch | Use matching stems or create an empty project before importing a different loop length. |
| Decode failure | The browser may not support the file's codec, even when the filename extension is accepted. |
| Exported soundtrack cannot fetch audio | Copy audio to the game's host and replace application-relative/authenticated URLs. |
| Playback does not start | Load buffers first and call `start()` from a click/key gesture; check browser console and fetch errors. |

## Technologies

Versions below are the declarations in `package.json`; entries beginning with `^` are version ranges. `package-lock.json` provides the installation lock.

| Technology | Declared version | Role in this repository |
| --- | --- | --- |
| React / React DOM | 19.2.6 | Studio state, interactive controls, windows, and arena component lifecycle. |
| Next.js | 16.3.4 | App Router conventions, metadata types, and APIs such as `next/headers` and `next/navigation`. |
| Vinext | 1.0.0-beta.5 | Runs and builds the Next.js-style application through Vite. The package scripts do not run `next dev` or `next build`. |
| Vite | 8.0.13 | Development and build infrastructure; configuration is in `vite.config.ts`. |
| TypeScript | 5.9.3 | Application and route types, with strict checking configured. The audio SDK is JavaScript. |
| Tailwind CSS / PostCSS plugin | 4.2.1 | Utility styling, alongside substantial custom CSS in `app/globals.css`. |
| `tw-animate-css` | ^1.4.0 | CSS animation utilities. A shadcn Tailwind stylesheet is also vendored. |
| Radix UI | ^1.6.7 | Primitives behind the studio's sliders, tabs, select controls, dialogs, and toggle groups. |
| Lucide React | ^1.31.0 | Interface icons. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | 0.7.1, 2.1.1, 3.6.0 | Component variants and class-name composition. |
| Zod | ^3.25.76 | Validates project-save payloads; connector infrastructure also uses Zod. |
| Cloudflare Vite plugin / Wrangler | 1.37.1 / 4.92.0 | Worker builds and local Cloudflare runtime/binding emulation. |
| Cloudflare D1 / R2 | Platform bindings | SQLite-backed project metadata/history and uploaded audio object storage. |
| Drizzle ORM / Drizzle Kit | 0.45.2 / 0.31.10 | Schema definitions, migration generation, and an available D1 helper. Active SoundQuest routes use D1 prepared SQL directly. |
| ESLint / Next ESLint configuration | 9.39.4 / 16.3.4 | JavaScript, TypeScript, and React linting. |
| Web Audio API | Browser API | Decoding, synchronized looping, gain automation, and master compression. No third-party audio engine is used. |
| Canvas 2D / SVG | Browser APIs | Arena rendering and waveform/envelope graphics. |

### Bundled libraries versus active features

The repository includes a broad `components/ui` collection. Dependencies such as `@base-ui/react`, `@shadcn/react`, React Hook Form, `@hookform/resolvers`, `cmdk`, `date-fns`, Embla Carousel, `input-otp`, `next-themes`, React Day Picker, React Resizable Panels, Recharts, Sonner, and Vaul belong to that broader dependency/component set. Their presence does not mean SoundQuest implements calendars, charts, form workflows, carousels, or those other product features.

In particular, SoundQuest's theme handling is custom, window resizing uses CSS and pointer events, and its audio visualizations use SVG. Connector preview infrastructure uses `json-rpc-2.0` and `raw-body`; the soundtrack workflow does not invoke an external connector.

## Playback flow

`public/sdk.js` implements `SoundQuest` directly with Web Audio:

```text
Looping AudioBufferSourceNode (one per stem)
  → per-stem GainNode
  → shared master GainNode
  → DynamicsCompressorNode
  → AudioContext.destination
```

`load(config)` fetches and decodes uncached stems, caches them by stem ID, and checks actual decoded duration agreement. `start(config, state)` resumes the audio context and starts every source at the same epoch, 80 ms after the current audio-clock time. Each source loops its entire buffer.

The beat duration is `60 / bpm` seconds. For a changed state, the next boundary is calculated from the shared epoch using `quantize` beats. Linear gain ramps then run for `fade × 60 / bpm` seconds. Even an “Instant” fade has a minimum 15 ms ramp. Same-state gain edits also use gain automation. Master-volume updates use a short smoothing time constant.

The compressor has a threshold of −6 dB and a ratio of 12:1; this is compression, not a guaranteed loudness-normalization or clipping-proof mastering system.

`peaks(buffer)` generates 96 normalized display values from sampled points in the first audio channel. The studio initially displays bundled waveform data, then replaces it with decoded-buffer peaks during playback. These are visual summaries, not full audio analysis.

The SDK also retains `makeDemo(ctx, kind)`, a deterministic procedural synthesizer for legacy `demo` stem configurations. It produces 16-second stereo buffers at 22,050 Hz for four layer kinds. The current initial El Cargo session uses audio URLs instead.

## File guide

```text
Browser: React studio + Canvas arena
  ├─ Web Audio SDK → demo files / authenticated audio downloads
  └─ HTTP routes → authentication + owner checks
                   ├─ D1: projects, versions, asset metadata
                   └─ R2: uploaded audio bytes

Vinext/Vite → Cloudflare worker fetch handler → application routes
```

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Main studio, project state, mixer, transport, uploads, library/history, export, and integration guide. |
| `app/arena.tsx` | Canvas game, keyboard/pointer input, enemy proximity, and automatic state requests. |
| `app/studio-window.tsx` | Window docking, dragging, focus ordering, expansion, and reset behavior. |
| `app/layout.tsx`, `app/globals.css` | Root metadata, initial theme script, global and responsive styling. |
| `app/chatgpt-auth.ts` | Trusted-header identity parsing and sign-in/sign-out path helpers. |
| `app/api/projects/route.ts` | Project listing, version history, validation, and saving. |
| `app/api/assets/route.ts` | Audio upload to R2 and asset metadata insertion into D1. |
| `app/api/assets/[id]/route.ts` | Owner-checked audio streaming/download. |
| `public/sdk.js` | Standalone audio engine, waveform helper, and legacy synthesizer. |
| `public/demo/el-cargo/`, `app/demo-waveforms.json` | Bundled demo audio and initial waveform previews. |
| `lib/storage.ts` | Authentication/binding guard, same-origin write check, and shared API errors. |
| `db/schema.ts`, `drizzle/` | Table definitions and generated migration SQL/metadata. |
| `db/index.ts` | Drizzle D1 helper; active SoundQuest routes use the native D1 API instead. |
| `components/ui/`, `lib/utils.ts` | Shared UI primitives and class-name utilities. |
| `build/sites-worker.ts` | Vinext worker entry and request-scoped connector context. |
| `build/sites-vite-plugin.ts` | Local mock auth and build-time packaging of hosting metadata/migrations. |
| `build/connector-preview*`, `lib/connector*`, `scripts/connector-preview/` | Connector capability and preview scaffolding. |
| `vite.config.ts`, `.openai/hosting.json` | Runtime plugins and binding/hosting metadata. |
| `scripts/` | Framework, environment, installation, and managed build wrappers. |
| `examples/d1/` | Starter D1 example; not an active SoundQuest endpoint and excluded from TypeScript checking. |

The page optionally registers a `configure_soundtrack_state` tool if `document.modelContext.registerTool` exists. It accepts only the three supported states and updates the preview selection. This optional browser-host integration does not generate music or provide AI mix suggestions.

### Generated folders and files

| Path | Purpose |
| --- | --- |
| `node_modules/` | Installed dependencies. Recreated by the package installer. |
| `dist/` | Built application output. Recreated by the build command. |
| `dist/server/wrangler.json` | Generated worker configuration used by `npm start` and the local database command above. |
| `dist/.openai/` | Hosting metadata and migration copies packaged by the Sites build plugin. |
| `.wrangler/state/` | Local runtime persistence, including emulated storage. This can contain your local project data; it is not just disposable compiled code. |
| `.sites-runtime/` | Checkout-local execution-profile and tooling state. |
| `*.tsbuildinfo` | TypeScript incremental checking cache. |

Edit the source and configuration files rather than generated build output. Keep the local storage directory when you want to preserve local projects and audio. `README.md` is a Markdown user/developer guide; the application does not execute it.

## Game integration

Copy `public/sdk.js`, the exported JSON, and your audio files to your game's static assets. After correcting the JSON audio URLs, use the SDK as an ES module:

```html
<button id="play" disabled>Start soundtrack</button>
<button id="combat">Combat</button>
<button id="stop">Stop</button>

<script type="module">
  import { SoundQuest } from './sdk.js';

  const response = await fetch('./soundtrack.json');
  if (!response.ok) throw new Error('Could not load soundtrack configuration');
  const config = await response.json();
  const soundtrack = new SoundQuest();

  // Preload before enabling playback; start/resume in a user gesture.
  await soundtrack.load(config);
  const play = document.querySelector('#play');
  play.disabled = false;
  play.addEventListener('click', async () => {
    await soundtrack.start(config, 'exploration');
    soundtrack.volume(0.65);
  });
  document.querySelector('#combat').addEventListener('click', () => {
    soundtrack.setState('combat');
  });
  document.querySelector('#stop').addEventListener('click', () => {
    soundtrack.stop();
  });
  window.addEventListener('pagehide', () => soundtrack.dispose());
</script>
```

Add your game's error handling around fetch, decoding, and playback. Serve the files through an HTTP(S) server rather than opening the HTML directly from the filesystem.

| SDK method | Behavior |
| --- | --- |
| `load(config)` | Fetch/decode missing buffers and validate matching decoded durations. |
| `start(config, state = 'exploration')` | Stop existing sources, resume the context, and start aligned loops. Requires prior loading and at least one stem. |
| `setState(state)` | Schedule gains for one of the three supported states; invalid names throw. |
| `configure(config, state)` | Replace the active configuration and apply state/gain scheduling. Does not load new stems or rebuild source nodes. |
| `volume(value)` | Set master gain, clamped to 0–1. |
| `position()` | Return elapsed beats since the playback epoch, or zero when stopped. |
| `currentState()` | Return the applied state, resolving a pending transition when its scheduled time has arrived. |
| `stop()` | Stop/disconnect source nodes and clear the pending transition; retain cached buffers and the context. |
| `dispose()` | Stop playback and close the audio context. Create a new instance for subsequent use. |
| `decode(bytes)` | Decode an audio ArrayBuffer through the engine's context. |

Use unique stem IDs for distinct audio: caching is keyed by ID, so changing a URL without changing its ID does not force a reload. For changes to the stem list, stop, load, and start again. Avoid changing BPM during playback; the SDK does not time-stretch audio or preserve a previous tempo grid through such changes.

### Configuration shape

| Field | Meaning / save validation |
| --- | --- |
| `id` | Project ID string, maximum 80 characters; empty for a new project. |
| `name` | Trimmed, nonempty project name, maximum 80 characters. |
| `bpm` | Number from 40 to 240. |
| `quantize` | `1`, `4`, or `8`, in beats. |
| `fade` | `0`, `1`, `2`, or `4`, in beats. |
| `stems` | Array of up to 16 stem objects; an empty project can be saved but cannot play. |
| `stems[].id` | Stem/cache/asset identifier, maximum 80 characters. |
| `stems[].name` | Display name, maximum 160 characters. |
| `stems[].color` | Six-digit hexadecimal color such as `#50ead5`. |
| `stems[].url` | Audio URL for URL-backed stems; the save API reconstructs this from recognized demo IDs or owned asset IDs. |
| `stems[].demo` | Optional legacy synthesizer kind, integer 0–3. |
| `stems[].duration` | Positive duration in seconds, maximum 120; stems must agree within 0.05 seconds. |
| `stems[].levels` | `exploration`, `danger`, and `combat` numeric gains, each 0–100. |
| `stems[].wave` | Up to 96 values between 0 and 1 in saved studio data; omitted from exports. |
| `schemaVersion` | Added as `1` by export; not used as a migration/validation mechanism by the SDK. |

Exported JSON is intended for the SDK. There is no JSON import UI, and the save API expects studio waveform arrays, so an export is not directly a save-API payload.

## Storage and HTTP API

### Data model

| Table | Stored fields and behavior |
| --- | --- |
| `projects` | `id`, `owner`, `name`, serialized JSON `config`, `created_at`. Saving an existing project also overwrites `created_at`, so the field behaves as its latest-save timestamp. |
| `versions` | UUID `id`, `project_id`, incrementing `version`, serialized `config`, `created_at`. A unique index covers `(project_id, version)`. |
| `assets` | UUID `id`, `owner`, original upload `name`, and MIME `type`. Audio bytes are in R2 under the same ID. |

Project saves use a D1 batch to update/insert the current project and append a version numbered `MAX(version) + 1`. Historical versions have no update/delete endpoint. Assets remain separate from projects; removing a stem does not reclaim its R2 object or metadata.

### Endpoints

All endpoints below require an authenticated owner and both storage bindings.

| Method and path | Request | Response / behavior |
| --- | --- | --- |
| `GET /api/projects` | No body. | Owner's projects ordered by `created_at` descending; rows contain `id`, `name`, `config`, `created_at`. |
| `GET /api/projects?id=<project-id>` | Owned project ID. | Versions newest first, with `version_id`, `version`, `config`, `created_at`. |
| `POST /api/projects` | Studio project JSON. | Validates fields and asset ownership, saves current configuration and a new version; returns `{ "id": "...", "version": 1 }`. |
| `POST /api/assets` | Multipart form with a `file` field. | Stores audio in R2 and metadata in D1; returns `{ "id": "..." }`. |
| `GET /api/assets/<id>` | Owned asset ID. | Streams the R2 body with stored MIME type and content length. |
| `GET /api/assets/<id>?download=1` | Same ownership requirement. | Adds an attachment filename through `Content-Disposition`. |

The `config` property in project/history responses is a JSON **string**; the studio parses it when opening a record.

Writes reject a present `Origin` header that differs from the request URL origin. Project saves reject a declared content length above 200,000 and also check the request text length against 200,000. The upload route rejects declared request lengths above 21 MiB and enforces the separate 20 MiB file limit.

For uploaded stems, saving verifies that the asset ID belongs to the current owner and rewrites the URL to `/api/assets/<id>`. Recognized demo IDs are mapped to bundled audio paths; legacy `demo` stems have their URL removed. Arbitrary external URLs are not accepted as independent saved assets through this workflow.

If an asset metadata insert fails after upload, the route attempts to delete the newly written R2 object. Audio responses use `Cache-Control: private, max-age=3600` and `X-Content-Type-Options: nosniff`.

Errors return `{ "error": "message" }`. Explicit errors use 400 for validation, 401 for missing identity, 403 for rejected cross-origin writes, 404 for missing/unowned resources, and 503 for missing bindings. Unexpected errors also become a generic 503; malformed JSON currently reaches that generic handler. There are no project/asset deletion, sharing, or collaboration endpoints.

## Understanding `public/sdk.js`

The excerpts below show the essential operations, reformatted for readability. Some surrounding loops and error checks are omitted; consult the source for the complete methods.

### 1. A soundtrack is a group of synchronized layers

Each stem has its own audio buffer and three gain settings:

```js
levels: {
  exploration: 80,
  danger: 85,
  combat: 90
}
```

These values are percentages. This example keeps a layer audible in every state but makes it louder as tension rises. Other layers can have a zero exploration gain and become audible only in danger or combat.

The engine keeps decoded audio in a map:

```js
this.buffers = new Map();
```

A `Map` associates a key with a value. Here the stem ID is the key and an `AudioBuffer` is the value. An `AudioBuffer` contains decoded sample data that Web Audio can play. Caching avoids downloading and decoding the same stem on every press of Play.

### 2. Creating the audio graph

`ensure()` creates the audio context only when it is first needed:

```js
this.context = new AudioContext();
this.master = this.context.createGain();
this.master.gain.value = this.level;

const limiter = this.context.createDynamicsCompressor();
limiter.threshold.value = -6;
limiter.ratio.value = 12;
this.master.connect(limiter);
limiter.connect(this.context.destination);
```

`AudioContext` supplies the audio-processing graph and its clock. A gain node multiplies incoming samples by a gain value. `connect()` routes audio from one node to another, and `destination` represents the browser's output.

The local variable is called `limiter`, but the node is a dynamics compressor. Its threshold and ratio reduce strong signals; the code does not implement a separate true-peak limiter or loudness target.

### 3. Loading and decoding files

For a URL-backed stem, `load()` performs:

```js
const r = await fetch(stem.url);
if (!r.ok) throw Error('Could not load ' + stem.name);
this.buffers.set(
  stem.id,
  await ctx.decodeAudioData(await r.arrayBuffer())
);
```

`fetch()` requests the file. `arrayBuffer()` reads its bytes, and `decodeAudioData()` converts the encoded audio into samples. `await` waits for each asynchronous operation; a failed request raises an error instead of continuing with missing audio.

Once buffers are available, their decoded durations are compared:

```js
const lengths = config.stems.map(
  s => this.buffers.get(s.id).duration
);
if (lengths.some(n => Math.abs(n - lengths[0]) > .05)) {
  throw Error('All stems must have the same loop length.');
}
```

`map()` builds an array of durations. `some()` checks whether any duration differs from the first by more than 0.05 seconds. Matching duration does not prove that the musical contents are aligned; the supplied files must already have matching start points and tempo. Slightly different lengths inside the tolerance still loop at their own buffer boundaries.

### 4. Starting all stems together

`start()` stops previous sources, resumes the audio context, and chooses one shared start time:

```js
this.epoch = ctx.currentTime + .08;
```

`currentTime` is the audio clock in seconds. The 80 ms lead gives the engine a future time at which to start its sources.

For every stem, it creates a source and gain node:

```js
const source = ctx.createBufferSource();
source.buffer = buffer;
source.loop = true;

const gain = ctx.createGain();
gain.gain.value = (stem.levels[state] || 0) / 100;
source.connect(gain);
gain.connect(this.master);
source.start(this.epoch);
```

All sources receive the same epoch rather than starting as soon as their individual setup finishes. A gain of 65% becomes `0.65`, so this node multiplies its samples by 0.65. A zero-gain source still runs silently, keeping its position aligned for a later state change.

Audio buffer source nodes are created again for each playback start. Stop is not a pause/resume mechanism that preserves the previous playhead position.

### 5. Converting time into beats

The position display uses:

```js
(this.context.currentTime - this.epoch) * this.config.bpm / 60
```

Subtracting the epoch gives elapsed seconds. Multiplying by BPM and dividing by 60 converts seconds to beats. At 120 BPM, one beat lasts 0.5 seconds; six elapsed seconds represent twelve beats.

The UI groups beats into four-beat bars. Changing BPM changes the timing calculations, not the playback speed or pitch of the audio files.

### 6. Choosing the next transition boundary

When the requested state changes, `setState()` calculates:

```js
const beat = 60 / this.config.bpm;
at = this.epoch +
  (Math.floor((now - this.epoch) /
    (beat * this.config.quantize)) + 1) *
  beat * this.config.quantize;
this.pending = { state, at };
```

`beat * quantize` is the length of a transition interval in seconds. Dividing elapsed time by that interval locates the current interval. `Math.floor()` rounds down, and adding one chooses the next boundary.

For example, at 120 BPM with `quantize: 4`, boundaries occur every two seconds from the epoch. A request 3.2 seconds after the epoch is scheduled for 4.0 seconds. The next section's fade begins at that scheduled time.

`pending` records the requested state and its scheduled time. `currentState()` promotes it to the applied state once the audio clock reaches that time. This happens when the transition starts, not when its fade finishes.

### 7. Fading between state gains

Each stem's gain is scheduled separately:

```js
const fade = this.config.fade * beat;
param.cancelAndHoldAtTime(now);
param.setValueAtTime(param.value, at);
param.linearRampToValueAtTime(
  (stem?.levels[state] || 0) / 100,
  at + Math.max(.015, fade)
);
```

`param` is the gain node's automatable gain parameter. The code cancels existing scheduled automation from the current time, establishes a value at the chosen boundary, and schedules a linear ramp to the target.

At 120 BPM, a two-beat fade lasts one second. If a layer's gain changes from 20% to 80%, a linear ramp between those endpoints passes through 50% halfway through. Other layers can fade down at the same time. This is a change in mixing gains, not an edit to the stored audio samples.

`?.` safely accesses a property when the stem exists. `|| 0` supplies zero when the requested level is missing or zero. `Math.max(.015, fade)` gives even the Instant option a minimum 15 ms ramp.

### 8. Drawing a waveform overview

`peaks()` reads channel zero, divides its length into 96 sections, and samples every eighth value within each section to estimate its largest absolute amplitude:

```js
const data = buffer.getChannelData(0);
peak = Math.max(peak, Math.abs(data[j] || 0));
```

Negative and positive values both contribute through `Math.abs()`. Each peak is then scaled relative to the largest peak in that buffer:

```js
const max = Math.max(...out, .001);
return out.map(n => n / max * .9);
```

The small lower bound avoids division by zero for silence. The result is a normalized visual overview, so two stems with different absolute levels can have similarly tall waveforms. It is not a sample-accurate editor or a measurement of the signal after mixing.

### 9. Keeping the older synthesized demo

`makeDemo()` creates four kinds of procedural layers: chords/atmosphere, bass, rhythmic notes, and drums. It writes generated samples into a stereo buffer using oscillations, envelopes, seeded noise, and panning. Event tails wrap into the beginning of the buffer to support looping.

This path is selected by a stem's numeric `demo` field. It is retained for older configurations; the initial session loads the bundled recordings through URLs.

## Understanding `app/page.tsx`

### Project data and interface state

The main page is a React client component. A project groups its name, tempo, transition settings, and stems:

```ts
type Project = {
  id: string;
  name: string;
  bpm: number;
  quantize: number;
  fade: number;
  stems: Stem[];
};
```

`Stem[]` means an array of stems. The `State` type permits only `exploration`, `danger`, or `combat`. TypeScript helps check these shapes during development; the server's Zod schema separately validates incoming requests at runtime.

React state holds the editable project and UI choices. A ref holds the audio engine so it survives interface renders without being recreated. The engine is created in an effect and disposed when the page component unmounts.

### Editing a mix

The `patch()` helper merges changed project fields and marks the draft as dirty:

```js
setP(x => ({ ...x, ...v }));
setDirty(true);
```

`...x` copies the existing fields and `...v` replaces the supplied ones. Gain controls also copy the affected stem and its `levels` object. This gives React new objects to render rather than mutating an existing state object in place.

An effect connects changes to the running engine:

```js
if (engine.current?.running) {
  engine.current.configure(p, state);
}
```

The dependency list includes the project and selected state, so editing gains or choosing another state updates playback. A separate 60 ms interval refreshes the visible beat and applied state. Audio timing is scheduled against `AudioContext.currentTime`; the interface timer only updates the display.

### Importing audio

`upload()` stops playback and handles selected files in order. It decodes a file locally before sending it, rejects duration mismatches or overlong loops, then constructs a multipart request:

```js
const form = new FormData();
form.append('file', f);
const r = await fetch('/api/assets', {
  method: 'POST',
  body: form
});
```

The server returns an asset ID. The page uses that ID for the buffer cache and audio URL, calculates waveform peaks, and appends the stem to the draft. Uploading audio and saving a project are separate operations; an uploaded object can exist before any project version references it.

### Saving and reopening

`save()` sends `JSON.stringify(p)` to the project endpoint. `JSON.stringify()` converts the JavaScript object into text suitable for the HTTP request. A successful response provides the project ID and new version number, and the UI clears the unsaved marker.

`library()` fetches either the project list or a selected project's history. `restore()` parses a row's stored configuration with `JSON.parse()`, stops playback, and replaces the current draft. Loading history marks it dirty so the next save creates a new revision.

Errors are shown in the status area. The app does not discard the current mix simply because a save request fails.

### Exporting configuration

The export removes waveform display data and adds a schema marker:

```js
const out = {
  ...p,
  schemaVersion: 1,
  stems: p.stems.map(({ wave, ...s }) => s)
};
```

`({ wave, ...s })` separates `wave` from the remaining stem fields. The function returns those remaining fields, so the exported stems keep their URLs and gains without the waveform arrays.

The page turns the JSON into a `Blob`, creates a temporary object URL, clicks a download link, and revokes the URL afterward. This creates a settings file; it does not combine or render the audio into a new recording.

## Understanding the arena and workspace windows

### `app/arena.tsx`

The arena uses `requestAnimationFrame()` to update and draw the canvas. It calculates movement from the time between frames and normalizes diagonal input so moving diagonally does not exceed the intended movement speed.

Distance uses the Pythagorean calculation provided by `Math.hypot()`:

```js
Math.hypot(e.x - p.x, e.y - p.y)
```

The closest enemy determines the state:

```js
const next = distance < 68 ? 'combat'
  : distance < 150 ? 'danger'
  : 'exploration';
```

This conditional expression selects one of three strings. The component calls `onState(next)` when that detected state changes. The parent passes its React state setter as `onState`, which connects game proximity to the same music controls used by the tabs.

Keyboard input is stored in a `Set` of held keys. Pointer buttons add and remove the corresponding keys for touch control. Attacking filters nearby enemies out of the enemy array. When there are no enemies, the minimum-distance calculation gives infinity, so the selected state returns to exploration.

### `app/studio-window.tsx`

Each window tracks whether it is floating or expanded and, when floating, its screen position. Pointer-down captures the starting mouse/touch coordinates; pointer movement calculates a new position and clamps it to bounds intended to keep the window reachable.

Dragging uses pointer capture so movement continues to reach the title bar while the pointer moves outside it. CSS `resize: both` provides floating-window resizing. A custom `soundquest:window-focus` event raises the active window above the others. An Escape listener restores an expanded window.

The reset key changes when the user selects Reset layout. Each window responds by clearing floating/expanded state and inline dimensions. These layout choices stay in memory; the theme alone has explicit browser-storage persistence.

## Understanding server storage

### Checking identity and bindings

`lib/storage.ts` checks identity before exposing storage to a route:

```js
const user = await getChatGPTUser();
if (!user) {
  throw new ApiError('Sign in to save projects or upload stems.', 401);
}
```

The returned owner is `user.userId`. Routes use this server-derived value rather than accepting an owner from the submitted project. The same helper verifies that D1 and R2 bindings exist.

`ApiError` carries an expected HTTP status. `failure()` converts expected errors to JSON and logs unexpected errors before returning a generic failure message.

### Validating a project

The project route defines a Zod schema, including:

```js
const level = z.number().min(0).max(100);
```

That reusable schema validates each state's gain. Other fields have their own bounds, such as BPM 40–240 and at most 16 stems. `safeParse()` returns a result indicating whether validation succeeded, allowing the route to send a controlled message when settings are invalid.

The route then performs checks that field validation cannot establish, such as asset ownership and matching stem durations. Browser validation improves feedback, but server checks are needed because callers can send HTTP requests without using the interface.

### Owner-scoped database queries

Project lookup uses a prepared statement:

```js
DB.prepare('SELECT id FROM projects WHERE id=? AND owner=?')
  .bind(id, owner)
  .first();
```

The question marks are parameter placeholders. `bind()` supplies data separately from the SQL text. Including `owner` means knowing another project's ID is not enough to open it through this route.

Project configurations are serialized into text columns rather than split into separate tables for stems and gains. Saving updates the current project and inserts a version through `DB.batch()`. Version numbering uses `COALESCE(MAX(version), 0) + 1`: start at one when no version exists, otherwise add one to the highest saved number.

### Storing and downloading audio

The upload route generates a UUID, writes the file stream to R2 under that ID, and inserts its owner, filename, and MIME type into D1. If the metadata insert fails, it attempts to delete the R2 object it just created.

The download route first finds metadata using both the asset ID and current owner, then retrieves the matching R2 object. This keeps project JSON in the database while serving the larger audio body from object storage.

The duration checks during project saving use submitted metadata; the server does not decode the uploaded bytes to verify their length. The SDK checks decoded lengths again when loading audio for playback.

## Understanding configuration files

### `package.json` and `package-lock.json`

`package.json` declares the Node requirement, dependencies, and named commands. For example, `npm run dev` executes `scripts/run-framework.mjs dev`. Its `private: true` field prevents accidental npm publication; it does not configure website access control.

`package-lock.json` records the resolved dependency tree. `npm ci` installs from that lock rather than choosing a new set of package versions. The package's internal starter name does not change the SoundQuest title shown by the application.

### `tsconfig.json`

The TypeScript configuration enables strict checks, allows JavaScript alongside TypeScript, and uses bundler-style module resolution. `noEmit: true` means the TypeScript checker does not write compiled output; the framework build handles that work. The `@/*` alias points to the repository root, so `@/lib/storage` refers to `lib/storage.ts`.

### `vite.config.ts` and `next.config.ts`

Vite combines the Vinext, Sites, connector-preview, and Cloudflare plugins. Vinext handles the Next.js-style application structure, while the Cloudflare plugin supplies the worker runtime and bindings. The Next configuration is present but contains no custom options in the inspected revision.

### `drizzle.config.ts` and migrations

Drizzle Kit reads `db/schema.ts`, uses the SQLite dialect, and writes migrations into `drizzle`. The initial SQL creates `projects`, `versions`, and `assets`, plus the unique project/version index. Editing the TypeScript schema alone does not alter an existing database: generate and apply the required migration separately.

### Styling and lint configuration

`postcss.config.mjs` loads Tailwind's PostCSS plugin. `app/globals.css` imports Tailwind, animation utilities, and the vendored shadcn stylesheet before defining the studio's colors and layout. `eslint.config.mjs` selects Next/TypeScript rules and adjusts checks for vendored UI files.

### Cloudflare bindings

The checked-in `.openai/hosting.json` selects these bindings:

```json
{
  "d1": "DB",
  "r2": "BUCKET"
}
```

The actual file also contains the existing Sites `project_id`. That is hosting metadata, not a database credential or an environment variable. A separate deployment must use its own hosting association.

`vite.config.ts` reads this file and supplies local D1 and R2 configuration. The local D1 database is named `site-creator-d1`; its all-zero-style placeholder ID is for local configuration, not a provisioned production database. The local bucket name is `site-creator-r2`. Runtime code expects `env.DB` and `env.BUCKET` from `cloudflare:workers`.

The shared storage helper requires **both** bindings for every storage endpoint, including project-only requests. An absent binding returns a storage-unavailable error.

### Authentication and production deployment

The application is designed for a Sites/Cloudflare hosting environment with trusted authentication headers. `getChatGPTUser()` requires:

- `oai-authenticated-user-id`
- `oai-authenticated-user-email`

It optionally decodes `oai-authenticated-user-full-name` when `oai-authenticated-user-full-name-encoding` is `percent-encoded-utf-8`.

These are request headers supplied by a trusted hosting layer, not values to place in an `.env` file. Production authentication must prevent callers from forging them. The route helper does not independently verify an OAuth token. Keep the intended private-access policy in the hosting layer; the tracked hosting JSON does not itself declare that policy.

For a production deployment, provision real D1/R2 resources, provide those bindings, apply the migrations to the intended database, and supply the trusted authentication/sign-in layer. The Sites build plugin copies hosting metadata and migrations into `dist/.openai`. There is no `deploy` package script or self-contained production OAuth implementation, so building or running Wrangler locally does not complete production setup.

### Environment and execution profile

There are no required application API keys or documented application secrets in the inspected soundtrack implementation. Do not add a guessed database URL, R2 access key, or AI API key: storage uses worker bindings and playback runs in the browser.

Optional tooling settings actually read by the repository include:

| Setting | Purpose |
| --- | --- |
| `SITES_RUNTIME_ROOT` | Overrides the runtime-state directory used by `scripts/sites-env.mjs`; otherwise `.sites-runtime` is used. |
| `CLOUDFLARE_CF_FETCH_ENABLED` | Defaults to `false` in the runtime/config helpers. |
| `WRANGLER_SEND_METRICS`, `WRANGLER_WRITE_LOGS` | Default to `false` in the relevant helpers. |
| `WRANGLER_LOG_PATH`, `WRANGLER_REGISTRY_PATH`, `MINIFLARE_REGISTRY_PATH` | Local tool log/registry locations; defaults are provided by the tooling. |
| `CODEX_SANDBOX` | A value of `seatbelt` enables polling for development file watching. |
| `SITES_BUILD_TIMEOUT`, `SITES_BUILD_KILL_AFTER` | Managed-Linux build limits; defaults are `3m` and `10s`. |
| `SITES_INSTALL_REPORT_PATH` | Optional installer progress-report destination. |

A clean clone defaults to the `portable` execution profile. A checkout-local `.sites-runtime/execution-profile.json` can select `portable` or `managed-linux`. Managed Linux uses different installer/build wrappers, requires Bash and GNU `timeout` for the build wrapper, and disables the portable mock-auth middleware. This is tooling configuration, not a project soundtrack setting.

`.env*`, `.wrangler`, `.sites-runtime`, and generated build output are ignored by Git.

## Limitations and licensing

The current implementation does not include AI-generated music or mix suggestions, stem separation, BPM detection, time stretching, server-side audio analysis/transcoding, audio rendering/export, collaboration roles, public project sharing, external game-service authentication, or a native Unity/Unreal SDK. Its shipped integration is browser JavaScript plus JSON.

The inspected repository contains third-party license notices for the vendored Sites plugin and shadcn stylesheet, but no root project license or explicit redistribution license for the bundled El Cargo recordings was found. Do not assume those third-party notices license the entire application or its audio assets; clarify permissions before redistributing them.

## Suggested reading order

1. Read Run, Workflow, and Controls and features to understand the user-facing behavior.
2. Read the `State`, `Stem`, and `Project` types near the top of `app/page.tsx` to understand the data.
3. Read `load()`, `start()`, and `setState()` in `public/sdk.js` to understand playback and transitions.
4. Read `start()`, `upload()`, `save()`, `restore()`, and `download()` in `app/page.tsx` to connect the engine to the interface.
5. Read `app/arena.tsx` to see how game events request music-state changes.
6. Read `lib/storage.ts`, the API routes, and `db/schema.ts` to understand authentication and persistence.
7. Read `vite.config.ts` and the framework scripts to understand development and deployment requirements.

The interface collects mix choices, the audio engine schedules synchronized playback, and the server stores the owner's projects and uploaded files.

## Documentation basis

This guide describes [pascalmmk/soundquest](https://github.com/pascalmmk/soundquest) at commit [`24804e3`](https://github.com/pascalmmk/soundquest/tree/24804e34eed59e9a4b45d37b87993ab3492b9417). Code excerpts were checked against that source and reformatted for explanation. Build, API, browser, and listening checks were not independently run during this documentation review.
