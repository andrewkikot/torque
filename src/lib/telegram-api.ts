import "server-only";

type InlineButton = { text: string; callback_data?: string; url?: string };

/** Minimal Telegram Bot API call used for push notifications (no bot instance needed). */
export async function tgSend(
  chatId: string,
  text: string,
  opts: { buttons?: InlineButton[][]; silent?: boolean } = {},
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_notification: opts.silent,
        link_preview_options: { is_disabled: true },
        reply_markup: opts.buttons ? { inline_keyboard: opts.buttons } : undefined,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("telegram send failed", e);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
