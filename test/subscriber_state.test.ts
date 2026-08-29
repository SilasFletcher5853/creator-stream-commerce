import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery } from "../src/subscriber_state.js";

test("preview subscribers receive stream text but cannot download the asset", () => {
  assert.deepEqual(decideDelivery("preview"), {
    state: "preview",
    canDownload: false,
    notice: "Preview stream only"
  });
});

test("members get the delivery handoff after processing", () => {
  assert.equal(decideDelivery("member").canDownload, true);
});
