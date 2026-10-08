import "server-only";
import { Resend } from "resend";

export async function sendMagicLinkEmail(email: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev fallback: no email provider configured.
    console.log(`\n🔑 Magic link for ${email}:\n${url}\n`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Torque <onboarding@resend.dev>",
    to: email,
    subject: "Your Torque sign-in link · Посилання для входу",
    html: magicLinkHtml(url),
    text: `Sign in to Torque: ${url}\n\nУвійти в Torque: ${url}\n\nThe link expires in 15 minutes.`,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

function magicLinkHtml(url: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" style="max-width:440px;background:#fff;border-radius:20px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:700;color:#1c1917">🔧 Torque</td></tr>
<tr><td style="padding:16px 0 8px;color:#44403c;font-size:15px;line-height:1.5">Tap the button to sign in to your garage.<br><span style="color:#78716c">Натисніть кнопку, щоб увійти до свого гаража.</span></td></tr>
<tr><td style="padding:16px 0"><a href="${url}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:12px">Sign in · Увійти</a></td></tr>
<tr><td style="color:#a8a29e;font-size:12px">The link expires in 15 minutes. If you didn't request it, ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}
