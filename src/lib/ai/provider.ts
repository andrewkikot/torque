import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AiProvider } from "@/db/schema";
import { providerMeta } from "./providers";
import { appUrl } from "@/lib/app-url";

export type ModelConfig = { provider: AiProvider; model: string; apiKey: string; baseUrl?: string | null };

/** Build an AI SDK language model from a user's own (BYOK) settings. */
export function buildModel({ provider, model, apiKey, baseUrl }: ModelConfig) {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogle({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
    case "openrouter":
      return createOpenAICompatible({
        name: "openrouter",
        apiKey,
        baseURL: baseUrl || providerMeta("openrouter").defaultBaseUrl!,
        headers: { "HTTP-Referer": appUrl(), "X-Title": "Torque" },
      })(model);
    case "openai_compatible":
      if (!baseUrl) throw new Error("Base URL is required");
      return createOpenAICompatible({ name: "custom", apiKey, baseURL: baseUrl })(model);
  }
}
