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

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

// A single global counter: how many notes have been practiced across all
// learners. GET reads it, POST increments it. The state is one row in a
// SQLite file so it survives restarts.
export function createCounterServer(dbPath = "counter.db") {
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE IF NOT EXISTS counter(name TEXT PRIMARY KEY, value INTEGER)");
  db.exec("INSERT OR IGNORE INTO counter(name, value) VALUES('notes', 0)");

  const increment = db.prepare("UPDATE counter SET value = value + 1 WHERE name = 'notes'");
  const read = db.prepare("SELECT value FROM counter WHERE name = 'notes'");

  return createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "POST") increment.run();
    res.end(JSON.stringify({ value: read.get().value }));
  });
}

// When run directly (not imported by tests), start listening.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787;
  createCounterServer(process.env.DB_PATH).listen(port, () => {
    console.log(`counter listening on http://localhost:${port}`);
  });
}
