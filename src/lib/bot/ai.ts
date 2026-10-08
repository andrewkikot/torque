import "server-only";
import { generateText, isStepCount, type ModelMessage, type UserContent } from "ai";
import { getUserModel, providerErrorMessage } from "@/lib/services/ai-settings";
import { buildTools, approvalConfig } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { loadConversation, saveConversation } from "@/lib/ai/history";
import type { UserSettings } from "@/db/schema";

export type PendingAction = { approvalId: string; toolName: string; input: Record<string, unknown> };

export type BotAiResult =
  | { kind: "not_configured" }
  | { kind: "reply"; text: string; pending: PendingAction[] }
  | { kind: "error"; message: string };

async function run(userId: string, settings: UserSettings, messages: ModelMessage[]): Promise<BotAiResult> {
  const ai = await getUserModel(userId);
  if (!ai) return { kind: "not_configured" };
  const system = await buildSystemPrompt(userId, {
    locale: settings.locale,
    units: settings.units,
    currency: settings.currency,
    channel: "telegram",
  });
  try {
    const result = await generateText({
      model: ai.model,
      system,
      messages,
      tools: buildTools(userId, "telegram"),
      toolApproval: approvalConfig,
      stopWhen: isStepCount(6),
      temperature: ai.temperature,
      maxOutputTokens: 1200,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(50_000),
    });
    const all = [...messages, ...result.responseMessages];
    await saveConversation(userId, "telegram", all);
    const pending: PendingAction[] = [];
    for (const part of result.content) {
      if (part.type === "tool-approval-request" && !part.isAutomatic) {
        pending.push({
          approvalId: part.approvalId,
          toolName: part.toolCall.toolName,
          input: part.toolCall.input as Record<string, unknown>,
        });
      }
    }
    return { kind: "reply", text: result.text.trim(), pending };
  } catch (e) {
    return { kind: "error", message: providerErrorMessage(e) };
  }
}

/** Drop a dangling assistant turn with unanswered approvals (user moved on and typed something new). */
function settle(history: ModelMessage[]): ModelMessage[] {
  const pending = pendingApprovalIds(history);
  if (!pending.length) return history;
  return [
    ...history,
    {
      role: "tool",
      content: pending.map((approvalId) => ({ type: "tool-approval-response" as const, approvalId, approved: false })),
    },
  ];
}

/** Keep at most `max` messages, starting at a user turn so tool calls/results stay paired. */
function trimHistory(history: ModelMessage[], max: number) {
  if (history.length <= max) return history;
  const tail = history.slice(-max);
  const start = tail.findIndex((m) => m.role === "user");
  return start === -1 ? [] : tail.slice(start);
}

function pendingApprovalIds(history: ModelMessage[]): string[] {
  const last = history[history.length - 1];
  if (!last || last.role !== "assistant" || typeof last.content === "string") return [];
  return last.content
    .filter((p) => p.type === "tool-approval-request")
    .map((p) => (p as { approvalId: string }).approvalId);
}

export async function chat(userId: string, settings: UserSettings, content: UserContent) {
  const history = settle(await loadConversation<ModelMessage>(userId, "telegram"));
  return run(userId, settings, [...trimHistory(history, 20), { role: "user", content }]);
}

/** Approve or reject all pending tool calls from the last assistant turn, then continue. */
export async function resolvePending(userId: string, settings: UserSettings, approved: boolean) {
  const history = await loadConversation<ModelMessage>(userId, "telegram");
  const ids = pendingApprovalIds(history);
  if (!ids.length) return null;
  return run(userId, settings, [
    ...history,
    { role: "tool", content: ids.map((approvalId) => ({ type: "tool-approval-response" as const, approvalId, approved })) },
  ]);
}
