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
- Landscape 4:3 tablet simulator, drawing-app style dark top bar, flat icon controls. Icons retain accessible names and tooltips.
- Generated photorealistic transparent PNG materials live in `assets/real`. Original illustrated assets remain for provenance, not used by the active screen.
- `src/grab.js`: pin the local point under the pointer and rotate the object through a damped angular response to off-center motion. Exact no-slip contact. No global physics, gravity, collisions, cloth bending or mesh deformation. Mouse/touch Pointer Events, long-press or Alt/Option to cycle overlap selection.
- Assistant is absent until triggered. Three completed operations and 6.5 seconds of idle; no trigger during pointer interaction, dialogs or hidden page. Sixty-second cooldown after response. Current proposal provider is still local rules, not a real model.
- Authorized co-paint: acceptance creates three new copies (two leaves and a button) via a sequential local template, never moves existing work. Child can work concurrently, stop, or grab an assistant piece to take over. The assistant twig and stop control disappear at completion. No online model or semantic scene planning; corrections remain board-scoped and never grant permission.
- Object-delta undo groups the AI additions and preserves concurrent child edits. Interruptions (board change, hidden page, resize, framing) stop the run; keep partial placements without resuming automatically. See `src/copaint.js`, `src/collage-history.js`, and `tests/copaint.test.js`.
- Multiple editable boards use localStorage `wonderpatch-v1-library`; earlier data is retained. Undo/redo history is per board in memory.
- Save opens frame selection (oak/chalk/ink/none) with Save and Share buttons. Save persists board and frame choice, downloads framed PNG. Share uses Web Share files if supported, otherwise downloads PNG for manual sharing. Does not upload publicly.

## Entry points

`index.html`: device shell, popovers, dialogs.
`src/app.js`: PixiJS rendering, pixel hit testing, board state, suggestions, exports.
`src/tablet.css`: active tablet visual design.
`src/icons.js`: consistent outline icons.
`src/grab.js`: testable pointer constraint.

## Verification and boundaries

Co-paint verification (2026-10-11): 8 Node tests pass (grab anchor, three-piece plan, occupancy rejection, cancellation, reduced motion, concurrent delta undo/redo). Browser check: three operations → idle proposal, accept → independent assistant twig, drag a child button while AI runs, six pieces at completion, assistant hides, undo leaves three child pieces at their new positions, redo restores all six, reload restores six without restarting the assistant. Tests use local boards; no deployment. Physical tablet and multi-touch remain untested.

Browser QA: drag leaf tip and observe rotation, old board restored, frame choices and PNG download. Layout inspected in 1024×768 viewport and default desktop viewport. Browser simulation is not a physical iPad or Apple Pencil test. Native sharing requires a supporting browser/OS and explicit recipient selection by the user.

Further work can continue directly in this checkout; no need to recreate the project or fetch a blank copy of the remote.
