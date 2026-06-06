import "@testing-library/jest-dom";

// Polyfill crypto.randomUUID for jsdom
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  Object.defineProperty(crypto, "randomUUID", {
    value: () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    writable: false,
  });
}
