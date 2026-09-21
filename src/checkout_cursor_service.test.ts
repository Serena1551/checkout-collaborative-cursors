import assert from "node:assert/strict";
import { parseCursorBody } from "./checkout_cursor_service.js";

const valid = parseCursorBody({ channel: "cart-editor", client_id: "staff-7", x: 10, y: 22, event: "cursor.move" });
assert.equal(valid.channel, "cart-editor");
assert.throws(() => parseCursorBody({ channel: "", client_id: "staff-7", x: 10, y: 22, event: "cursor.move" }));
console.log("cursor input policy passed");
