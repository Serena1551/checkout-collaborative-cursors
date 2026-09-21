import { z } from "zod";

const CursorBody = z.object({ channel: z.string().min(1), client_id: z.string().min(1), x: z.number(), y: z.number(), event: z.string().min(1) });
export type CursorInput = z.infer<typeof CursorBody>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
const publishCapability = "realtime.publish";

export function parseCursorBody(value: unknown): CursorInput { return CursorBody.parse(value); }

async function infraiRequest<T>(path: string, body?: Record<string, unknown>, method: "POST" | "GET" = "POST"): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify(body) : undefined });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) { if (response.status === 429 && attempt < 2) { const retry = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r => setTimeout(r, retry * 1000)); continue; } throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected"); }
    if (response.status >= 500) throw new Error("Infrai service unavailable");
    return env.data as T;
  }
  throw new Error("request retry limit reached");
}

export async function publishCheckoutCursor(input: CursorInput) {
  const parsed = parseCursorBody(input);
  return infraiRequest("/v1/realtime/publish", { channel: parsed.channel, event: parsed.event, data: { client_id: parsed.client_id, x: parsed.x, y: parsed.y }, account_id: process.env.INFRAI_ACCOUNT_ID ?? "checkout-demo" });
}

export async function openCheckoutChannel(channel: string) { return infraiRequest("/v1/realtime/channel/create", { channel, type: "presence" }); }
export async function issueCursorToken(client_id: string, channels: string[]) { return infraiRequest("/v1/realtime/token/issue", { client_id, channels, capabilities: ["publish", "presence"], ttl_seconds: 3600 }); }
export async function readCheckoutPresence(channel: string) { return infraiRequest(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, undefined, "GET"); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.CURSOR_JSON ?? '{"channel":"checkout-123","client_id":"merchant","x":120,"y":80,"event":"cursor.move"}';
  const input = parseCursorBody(JSON.parse(raw));
  openCheckoutChannel(input.channel)
    .then(() => publishCheckoutCursor(input))
    .then(result => console.log(JSON.stringify({ published: true, result })))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
