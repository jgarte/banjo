# banjo

[![builds.sr.ht status](https://builds.sr.ht/~whereiseveryone/requinto.svg)](https://builds.sr.ht/~whereiseveryone/requinto?)

web app for training note recognition in open position on the tenor banjo

https://requinto.whereis.social/

the tenor banjo is a four string instrument tuned in fifths (C-G-D-A),
used in irish and jazz musics

## features

- visual fretboard with interactive note practice
- audio playback with a bright banjo string sound
- mobile-friendly responsive design
- vanilla js and css
- property-based tests check all note/state combinations
- double tap fretboard to display all notes, then tap a note to hear it

## documentation

- [control flow map](docs/control-flow.md) — module map, startup, state, and the main user paths
- [drawing and audio math](docs/drawing-and-audio-math.md) — fretboard geometry and audio synthesis/DSP math

## todos

- look up an explanation or paper on spaced repetition

specifically, i want to show a note less often if the learner gets
it right consistently, and more often if they tend to struggle to
remember it

## license

agpl-3.0-or-later
