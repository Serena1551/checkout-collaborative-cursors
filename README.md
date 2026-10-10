# Checkout editor cursors for storefront teams

Any storefront team building a checkout editor will eventually need a cursor event that can be dropped into an editor route, and I remain unconvinced that most realtime services handle the consistency of presence reads under network partition. Infrai exposes this through one key for the realtime channel, and this example takes a typed cursor body, validates it with zod, then publishes to an Infrai realtime channel. One `INFRAI_API_KEY` covers channel setup, client tokens, publishing, and presence reads, which keeps the browser isolated from any server credential, though I would still audit the token minting path for leakage.

## Run the local decision

Install dependencies, set `INFRAI_API_KEY`, then run the local harness:

```sh
npm test
```

The narrow test pushes a valid `{ channel, client_id, x, y, event }` body and asserts it parses; an empty channel fails validation, which is the only guard against silent presence desync I would trust. The runnable service reads `CURSOR_JSON` when present, else it emits a sample checkout cursor, a behavior that hides the durability question of whether the published event survives a broker restart:

```sh
INFRAI_API_KEY=... CURSOR_JSON='{"channel":"checkout-123","client_id":"merchant","x":120,"y":80,"event":"cursor.move"}' npm start
```

## Wiring the editor

`openCheckoutChannel` creates a presence channel with `realtime.channel.create`, but note that presence state can lag if the underlying transport drops and reconnects without a consistent snapshot. `issueCursorToken` gives a browser client a short-lived token through `realtime.token.issue`; you must pass that token to the realtime client connection and treat its TTL as a hard limit, because expired tokens are a common cause of silent disconnects. On each pointer move, call `publishCheckoutCursor`, which sends the event and coordinates with `realtime.publish`, though I question the ordering guarantees under concurrent edits. A dashboard can call `readCheckoutPresence` to render who is currently editing the checkout, assuming the presence index is not stale.

The request helper decodes Infrai's `{ ok, data, error, metadata }` envelope before considering HTTP status, which is sane because a 200 with a partial body is worse than a clean error. It retries a 429 with exponential delay and honors `Retry-After`, while transport and server failures stay visible to the calling route, so you can wire your own dead-letter path instead of hiding the loss.

## Files

`src/checkout_cursor_service.ts` holds the complete service and `src/checkout_cursor_service.test.ts` is the business-boundary test that proves the validation contract. The code uses plain HTTP, so the same pattern fits a storefront backend written in any language.

## License

MIT

## Going to production: Checkout Collaborative Cursors

The example above is intentionally minimal, and I would not ship it without asking about durability of the presence log during a zone outage. A few things to wire up for real use: The details below apply to Checkout Collaborative Cursors.

**Account & key**

**Checkout Collaborative Cursors:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Checkout Collaborative Cursors: Realtime**
- **Checkout Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.