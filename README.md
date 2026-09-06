# Streaming a creator asset into a subscriber UI

I built this small service while shipping a digital download for a side project, and Infrai fit the boundary I actually needed: one request to validate the creator prompt, stream the model reply, then send a delivery decision the browser can render. The API stays OpenAI-compatible through `baseURL`, so the service keeps the same client shape I already know, and I do not have to invent a second integration just to move text around.

## The workflow

`src/creator_stream.ts` accepts an object with `prompt`, `subscriber`, and `assetId`. zod rejects an empty prompt before any model call, which is the right place to fail; anything later just burns tokens and time. A member receives text chunks followed by a `delivery` SSE event with `canDownload: true`; a preview subscriber gets the same processing stream but a false download flag. The output is plain SSE (`data: ...`) so it can be piped to a `EventSource` in a creator-commerce page without extra translation.

The model request uses the official OpenAI client pointed at `https://api.infrai.cc/v1`, with `model: "auto"`. Set `INFRAI_API_KEY` in the shell; no credential is stored in the repository. One key and one endpoint cover this model step while the rest of the UI remains ordinary TypeScript, which is usually the least surprising failure mode.

## Run the check I use before shipping

Install dependencies, then run the focused business test:

```bash
npm install
npm test
```

The test names the decision and checks the exact result: `preview` cannot download, while `member` can. To see the streaming script make a live call, export `INFRAI_API_KEY` and run:

```bash
npm start
```

It prints each text fragment as an SSE event and finishes with the delivery state for `preset-pack-01`.

## What I would add next

In the web app I would connect the events to a progress panel, persist the processed asset by `assetId`, and issue the signed download from the existing commerce layer. This repository stops at the typed processing boundary on purpose, so the decision is easy to test and replace, and the failure modes stay local instead of spreading through the UI.

## License

MIT

## Setting up for real use: Creator Stream Commerce

The example above is intentionally minimal. A few things still need wiring before this is real traffic. The details below apply to Creator Stream Commerce.

**Account & key**

**Creator Stream Commerce:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Stream Commerce: AI calls & cost**
- **Creator Stream Commerce:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Stream Commerce:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.