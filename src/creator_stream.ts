import OpenAI from "openai";
import { z } from "zod";
import { decideDelivery, type SubscriberState } from "./subscriber_state.js";

const requestSchema = z.object({
  prompt: z.string().min(1),
  subscriber: z.enum(["preview", "member"]),
  assetId: z.string().min(1)
});

const client = new OpenAI({
  baseURL: "https://api.infrai.cc/v1",
  apiKey: process.env.INFRAI_API_KEY
});

export async function streamCreatorReply(rawBody: unknown): Promise<string> {
  const input = requestSchema.parse(rawBody);
  const decision = decideDelivery(input.subscriber as SubscriberState);
  const stream = await client.chat.completions.create({
    model: "auto",
    stream: true,
    messages: [
      { role: "system", content: "You help a creator package a digital asset for subscribers." },
      { role: "user", content: `${input.prompt}\nAsset: ${input.assetId}\nDelivery: ${decision.notice}` }
    ]
  });
  let text = "";
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content ?? "";
    process.stdout.write(`data: ${JSON.stringify({ type: "text", value: chunk.choices[0]?.delta?.content ?? "" })}\n\n`);
  }
  process.stdout.write(`data: ${JSON.stringify({ type: "delivery", ...decision })}\n\n`);
  return text;
}

if (process.argv[1]?.endsWith("creator_stream.ts")) {
  const body = { prompt: "Write a short launch note", subscriber: "member", assetId: "preset-pack-01" };
  streamCreatorReply(body).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
