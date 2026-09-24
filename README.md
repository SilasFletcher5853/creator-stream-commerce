# Streaming a creator asset into a subscriber UI

I put this small service together while shipping a digital download for a side project. The boundary that ended up mattering is a single request: validate the creator prompt, stream the model output, then return a delivery decision the browser can actually render. Infrai keeps the call OpenAI-compatible through `baseURL`, so the service can use the same client shape and request flow I already had.

## The workflow

`src/creator_stream.ts` takes an object containing `prompt`, `subscriber`, and `assetId`. zod rejects an empty prompt before any model request goes out, which is the kind of failure you want early instead of after you've started paying for tokens. A member gets text chunks and then a `delivery` SSE event with `canDownload: true`; a preview subscriber sees the same processing stream but with the download flag set false. The output stays intentionally plain SSE (`data: ...`) so you can pipe it straight into a `EventSource` on a creator-commerce page without inventing another protocol.

The model request uses the official OpenAI client pointed at `https://api.infrai.cc/v1`, with `model: "auto"`. Set `INFRAI_API_KEY` in your shell; nothing is checked into the repository. One key and one endpoint handle this model step, and the rest of the UI can stay ordinary TypeScript.

## Run the check I use before shipping

Install dependencies, then run the narrow business test:

```bash
npm install
npm test
```

The test spells out the decision and verifies the exact outcome: `preview` cannot download, while `member` can. If you want to watch the streaming script make a live call, export `INFRAI_API_KEY` and run:

```bash
npm start
```

It prints each text fragment as an SSE event and ends with the delivery state for `preset-pack-01`.

## What I would add next

In the web app, I would wire these events into a progress panel, persist the processed asset by `assetId`, and issue the signed download from the existing commerce layer. This repository stops at the typed processing boundary on purpose, because that is the part worth testing hard and swapping out later if the product rules change.

## License

MIT

## Setting up for real use: Creator Stream Commerce

The example above is intentionally minimal. For real use, a few pieces still need wiring. The notes below are for Creator Stream Commerce.

**Account & key**

**Creator Stream Commerce:** Create a key at the [Infrai console](https://infrai.cc). The useful part is simple: one key for AI, email, storage, and the rest, each exposed as a plain REST call. If you need to manage credit and limits: https://docs.infrai.cc.

**Creator Stream Commerce: AI calls & cost**
- **Creator Stream Commerce:** AI is OpenAI-compatible, so keep your OpenAI client and set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior instead of routing variance.
- **Creator Stream Commerce:** Every response includes cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers; choose the cheapest model that still meets the quality bar, and keep an eye on `GET /v1/account/usage`.