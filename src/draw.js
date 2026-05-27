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

export function drawFrets(ctx, canvas, config) {
  // Draw frets (horizontal lines)
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  for (let i = 0; i <= config.numFrets; i++) {
    const y = config.padding + i * config.fretSpacing;
    ctx.beginPath();
    ctx.moveTo(config.padding, y);
    ctx.lineTo(canvas.width - config.padding, y);
    ctx.stroke();
  }
}

export function drawNut(ctx, canvas, config) {
  // Draw nut (first fret thicker)
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(config.padding, config.padding);
  ctx.lineTo(canvas.width - config.padding, config.padding);
  ctx.stroke();
}

export function drawStrings(ctx, canvas, config) {
  // Draw strings (vertical lines)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  for (let i = 0; i < config.numStrings; i++) {
    const x = config.padding + i * config.stringSpacing;
    ctx.beginPath();
    ctx.moveTo(x, config.padding);
    ctx.lineTo(x, canvas.height - config.padding);
    ctx.stroke();
  }
}

export function drawFretboard(
  ctx,
  canvas,
  currentNote,
  showingAnswer,
  allNotes = null,
) {
  const config = {
    padding: 40,
    numStrings: 4,
    numFrets: 5,
    stringSpacing: 0,
    fretSpacing: 0,
  };

  config.stringSpacing =
    (canvas.width - 2 * config.padding) / (config.numStrings - 1);
  config.fretSpacing = (canvas.height - 2 * config.padding) / config.numFrets;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawFrets(ctx, canvas, config);
  drawNut(ctx, canvas, config);
  drawStrings(ctx, canvas, config);

  // Draw natural note markers (C-G-D-A tuning)
  // String 4 (C): frets 0, 2, 4, 5
  // String 3 (G): frets 0, 2, 4, 5
  // String 2 (D): frets 0, 2, 3, 5
  // String 1 (A): frets 0, 2, 3, 5
  const naturalNotes = [
    { string: 4, fret: 0 },
    { string: 4, fret: 2 },
    { string: 4, fret: 4 },
    { string: 4, fret: 5 },
    { string: 3, fret: 0 },
    { string: 3, fret: 2 },
    { string: 3, fret: 4 },
    { string: 3, fret: 5 },
    { string: 2, fret: 0 },
    { string: 2, fret: 2 },
    { string: 2, fret: 3 },
    { string: 2, fret: 5 },
    { string: 1, fret: 0 },
    { string: 1, fret: 2 },
    { string: 1, fret: 3 },
    { string: 1, fret: 5 },
  ];

  naturalNotes.forEach((note) => {
    const stringIndex = config.numStrings - note.string;
    const fretIndex = note.fret;

    let x = config.padding + stringIndex * config.stringSpacing;
    let y;

    if (fretIndex === 0) {
      // Position open string markers above the nut (hollow circles)
      y = config.padding - 15;
      ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      // Fretted notes (filled circles)
      y =
        config.padding +
        fretIndex * config.fretSpacing -
        config.fretSpacing / 2;
      ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // Explore mode: show all notes
  if (allNotes) {
    allNotes.forEach((note) => {
      const stringIndex = config.numStrings - note.string;
      const fretIndex = note.fret;

      let x, y;
      x = config.padding + stringIndex * config.stringSpacing;

      if (fretIndex === 0) {
        y = config.padding - 15;
      } else {
        y =
          config.padding +
          fretIndex * config.fretSpacing -
          config.fretSpacing / 2;
      }

      // Draw circle at position with different color
      ctx.fillStyle = "#4A90E2";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Always show note name in explore mode
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(note.note, x, y + 5);
    });
  }

  // Highlight current position (training mode)
  if (currentNote) {
    const stringIndex = config.numStrings - currentNote.string;
    const fretIndex = currentNote.fret;

    let x, y;
    x = config.padding + stringIndex * config.stringSpacing;

    if (fretIndex === 0) {
      y = config.padding - 15;
    } else {
      y =
        config.padding +
        fretIndex * config.fretSpacing -
        config.fretSpacing / 2;
    }

    // Draw circle at position
    ctx.fillStyle = "#FF6B6B";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fill();

    // If showing answer, display note name
    if (showingAnswer) {
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentNote.note, x, y + 5);
    }
  }
}
