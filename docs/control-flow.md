# Control Flow Map

How the banjo note-recognition trainer is wired together, and the main paths
a user drives through it. The app is a static, backend-free site: one HTML
page loads one ES module (`script.js`), which imports four focused modules.

## Module map

| File | Role | Exports used |
|------|------|--------------|
| `src/index.html` | Entry page: the `#fretboard` canvas, a static `#hint`, and the module `<script>`. | — |
| `src/script.js` | **Controller.** Owns app state, input handling, and wiring. The only module with side effects at load. | — |
| `src/draw.js` | Pure-ish renderer. Draws the fretboard for a given state onto a 2D canvas context. | `drawFretboard` |
| `src/notes.js` | The note data (CGDA natural notes), single source of truth. | `notes` |
| `src/audio.js` | Web Audio synthesis: note → sound. | `getNoteFrequency`, `playNote` |
| `src/spaced-repetition.js` | Weighted note scheduler, decoupled from app state. | `createScheduler` |

Dependency direction (controller depends on the rest; the rest don't depend on
the controller or each other, except `draw.js` → `notes.js`):

```
        index.html
            │ loads
            ▼
         script.js ───────┬─────────┬──────────────┬──────────────┐
        (controller)      │         │              │              │
                          ▼         ▼              ▼              ▼
                       draw.js   audio.js   spaced-repetition.js  notes.js
                          │                                        ▲
                          └────────────────────────────────────────┘
```

## Startup

1. The browser loads `index.html` and hits `<script type="module" src="script.js">`.
2. `script.js` executes top-to-bottom:
   - Imports the four modules.
   - Initialises module-level **state** (see below).
   - `createScheduler(notes.length)` builds the scheduler (seeds each note's
     "last shown" time, staggered).
   - Resolves the canvas and its 2D context (`getElementById` + `getContext`).
   - Defines the controller functions.
   - Registers the `click` and `touchend` listeners on the canvas.
   - Calls `nextQuestion()` — this renders the first question and starts the loop.

There is no resize, keyboard, or network path; the canvas is a fixed 300×500.

## State model

All state lives as module-level variables in `script.js`:

| Variable | Meaning |
|----------|---------|
| `currentNote` | The note currently being asked (a `Note`, or `null` before the first). |
| `showingAnswer` | Whether the current note's name is revealed. |
| `exploreMode` | Whether the board is in "show all notes" mode vs. training mode. |
| `lastTapTime`, `singleTapTimeout` | Bookkeeping for double-tap detection. |

Rendering is a pure function of these: every visible change goes through
`drawFretboard`, which reads the state passed to it. There is no other source
of truth.

## Main path 1 — the training loop

The core practice cycle. A single tap is *delayed* by `DOUBLE_TAP_DELAY`
(200 ms) so a second tap can cancel it and toggle explore mode instead.

```
   startup
      │
      ▼
 ┌─────────────┐   scheduler.next() picks a note (never the current one)
 │ nextQuestion├───────────────────────────────────────────────┐
 └─────┬───────┘                                                │
       │ drawFretboard(currentNote, showingAnswer=false)        │
       │  → red marker, NO label                                │
       ▼                                                        │
   ┌───────────┐                                                │
   │ wait for  │                                                │
   │   tap     │                                                │
   └─────┬─────┘                                                │
         │ handleCanvasClick (after 200 ms, if not a double-tap)│
   ┌─────┴───────────────────────┐                              │
   │                             │                              │
 tap ON the note            tap OFF the note ───────────────────┘
   │                                              (next question)
   ▼
 showAnswer
   • drawFretboard(currentNote, showingAnswer=true) → red marker + label
   • playNote(getNoteFrequency(currentNote))        → hear the pitch
   │
   │ tap again
   ▼
 (ON note → showAnswer again · OFF note → nextQuestion)
```

`scheduler.next(currentIndex)` weights notes by time since last shown, never
returns the current index, and records the chosen note's timestamp.

## Main path 2 — input dispatch (single vs. double tap)

`handleCanvasClick(clientX, clientY)` is the one input entry point, called from
both the `click` (mouse) and `touchend` (touch) listeners. `touchend` calls
`preventDefault` so the browser doesn't also synthesise a `click`.

```
 handleCanvasClick
      │
      ├─ within 200 ms of last tap?  ──► YES ─► clear pending single-tap
      │                                          toggleExploreMode()
      │                                          return
      │
      └─ NO ─► map client coords → canvas coords (getBoundingClientRect + scale)
               │
               ├─ exploreMode?  ──► YES ─► hit-test all notes; if one is hit,
               │                            playNote() immediately, return
               │
               └─ NO (training) ─► if no currentNote, return
                                   hit-test the current note
                                   setTimeout(200 ms):
                                       on-note  → showAnswer()
                                       off-note → nextQuestion()
```

The delayed `setTimeout` in training mode is what makes double-tap possible: a
second tap arriving within 200 ms clears that timeout before it fires.

## Main path 3 — explore mode

```
 (training) ──double-tap──► toggleExploreMode ──► exploreMode = true
                                                  drawExploreMode()
                                                   → drawFretboard(allNotes=notes)
                                                     all notes drawn blue + labelled
        │
        │ single tap on a note → playNote() immediately (no question logic)
        │
 (explore) ──double-tap──► toggleExploreMode ──► exploreMode = false
                                                 drawFretboard(currentNote, showingAnswer)
                                                  → back to the training view, same note
```

## Rendering pipeline — `drawFretboard(ctx, canvas, currentNote, showingAnswer, allNotes?)`

A single render function, called by every path above. It draws in layers:

1. `clearRect` the canvas.
2. Draw the grid: `drawFrets`, `drawNut`, `drawStrings`.
3. Draw faint markers at every natural note (`notes`).
4. If `allNotes` is given (explore mode): draw each note as a blue labelled circle.
5. If `currentNote` is given (training mode): draw a red marker; if
   `showingAnswer`, also draw its label.

`allNotes` and `currentNote` are mutually exclusive in practice — explore mode
passes `allNotes` with `currentNote = null`, training mode the reverse.

## Supporting subsystems

- **Scheduler** (`createScheduler` → `{ next }`): pure selection logic over note
  *indices*, with injectable `now`/`random` for testing. Weights by time since
  last shown (floored so any note can appear), excludes the current index, and
  records the pick. See `spaced-repetition.test.js`.
- **Audio** (`getNoteFrequency`, `playNote`): `getNoteFrequency` is pure pitch
  math (open-string frequency × 2^(fret/12)); `playNote` builds a short-lived
  Web Audio graph (oscillators → gains → low-pass filter → master gain →
  output). The `AudioContext` is created lazily on first playback.

## Quick reference: what triggers what

| User action | Mode | Result |
|-------------|------|--------|
| Tap the highlighted note | Training | `showAnswer` — reveal label + play pitch |
| Tap elsewhere on the board | Training | `nextQuestion` — new note |
| Double-tap anywhere | Either | `toggleExploreMode` |
| Tap a note | Explore | Play that note's pitch (immediately) |
