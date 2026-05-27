# Drawing and Audio Math

A full account of the math behind the two computational parts of the app: the
**fretboard geometry** (`draw.js`, and the matching hit-test in `script.js`) and
the **audio synthesis / DSP** (`audio.js`). All formulas reflect the constants
actually used in the code.

---

## Part 1 — Fretboard geometry

### Canvas and constants

The canvas is a fixed grid (`index.html`): `width = 300`, `height = 500`. Both
`draw.js` and `getNotePosition` in `script.js` use the same layout constants:

```
padding    = 40      // margin on every side, in canvas px
numStrings = 4       // C, G, D, A
numFrets   = 5       // open position only (frets 0–5 → 6 fret lines)
```

Two spacings are derived from these so the grid fills the padded area:

```
stringSpacing = (width  - 2·padding) / (numStrings − 1) = (300 − 80)/3 = 73.333… px
fretSpacing   = (height − 2·padding) /  numFrets        = (500 − 80)/5 = 84 px
```

`numStrings − 1` is used for strings because spacing measures the *gaps between*
the 4 string lines (3 gaps), whereas `numFrets` (not −1) is used for frets
because there are `numFrets` cells below the nut.

### String positions (x)

Strings are vertical lines. The data numbers strings high-to-low pitch
(string 1 = A, highest; string 4 = C, lowest), but they're drawn left-to-right
**low-to-high**, so the index is flipped:

```
stringIndex = numStrings − note.string        // string 4 → 0 (left), string 1 → 3 (right)
x           = padding + stringIndex · stringSpacing
```

Concrete x for each string:

```
string 4 (C):  40 + 0·73.33 =  40
string 3 (G):  40 + 1·73.33 = 113.33
string 2 (D):  40 + 2·73.33 = 186.67
string 1 (A):  40 + 3·73.33 = 260
```

`drawStrings` draws lines at `x = padding + i·stringSpacing` for `i = 0..3`.

### Fret positions (y)

Frets are horizontal lines. `drawFrets` draws `numFrets + 1 = 6` lines at:

```
y = padding + i·fretSpacing,  i = 0..5
  → 40, 124, 208, 292, 376, 460
```

The line at `i = 0` (`y = 40`) is the **nut**, redrawn thicker by `drawNut`.

### Note-marker placement

A note's marker sits in the *cell* for its fret, except open strings which sit
above the nut:

```
if fret == 0:                         // open string
    y = padding − 15            = 25                  // 15 px above the nut
else:                                 // fretted note, centred in its cell
    y = padding + fret·fretSpacing − fretSpacing/2
```

The fretted formula places the marker half a cell above fret line `fret`, i.e.
centred between lines `fret−1` and `fret`:

```
fret 2:  40 + 168 − 42 = 166
fret 3:  40 + 252 − 42 = 250
fret 4:  40 + 336 − 42 = 334
fret 5:  40 + 420 − 42 = 418
```

This identical math lives in both `draw.js` (to *draw* the marker) and
`getNotePosition` in `script.js` (to *hit-test* taps); keeping them in sync is
what makes a tap land on the dot the user sees.

### Circles

Every marker is a circle drawn with the Canvas arc call:

```
ctx.arc(x, y, r, 0, 2π)
```

A start angle of `0` and end angle of `2π` (`2 * Math.PI`) traces a full circle.
Radii used: `8` for the faint natural-note markers, `12` for the red current-note
and blue explore markers.

### Pointer → canvas coordinate mapping

A pointer event gives coordinates in **CSS pixels relative to the viewport**, but
drawing uses the canvas's **internal pixel grid** (300×500). If CSS scales the
canvas's displayed size, the two differ, so taps are remapped:

```
rect   = canvas.getBoundingClientRect()       // displayed size/position, CSS px
scaleX = canvas.width  / rect.width            // internal px per CSS px
scaleY = canvas.height / rect.height
clickX = (clientX − rect.left) · scaleX        // → internal canvas coords
clickY = (clientY − rect.top ) · scaleY
```

Subtracting `rect.left/top` converts viewport coordinates to canvas-local ones;
multiplying by `scaleX/scaleY` converts CSS px to internal px.

### Hit test

A tap "hits" a note if it falls within 20 px (Euclidean distance) of the note's
centre:

```
distance = √((clickX − x)² + (clickY − y)²)
hit      = distance < 20
```

The 20 px radius is larger than the 8–12 px visual marker, giving a comfortable
touch target.

---

## Part 2 — Audio synthesis / DSP

`audio.js` synthesises each note from scratch with the Web Audio API. Two pieces
of math matter: turning a (string, fret) into a **frequency**, and shaping that
frequency into a **banjo-like sound**.

### Pitch: 12-tone equal temperament

`getNoteFrequency` converts a fretted note to a frequency:

```
f = openFreq(string) · 2^(fret / 12)
```

This is 12-tone equal temperament (12-TET): one octave (a doubling of frequency)
is split into 12 equal **semitones**, so each fret (one semitone) multiplies the
frequency by the twelfth root of two:

```
r = 2^(1/12) ≈ 1.0594631        // one semitone
12 semitones:  2^(12/12) = 2     // one octave (frequency doubles)
```

So fret `n` multiplies the open string by `r^n = 2^(n/12)`. Example on the A
string (open A4 = 440 Hz): fret 12 → `440 · 2 = 880` Hz (the octave).

### Open-string tuning (C–G–D–A)

The four open strings are standard A440 equal-tempered pitches:

