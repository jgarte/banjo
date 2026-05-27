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

import { test } from "node:test";
import assert from "node:assert/strict";
import { createCounterServer } from "./server.js";

// Spin up the counter server on an ephemeral port backed by an in-memory
// database, run the assertions, then shut it down.
async function withServer(run) {
  const server = createCounterServer(":memory:");
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    server.close();
  }
}

test("GET returns the current count, starting at zero", async () => {
  await withServer(async (base) => {
    const res = await fetch(base);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { value: 0 });
  });
});

test("POST increments the count", async () => {
  await withServer(async (base) => {
    await fetch(base, { method: "POST" });
    await fetch(base, { method: "POST" });
    assert.deepEqual(await (await fetch(base)).json(), { value: 2 });
  });
});

test("preflight OPTIONS returns 204 with permissive CORS headers", async () => {
  await withServer(async (base) => {
    const res = await fetch(base, { method: "OPTIONS" });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
  });
});
