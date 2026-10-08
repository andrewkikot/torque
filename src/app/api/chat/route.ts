import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { getCurrentUser, getSettings } from "@/lib/session";
import { getUserModel, providerErrorMessage } from "@/lib/services/ai-settings";
import { buildTools, approvalConfig } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { saveConversation } from "@/lib/ai/history";
import { hit } from "@/lib/rate-limit";
import { TERMS_VERSION } from "@/lib/terms";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  if ((await getSettings(user.id)).termsVersion !== TERMS_VERSION) {
    return Response.json({ error: "Please accept the Terms of Use first." }, { status: 403 });
  }

  if (!(await hit(`chat:${user.id}`, 150, 60 * 60 * 24))) {
    return Response.json({ error: "Daily assistant limit reached. Try again tomorrow." }, { status: 429 });
  }

  const ai = await getUserModel(user.id);
  if (!ai) return Response.json({ error: "not_configured" }, { status: 412 });

  const body = (await req.json()) as { messages: unknown; carId?: string | null };
  const tools = buildTools(user.id);
  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: body.messages, tools: tools as never });
  } catch {
    return Response.json({ error: "invalid messages" }, { status: 400 });
  }
  messages = messages.slice(-30);

  const settings = await getSettings(user.id);
  const system = await buildSystemPrompt(user.id, {
    locale: settings.locale,
    units: settings.units,
    currency: settings.currency,
    channel: "web",
    focusCarId: body.carId,
  });

  const result = streamText({
    model: ai.model,
    system,
    messages: await convertToModelMessages(messages),
    tools,
    toolApproval: approvalConfig,
    experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET ?? process.env.BETTER_AUTH_SECRET,
    stopWhen: isStepCount(6),
    temperature: ai.temperature,
    maxOutputTokens: 2000,
    maxRetries: 1,
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      onError: (e) => providerErrorMessage(e),
      onEnd: async ({ messages: all }) => {
        await saveConversation(user.id, "web", all);
      },
    }),
  });
}
