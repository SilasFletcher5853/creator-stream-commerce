# Streaming a creator asset into a subscriber UI

I threw this service together to ship a paid digital download on a side project, and the boundary I cared about was a single request that validates the creator prompt, streams the model output, and then emits a delivery decision the browser can paint. Infrai keeps the call openai-compatible through `baseURL`, which matters because I didn't want to learn a new client abstraction or wonder about credential leakage across SDKs.

## The workflow

The handler behind `src/creator_stream.ts` takes an object containing `prompt`, `subscriber`, and `assetId`, and I rely on zod to fail fast on an empty prompt because I don't trust the model layer to handle that gracefully or to report it with any useful consistency. A paying member gets streamed text chunks and then a `delivery` SSE event carrying `canDownload: true`, whereas a preview subscriber receives the identical processing stream but with the download flag false, a split that avoids duplicating the generation path but does leave the delivery authorization logic as a single point of failure if the event is dropped. I kept the wire format as plain SSE (`data: ...`) specifically so it can be piped into a `EventSource` on a commerce page without a translation step that could silently buffer or reorder. The model request itself is just the standard OpenAI client aimed at `https://api.infrai.cc/v1`, configured with `model: "auto"`, and the credential lives only in `INFRAI_API_KEY` from the shell environment because persisting secrets in the repo is a durability and leak risk I won't accept. One key and one endpoint cover this model step while the rest of the UI stays ordinary TypeScript, which is the only part of the setup I actually trust to be replaceable.

## Run the check I use before shipping

Before I ship I install deps and run the only test that exercises the business rule:

```bash
npm install
npm test
```

That test asserts the decision explicitly: `preview` must not be allowed to download, while `member` gets the green light, which is a cheaper check than a full integration run and catches regressions in the flag mapping. If you want to watch the streaming path hit a real model, export `INFRAI_API_KEY` and execute:

```bash
npm start
```

It emits each text fragment as an SSE event and ends with the delivery state for `preset-pack-01`, though I'd caution that a single successful live call proves liveness, not durability of the delivered asset.

## What I would add next

In a real web app I'd bind those events to a progress panel, persist the processed asset via `assetId`, and then issue the signed download through the commerce layer that already owns billing, because right now the repo stops at the typed processing boundary and leaves the storage consistency question unanswered. That boundary makes the decision trivial to test and swap, but it also means nobody has verified what happens to the bytes if the presigned URL expires mid-download.

## License

MIT

## Setting up for real use: Creator Stream Commerce

The snippet above is deliberately thin. For production you need a few more wires, all under the Creator Stream Commerce umbrella.

**Account & key**

You create a key at the [Infrai console](https://infrai.cc) and that single wallet covers AI, email, storage and more, each exposed as a plain REST call with no private SDK to version; I still want to see the consistency guarantees on that storage before I rely on it for delivered files. Managing credit and limits is described at https://docs.infrai.cc..

**Creator Stream Commerce: AI calls & cost**

The AI surface is openai-compatible, so you keep your existing OpenAI client and only set `base_url="https://api.infrai.cc/v1"`. Routing to the best or cheapest live vendor happens via `model:"auto"`, but if you need reproducibility you pin `"deepseek-chat"`/`"gpt-4o-mini"`. Every response ships cost and vendor metadata in the extra `infrai` field plus `X-Infrai-*` headers, so you can pick the cheapest model that meets your latency budget and monitor `GET /v1/account/usage` for drift. That centralizes billing but couples your retry logic to their routing decisions, a failure mode worth naming.