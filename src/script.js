// banjo
// Copyright (C) 2026 jgart
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { drawFretboard } from "./draw.js";
import { notes } from "./notes.js";
import { getNoteFrequency, playNote } from "./audio.js";
import { createCounter } from "./counter.js";
import { createScheduler } from "./spaced-repetition.js";

let currentNote = null;
let showingAnswer = false;
let exploreMode = false; // Toggle to show all notes

// Double-tap/click detection
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 200; // milliseconds
let singleTapTimeout = null;

// Global practice counter backend (see server.js). Point the URL at your
// deployed endpoint in production.
const counter = createCounter(
  "http://localhost:8787",
  document.getElementById("count"),
);
counter.refresh();

// Spaced-repetition scheduler over the note set.
const scheduler = createScheduler(notes.length);

const canvas = document.getElementById("fretboard");
const ctx = canvas.getContext("2d");

function nextQuestion() {
  const currentIndex = currentNote ? notes.indexOf(currentNote) : -1;
  currentNote = notes[scheduler.next(currentIndex)];
  showingAnswer = false;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);
}

function showAnswer() {
  showingAnswer = true;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);

  // Play the note
  playNote(getNoteFrequency(currentNote));

  // Count this as one practiced note in the global tally.
  counter.record();
}

// Calculate note position on canvas
function getNotePosition(note) {
  const padding = 40;
  const numStrings = 4;
  const numFrets = 5;
  const stringSpacing = (canvas.width - 2 * padding) / (numStrings - 1);
  const fretSpacing = (canvas.height - 2 * padding) / numFrets;

  const stringIndex = numStrings - note.string;
  const fretIndex = note.fret;

  const x = padding + stringIndex * stringSpacing;
  let y;

  if (fretIndex === 0) {
    y = padding - 15;
  } else {
    y = padding + fretIndex * fretSpacing - fretSpacing / 2;
  }

  return { x, y };
}

// Handle canvas click/touch
function handleCanvasClick(clientX, clientY) {
  const currentTime = Date.now();
  const timeSinceLastTap = currentTime - lastTapTime;

  // Check for double tap
  if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
    // Clear any pending single-tap action
    if (singleTapTimeout) {
      clearTimeout(singleTapTimeout);
      singleTapTimeout = null;
    }
    toggleExploreMode();
    lastTapTime = 0; // Reset to prevent triple-tap
    return;
  }

  lastTapTime = currentTime;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  if (exploreMode) {
    // In explore mode, check if any note was clicked (immediate, no delay)
    for (const note of notes) {
      const notePos = getNotePosition(note);
      const distance = Math.sqrt(
        Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
      );

      if (distance < 20) {
        playNote(getNoteFrequency(note));
        return;
      }
    }
  } else {
    // Normal training mode - delay action to detect potential double-tap
    if (!currentNote) return;

    const notePos = getNotePosition(currentNote);
    const distance = Math.sqrt(
      Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
    );

    // Delay the action to allow double-tap detection
    singleTapTimeout = setTimeout(() => {
      if (distance < 20) {
        showAnswer();
      } else {
        nextQuestion();
      }
      singleTapTimeout = null;
    }, DOUBLE_TAP_DELAY);
  }
}

function toggleExploreMode() {
  exploreMode = !exploreMode;
  if (exploreMode) {
    drawExploreMode();
  } else {
    // Return to training mode with the same note
    drawFretboard(ctx, canvas, currentNote, showingAnswer);
  }
}

function drawExploreMode() {
  drawFretboard(ctx, canvas, null, false, notes);
}

// Add click/touch event listeners
canvas.addEventListener("click", (e) => {
  handleCanvasClick(e.clientX, e.clientY);
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleCanvasClick(touch.clientX, touch.clientY);
});

nextQuestion();
