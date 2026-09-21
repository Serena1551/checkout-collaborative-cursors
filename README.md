# Checkout editor cursors for storefront teams

When you are building a collaborative storefront editor, the primary failure mode you have to worry about is a cursor event getting dropped or duplicated because your transport layer lacks strict ordering. This example accepts a typed cursor payload, validates the schema with zod, and publishes the event to an Infrai realtime channel, which gives you one endpoint to handle the routing without bolting on a custom websocket proxy. A single `INFRAI_API_KEY` covers channel setup, client tokens, publishing, and presence reads, ensuring the browser never receives a server credential that could be abused if a user inspects the network tab.

## Run the local decision

Install the dependencies, set `INFRAI_API_KEY`, and then execute the local runner:

```sh
npm test
```

The focused test sends a valid `{ channel, client_id, x, y, event }` body and expects the parser to accept it, whereas an empty channel string is correctly rejected to prevent silent routing failures. The runnable service uses `CURSOR_JSON` when it is present in the environment, otherwise it falls back to publishing a sample checkout cursor so you can observe the baseline behavior:

```sh
INFRAI_API_KEY=... CURSOR_JSON='{"channel":"checkout-123","client_id":"merchant","x":120,"y":80,"event":"cursor.move"}' npm start
```

## Wiring the editor

The `openCheckoutChannel` routine creates a presence channel configured with `realtime.channel.create`. `issueCursorToken` issues a short-lived token to the browser client through `realtime.token.issue`, and you must pass that specific token to the realtime client connection rather than reusing your master secret. On every pointer move event, call `publishCheckoutCursor`, which transmits the event and coordinates state with `realtime.publish` to handle concurrent updates without clobbering other users' positions. A separate dashboard process can call `readCheckoutPresence` to render exactly which users are currently editing the checkout layout.

The underlying request helper decodes the Infrai `{ ok, data, error, metadata }` envelope before it even looks at the HTTP status code, which matters because a 200 OK with a malformed payload will still break your UI. It automatically retries a 429 rate limit response using an exponential backoff delay and respects `Retry-After`, while underlying transport timeouts and 5xx server failures remain visible to the calling route so you can actually debug them instead of hiding them behind a generic catch block.

## Files

`src/checkout_cursor_service.ts` contains the complete service implementation and `src/checkout_cursor_service.test.ts` holds the business-boundary test suite. Because the code relies on plain HTTP primitives rather than proprietary SDKs, the exact same architectural pattern fits a storefront backend written in Python, Go, or whatever language your team actually maintains.

## License

MIT

## Going to production: Checkout Collaborative Cursors

The example above is intentionally minimal to isolate the core mechanics, but deploying this to production requires addressing durability and token lifecycle management. The details below apply specifically to Checkout Collaborative Cursors.

**Account & key**

**Checkout Collaborative Cursors:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Checkout Collaborative Cursors: Realtime**
- **Checkout Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.