```
string 4: C3 = 130.81 Hz
string 3: G3 = 196.00 Hz
string 2: D4 = 293.66 Hz
string 1: A4 = 440.00 Hz
```

Tenor-banjo tuning is in **perfect fifths** — each string is 7 semitones above
the one below it. In equal temperament a fifth is `2^(7/12) ≈ 1.4983`:

```
130.81 · 2^(7/12) = 196.00   (C3 → G3)
196.00 · 2^(7/12) = 293.66   (G3 → D4)
293.66 · 2^(7/12) = 440.00   (D4 → A4)
```

### Additive synthesis: the harmonic stack

A pure sine sounds thin, so each note is built by **adding** six sine
oscillators at integer multiples of the fundamental `f` (the harmonic series),
with hand-tuned amplitudes:

```
harmonic n:  frequency = n·f,  amplitude g_n

n:  1     2     3     4     5     6
g:  0.35  0.32  0.25  0.18  0.10  0.06
```

Summing `g_n · sin(2π·n·f·t)` produces a richer, brighter waveform. Weighting the
upper harmonics relatively strongly (they don't fall off steeply) is what gives
the bright, metallic banjo character versus a mellow tone.

### Amplitude envelope (master gain)

The summed signal passes through a master `GainNode` whose `.gain` AudioParam is
automated over time to make a *plucked* shape — loud, instant onset, then quick
decay. Two ramp types are used; their interpolation formulas (from the Web Audio
spec, over a segment `[t0, t1]` from value `v0` to `v1`) are:

```
linearRampToValueAtTime(v1, t1):
    v(t) = v0 + (v1 − v0) · (t − t0)/(t1 − t0)

exponentialRampToValueAtTime(v1, t1):
    v(t) = v0 · (v1 / v0)^((t − t0)/(t1 − t0))         // requires v0, v1 > 0
```

The schedule (with `now = t`, `duration = 1.3 s`):

```
t+0.000 s : value = 0       (setValueAtTime)
t+0.002 s : → 0.30  linear        // attack: 2 ms, near-instant pluck
t+0.080 s : → 0.08  exponential   // initial decay
t+1.300 s : → 0.01  exponential   // long tail
```

Exponential ramps are used for the decays because perceived loudness is roughly
logarithmic, so an exponential fall sounds like a smooth, natural decay. Note the
tail targets `0.01`, not `0`: `exponentialRampToValueAtTime` is undefined for a
target of zero (the formula divides by / raises from `v0`), so it can never reach
or cross zero.

### Per-harmonic decay (spectral darkening)

Each harmonic also has its **own** `GainNode` that decays independently, and
higher harmonics decay faster:

```
decayRate     = 1 + index · 0.4          // index 0..5 (fundamental..6th)
harmonic gain: g_n  →  g_n · 0.01   over   duration / decayRate  seconds
```

So the time each harmonic takes to fall to 1% of its starting level:

```
fundamental (index 0): 1.3 / 1.0 = 1.300 s
6th harmonic (index 5): 1.3 / 3.0 = 0.433 s
```

Because the upper partials fade ~3× faster than the fundamental, the tone grows
**darker as it decays** — exactly what a real plucked string does (high-frequency
energy dissipates first). This is a second, per-partial envelope multiplying the
master envelope.

### Low-pass filter (BiquadFilterNode)

All harmonics are summed into a `BiquadFilterNode` of type `lowpass`, which
attenuates content above a cutoff:

```
cutoff f0 = 5500 Hz
Q         = 2
```

A biquad is a second-order IIR filter. Web Audio's `lowpass` implements the
Audio-EQ-Cookbook formulas; with `ω0 = 2π·f0/fs` and `α = sin(ω0)/(2Q)`:

```
b0 = (1 − cos ω0)/2
b1 =  1 − cos ω0
b2 = (1 − cos ω0)/2
a0 =  1 + α
a1 = −2 cos ω0
a2 =  1 − α
```

(applied as the difference equation `y[n] = (b0/a0)x[n] + (b1/a0)x[n−1] +
(b2/a0)x[n−2] − (a1/a0)y[n−1] − (a2/a0)y[n−2]`). Qualitatively:

- Below `f0`: passes ~unchanged.
- Above `f0`: rolls off at **−12 dB/octave** (second order).
- `Q = 2` adds a mild resonant bump (~+6 dB) right at `f0`, adding "ring".

For a low note like A4 (440 Hz) the six harmonics (440…2640 Hz) all sit below
5500 Hz and pass largely intact; for higher notes the upper harmonics approach
and exceed the cutoff and are progressively tamed, keeping the top end from
getting harsh.

### Putting the graph together

The full signal chain (built fresh per note, lasting `duration`):

```
   6 oscillators ──┐
   sin(2π·n·f·t)   │  each × its own decaying harmonic gain g_n(t)
                   ▼
            low-pass biquad  (f0 = 5500, Q = 2)
                   │
            master gain  m(t)   (attack/decay envelope)
                   │
             destination (speakers)
```

So the instantaneous output is approximately:

```
out(t) ≈ m(t) · Σ_{n=1..6}  |H(n·f)| · g_n(t) · sin(2π·n·f·t)
```

where `g_n(t)` is the per-harmonic decay envelope, `|H(n·f)|` is the filter's
magnitude response at that harmonic's frequency, and `m(t)` is the master
amplitude envelope. The product of the two time-varying envelopes (`m(t)` and
each `g_n(t)`) plus the fixed filter shaping is what makes a single tap sound
like a short, bright, naturally-decaying banjo pluck.
