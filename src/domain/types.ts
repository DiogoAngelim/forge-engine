export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface EventEnvelope {
  appId: string;
  userId: string;
  eventType: string;
  metadata?: JsonObject;
  occurredAt?: string;
  idempotencyKey: string;
  payloadHash: string;
}

export interface RewardGrant {
  trackAwards: Record<string, number>;
  currencyAwards: Record<string, number>;
  matchedRuleIds: string[];
  metadata: JsonObject;
}
