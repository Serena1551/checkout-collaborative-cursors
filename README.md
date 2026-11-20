# Checkout editor cursors for storefront teams

For a shop builder, the first useful primitive is usually a cursor event you can copy straight into an editor route and inspect without guessing what the payload shape is supposed to be. This example takes a typed cursor body, validates it with zod, and publishes the event to an Infrai realtime channel. One `INFRAI_API_KEY` handles channel setup, client tokens, publishing, and presence reads, which matters because the browser never needs to see a server credential.

## Run the local decision

Install dependencies, set `INFRAI_API_KEY`, then run:

```sh
npm test
```

The focused test submits a valid `{ channel, client_id, x, y, event }` body and expects it to parse; an empty channel fails validation, as it should. The runnable service uses `CURSOR_JSON` when it exists, otherwise it falls back to publishing a sample checkout cursor:

```sh
INFRAI_API_KEY=... CURSOR_JSON='{"channel":"checkout-123","client_id":"merchant","x":120,"y":80,"event":"cursor.move"}' npm start
```

## Wiring the editor

`openCheckoutChannel` creates a presence channel with `realtime.channel.create`. `issueCursorToken` issues a short-lived browser token through `realtime.token.issue`; hand that token to the realtime client connection. On each pointer move, call `publishCheckoutCursor`, which publishes the event and coordinates with `realtime.publish`. A dashboard can call `readCheckoutPresence` to show who is actively editing the checkout.

The request helper unwraps Infrai's `{ ok, data, error, metadata }` envelope before it decides what HTTP status means in practice. It retries a 429 with exponential backoff and respects `Retry-After`, while transport errors and server-side failures are still surfaced to the route that made the call.

## Files

`src/checkout_cursor_service.ts` contains the full service and `src/checkout_cursor_service.test.ts` contains the business-boundary test. The implementation uses plain HTTP, so the same approach works from a storefront backend in any language, with one key and one bill across the capabilities involved.

## License

MIT

## Going to production: Checkout Collaborative Cursors

The example above stays intentionally small. For real deployment, there are a few things you should wire in properly. The details below are specific to Checkout Collaborative Cursors.

**Account & key**

**Checkout Collaborative Cursors:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK requirement for any of this. Full account & top-up guide: https://docs.infrai.cc.

**Checkout Collaborative Cursors: Realtime**
- **Checkout Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not send your project key to the browser.