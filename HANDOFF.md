# WonderPatch — Codex continuation

## Project

Local checkout: `/Users/zhangxing/Documents/Codex/AIforkids`
Remote: `https://github.com/AleFoxhorn/AIforkids`
Initially empty repository. Commit `3557237` is the pre-visual-redesign baseline. Image materials are ignored by Git and distributed separately in the `materials-v1` GitHub Release; download its ZIP and extract into the checkout before running a fresh clone (see README). Browser-saved artworks are not part of Git or the asset package. No public deployment is authorized.

## Run

`npm install` (lockfile included), then `npm run dev -- --host 127.0.0.1`.
Current preview: http://127.0.0.1:5173/.
Build: `npm run build`. Grab constraint tests: `node --test tests/grab.test.js`.

## Product decisions

- Child-led free collage. No command-to-auto-collage, camera, segmentation, microphone or behavioral monitoring.
- Landscape 4:3 tablet simulator with a cream-and-grass-green child-friendly theme, round flat icon controls and warm accent colors. Icons retain accessible names and tooltips. `src/garden.css` overrides the previous dark drawing-app shell; realistic materials and frame rendering are unchanged. The friendly green dinosaur assistant icon only appears inside the existing conditionally shown proposal. Its inline vector artwork lives in `src/icons.js`, so it requires no new material-pack download.
- Generated photorealistic transparent PNG materials live in `assets/real`. Original illustrated assets remain for provenance, not used by the active screen.
- `src/grab.js`: pin the local point under the pointer and rotate the object through a damped angular response to off-center motion. Exact no-slip contact. No global physics, gravity, collisions, cloth bending or mesh deformation. Mouse/touch Pointer Events, long-press or Alt/Option to cycle overlap selection.
- Assistant is absent until triggered. Three completed operations and 6.5 seconds of idle; no trigger during pointer interaction, dialogs or hidden page. Sixty-second cooldown after response. Current proposal provider is still local rules, not a real model.
- Authorized co-paint: acceptance creates three new copies (two leaves and a button) via a sequential local template, never moves existing work. Child can work concurrently, stop, or grab an assistant piece to take over. The assistant twig and stop control disappear at completion. No online model or semantic scene planning; corrections remain board-scoped and never grant permission.
- Object-delta undo groups the AI additions and preserves concurrent child edits. Interruptions (board change, hidden page, resize, framing) stop the run; keep partial placements without resuming automatically. See `src/copaint.js`, `src/collage-history.js`, and `tests/copaint.test.js`.
- Multiple editable boards use localStorage `wonderpatch-v1-library`; earlier data is retained. Undo/redo history is per board in memory.
- Save opens frame selection (oak/chalk/ink/none) with Save and Share buttons. Save persists board and frame choice, downloads framed PNG. Share uses Web Share files if supported, otherwise downloads PNG for manual sharing. Does not upload publicly.

## Entry points

Trial release supersedes earlier asset/pipeline notes: all initial assets now tracked with software; generation paused using src/features.js on client and server. Static Sites trial contains only dist and initial assets, not local originals or credentials. Long-press canvas selection no longer drops pointer capture/drag state; AI progress wrapper is pointer-transparent except stop button. 29 tests pass. Browser QA on isolated localhost:5174 confirmed 3 additions → natural-pause bird proposal → accept → drag child leaf while progress remains 1/3, with child coordinates changing independently from AI leaf. Main local user storage was not used for this QA.

Latest model integration (2026-10-11): Vite server-only middleware in `server/material-generation.js` calls Beijing DashScope qwen3-vl-flash then qwen-image-edit-plus. Key only in ignored `.env.local` (0600); never print it. `material-upload.js` preserves originalBlob before any remote request, stores generatedBlob, validates keyed-background removal to PNG and auto-adds only ready materials. Legacy blob records remain supported. Uploaded original/archive download and explicit retry are available; no automatic paid retries. Active uploads should finish before reload (in-flight result is not a durable server job). Qwen image output is NOT assumed to have alpha: chroma-key cleanup requires further real-image quality validation. Authentic provider smoke test returned invalid_api_key, so generation stopped before image-edit; do not claim real generation verified or bill exhaustion. 28 tests/build passed. Replace local key with a valid Beijing DashScope key before the real end-to-end acceptance test. No deployment.

`index.html`: device shell, popovers, dialogs.
`src/app.js`: PixiJS rendering, pixel hit testing, board state, suggestions, exports.
`src/tablet.css`: active tablet visual design.
`src/icons.js`: consistent outline icons.
`src/grab.js`: testable pointer constraint.

## Verification and boundaries

Co-paint verification (2026-10-11): 8 Node tests pass (grab anchor, three-piece plan, occupancy rejection, cancellation, reduced motion, concurrent delta undo/redo). Browser check: three operations → idle proposal, accept → independent assistant twig, drag a child button while AI runs, six pieces at completion, assistant hides, undo leaves three child pieces at their new positions, redo restores all six, reload restores six without restarting the assistant. Tests use local boards; no deployment. Physical tablet and multi-touch remain untested.

Browser QA: drag leaf tip and observe rotation, old board restored, frame choices and PNG download. Layout inspected in 1024×768 viewport and default desktop viewport. Browser simulation is not a physical iPad or Apple Pencil test. Native sharing requires a supporting browser/OS and explicit recipient selection by the user.

Further work can continue directly in this checkout; no need to recreate the project or fetch a blank copy of the remote.

Shelf gallery iteration: new shelfButton sits left of existing board picker. shelfDialog fits the tablet app rectangle and renders saved board object data with the shared frame renderer (shelf-preview.js), without swapping the live board to build thumbnails. Includes imported image artworks with reframe-only navigation. Nonempty drafts are also shown; explicit frame saves retain framedAt and frame choice. Persist records artAspect for new previews. Double-click title opens renameDialog, single click does nothing; Enter/Space supported and the visible save dot is removed. Material drawer no longer fades; picking up a held tile collapses expanded grid to single row without canceling pointer capture, and successful drop leaves tray open. Build and 19 tests pass including auto-collapse while dragging.

Follow-up UI/feedback: plus upload icon, microphone correction icon with explicit text-only label, no exterior cartoon decorations. flash() now uses a temporary dinosaur + speech bubble. Dragged material renders into a fixed pointer-transparent canvas above toolbar then restores its Pixi sprite on drop/cancel. Material management uses a persisted hidden-ID set; originals remain available for existing boards and undo, with a restore control. Offline scene-memory.js extracts explicit scene/exclusion facts, drops raw correction wording, migrates old strings and drives bird/fish proposals. General semantic interpretation is NOT implemented. 18 unit tests pass; browser verified plus/microphone icons, no exterior decorations, memory displays 场景：海底, removal leaves all 12 existing objects intact and restore returns the library tile.

Latest follow-up: `studio-shell.css` separates hardware from app UI, adds exterior cartoons and aligned gallery arrow. Material drawer is hold-to-drag (420ms); short press hints, keyboard Enter remains accessible add fallback. Local material uploads preserve original blobs in IndexedDB v2 materials store, loaded before board restore. Blob images use Texture.from(decodedImage), not extension-based Assets loader. Drop canvas pieces on toolbar trash to delete with undo. Proposal cooldown now schedules future eligibility instead of dropping the timer; scatter no longer resets the operation counter. Build + 14 Node tests pass. Browser verified short tap adds nothing, image upload and reload recovery, trash drop decreases piece count 14→13 and undo restores 14; test canvas insertion undone afterward. Hold-drag covered by event-handler test, not physical touch-device verification. No public deployment.
