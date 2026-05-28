# Control Flow Map

How the banjo note-recognition trainer is wired together, and the main paths
a user drives through it. The app is a static, backend-free site: one HTML
page loads one ES module (`script.js`), which imports focused modules.

## Module map

| File | Role | Exports used |
|------|------|--------------|
| `src/index.html` | Entry page: the `#fretboard` canvas, a static `#hint`, and the module `<script>`. | — |
| `src/script.ts` | **Controller.** Owns app state, input handling, and wiring. The only module with side effects at load. | — |
| `src/draw.ts` | Pure renderer. Draws the fretboard for a given state onto a 2D canvas context. | `drawFretboard`, `NOTE_RADIUS` |
| `src/notes.ts` | The note data (CGDA natural notes), single source of truth. | `notes`, `Note` type |

Dependency direction (controller depends on the rest; the rest don't depend on
the controller or each other, except `draw.ts` → `notes.ts`):

```
        index.html
            │ loads
            ▼
         script.ts ─────┬──────────┐
        (controller)    │          │
                        ▼          ▼
                     draw.ts    notes.ts
                        │          ▲
                        └──────────┘
```

## Startup

1. The browser loads `index.html` and hits `<script type="module" src="script.js">`.
2. TypeScript is compiled to `script.js` at build time via `npm run build`.
3. `script.js` executes top-to-bottom:
   - Imports the three modules.
   - Initialises module-level **state** (see below).
   - Resolves the canvas and its 2D context (`getElementById` + `getContext`).
   - Defines the controller functions.
   - Registers the `click` listener on the canvas.
   - Calls `nextQuestion()` — this renders the first question and starts the loop.

There is no resize, keyboard, or network path; the canvas is a fixed 300×500.

## State model

All state lives as module-level variables in `script.ts`:

| Variable | Meaning |
|----------|---------|
| `currentNote` | The note currently being asked (a `Note`). |
| `showingAnswer` | Whether the current note's name is revealed. |

Rendering is a pure function of these: every visible change goes through
`drawFretboard`, which reads the state passed to it. There is no other source
of truth.

## Main path — the training loop

A simple practice cycle. Tap the highlighted note to reveal its name, or tap
elsewhere to load the next random note.

```
   startup
      │
      ▼
 ┌─────────────┐   Math.random() picks a note
 │ nextQuestion├───────────────────────────────┐
 └─────┬───────┘                                │
       │ drawFretboard(currentNote, showingAnswer=false)
       │  → red marker, NO label
       ▼
   ┌───────────┐
   │ wait for  │
   │   tap     │
   └─────┬─────┘
         │ handleCanvasClick
   ┌─────┴────────────────────────────────┐
   │                                      │
 tap ON the note                tap OFF the note
   │                                      │
   │                                      ▼
   │                              nextQuestion (loop)
   │
   ▼
 showAnswer
   • drawFretboard(currentNote, showingAnswer=true)
   • reveal label
   │
   │ tap again (on note or elsewhere)
   ▼
 nextQuestion (loop)
```

Hit testing checks if the tap is within `NOTE_RADIUS * 1.5` pixels of the note's
center. On-note taps reveal the answer; off-note taps load the next question.

## Input dispatch

`handleCanvasClick(clientX, clientY)` is the one input entry point, called from
the `click` listener.

```
 handleCanvasClick
      │
      ├─ if no currentNote, return
      │
      ├─ map client coords → canvas coords (getBoundingClientRect + scale)
      │
      └─ hit-test the current note:
            on-note  → showAnswer()
            off-note → nextQuestion()
```

## Rendering pipeline — `drawFretboard(ctx, canvas, currentNote, showingAnswer)`

A single render function, called by every path above. It draws in layers:

1. `clearRect` the canvas.
2. Draw the grid: `drawFrets`, `drawNut`, `drawStrings`.
3. Draw faint markers at every natural note (all notes from `notes.ts`).
4. Draw the current note as a red circle at `NOTE_RADIUS` pixels; if
   `showingAnswer`, also draw its label.

## Quick reference: what triggers what

| User action | Result |
|-------------|--------|
| Tap the highlighted note | `showAnswer` — reveal label |
| Tap elsewhere on the board | `nextQuestion` — new random note |
