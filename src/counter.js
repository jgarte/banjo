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

// Client for the global practice counter backend (see server.js). GET reads
// the count, POST increments it; both render into the given element and stay
// silent if the backend is unreachable. fetch is injectable for testing.
export function createCounter(apiUrl, element, fetchImpl = fetch) {
  function render(value) {
    element.textContent = `${value} notes shown`;
  }

  function refresh() {
    return fetchImpl(apiUrl)
      .then((res) => res.json())
      .then(({ value }) => render(value))
      .catch(() => {});
  }

  function record() {
    return fetchImpl(apiUrl, { method: "POST" })
      .then((res) => res.json())
      .then(({ value }) => render(value))
      .catch(() => {});
  }

  return { refresh, record };
}
