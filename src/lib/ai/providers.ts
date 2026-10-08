import type { AiProvider } from "@/db/schema";

export type ProviderMeta = {
  id: AiProvider;
  label: string;
  defaultModel: string;
  models: string[];
  keyUrl: string;
  keyPlaceholder: string;
  freeTier: boolean;
  needsBaseUrl?: boolean;
  defaultBaseUrl?: string;
};

/** Shared with the client (no secrets). */
export const PROVIDERS: ProviderMeta[] = [
  {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-3.8-flash",
    models: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"],
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza…",
    freeTier: true,
  },
  {
    id: "groq",
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct-0905"],
    keyUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_…",
    freeTier: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-oss-20b:free",
    models: ["openai/gpt-oss-20b:free", "meta-llama/llama-3.3-70b-instruct:free", "anthropic/claude-haiku-4.5"],
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-…",
    freeTier: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    defaultModel: "claude-haiku-4-5",
    models: ["claude-haiku-4-5", "claude-sonnet-5-5", "claude-opus-5-5"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-…",
    freeTier: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    models: ["gpt-5.4-mini", "gpt-5-mini", "gpt-4.1-mini"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
    freeTier: false,
  },
  {
    id: "openai_compatible",
    label: "OpenAI-compatible",
    defaultModel: "",
    models: [],
    keyUrl: "",
    keyPlaceholder: "API key",
    freeTier: false,
    needsBaseUrl: true,
  },
];

export const providerMeta = (id: AiProvider) => PROVIDERS.find((p) => p.id === id)!;
