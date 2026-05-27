import { test } from "node:test";
import assert from "node:assert/strict";
import { createCounter } from "./src/counter.js";

const fakeElement = () => ({ textContent: "" });
const respondWith = (value) => async () => ({ json: async () => ({ value }) });

test("refresh renders the current count from the backend", async () => {
  const el = fakeElement();
  const counter = createCounter("/api", el, respondWith(7));
  await counter.refresh();
  assert.equal(el.textContent, "7 notes shown");
});

test("record POSTs and renders the updated count", async () => {
  const el = fakeElement();
  let method;
  const fetchImpl = async (_url, opts) => {
    method = opts?.method;
    return { json: async () => ({ value: 8 }) };
  };
  const counter = createCounter("/api", el, fetchImpl);
  await counter.record();
  assert.equal(method, "POST");
  assert.equal(el.textContent, "8 notes shown");
});

test("stays silent when the backend is unavailable", async () => {
  const el = fakeElement();
  const failing = async () => {
    throw new Error("backend down");
  };
  const counter = createCounter("/api", el, failing);
  await counter.refresh(); // must not throw
  assert.equal(el.textContent, "");
});
