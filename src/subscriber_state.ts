export type SubscriberState = "preview" | "member";

export type DeliveryDecision = {
  state: SubscriberState;
  canDownload: boolean;
  notice: string;
};

export function decideDelivery(state: SubscriberState): DeliveryDecision {
  if (state === "member") {
    return { state, canDownload: true, notice: "Member delivery unlocked" };
  }
  return { state, canDownload: false, notice: "Preview stream only" };
}
