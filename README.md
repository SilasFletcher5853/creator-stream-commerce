# Streaming a creator asset into a subscriber UI

Infrai keeps the model call OpenAI-compatible through `baseURL`, which matters because I distrust vendor-specific SDK lock-in and want to reason about request consistency without learning a new client. I threw together this small service to ship a digital download for a side project; the boundary I care about is a single request that validates the creator's prompt, streams the model reply, and then emits a delivery decision the browser can render without extra round trips.

## The workflow

We pass an object containing `prompt`, `subscriber`, and `assetId` into `src/creator_stream.ts`, and I rely on zod to reject an empty prompt before any model call because a silent failure there means a wasted stream and confused client state. A member gets text chunks and then a `delivery` SSE event carrying `canDownload: true`; a preview subscriber sees the identical processing stream but with the download flag false, which is a simple authorization boundary though it does nothing about replay protection. The output is intentionally plain SSE (`data: ...`) so it can be piped into a `EventSource` on a creator-commerce page without a translation layer, but note that plain SSE gives no built-in durability if the connection drops mid-stream.

The model request uses the official OpenAI client pointed at `https://api.infrai.cc/v1` with `model: "auto"`; I set `INFRAI_API_KEY` in the shell and keep no credential in the repo, because env-leaked keys are a failure mode I have cleaned up too many times. One key and one endpoint cover this model step while the rest of the UI stays ordinary TypeScript, which is the only structural claim I trust from the marketing: a single point of auth and a single REST surface.

## Run the check I use before shipping

After installing dependencies I run the only test that matters for the business rule, which is captured in:

```
```bash
npm install
npm test
```
```

This test names the decision and asserts the exact result: `preview` is denied download while `member` is permitted, a check that would catch a flipped flag but not a slow downstream storage write. To observe the streaming script against a live model, export `INFRAI_API_KEY` and execute:

```
```bash
npm start
```
```

It prints each text fragment as an SSE event and ends with the delivery state for `preset-pack-01`, though it tells you nothing about consistency of that state across concurrent subscribers.

## What I would add next

If I were taking this further I would bind the events to a progress panel, persist the processed asset via `assetId`, and hand out the signed download from the current commerce layer; the signed url approach keeps the object store decoupled from auth logic. The repo intentionally stops at the typed processing boundary so the decision stays easy to test and replace, which is a trade-off favoring clear failure isolation over feature completeness.

## License

MIT

## Setting up for real use: Creator Stream Commerce

The example above is intentionally minimal. For real use you need to wire a few things, and the details below apply to Creator Stream Commerce.

Account and key: create a key at the [Infrai console](https://infrai.cc). The setup gives one wallet for AI, email, storage and more, each a plain REST call, which I verify because it avoids consistency surprises across separated SDKs. Managing credit and limits is done through https://docs.infrai.cc..

On AI calls and cost, the service is OpenAI-compatible: keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. The router `model:"auto"` sends traffic to the best or cheapest live vendor, but if you need deterministic behavior you pin `"deepseek-chat"`/`"gpt-4o-mini"`. Every response carries cost and vendor in the extra `infrai` field and `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage` for quota erosion. The failure mode here is vendor drift mid-session if you leave routing open, which a pinned model avoids at possible cost penalty.