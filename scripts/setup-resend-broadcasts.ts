import { Resend } from "npm:resend@4"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable required")
  Deno.exit(1)
}

const resend = new Resend(RESEND_API_KEY)

// Wrap HTML with branding (same as send-email)
function wrapHtml(inner: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;margin:32px 0;overflow:hidden">
<tr><td style="text-align:center;padding:32px 0 16px">
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff7200" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>
<h1 style="color:#ff7200;font-size:22px;margin:12px 0 0;font-weight:300;letter-spacing:0.5px">Relentless Zombies</h1>
</td></tr>
{{content}}
<tr><td style="padding:24px 32px;text-align:center;font-size:12px;color:#555;border-top:1px solid #222">
<p style="margin:0 0 4px">Relentless Zombies Official Website</p>
<p style="margin:0">If you didn't request this email, you can safely ignore it.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

const broadcastHtml = wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">{{heading}}</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">{{body}}</p>
{{#if actionUrl}}
<a href="{{actionUrl}}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">{{actionText}}</a>
{{/if}}
{{#if code}}
<div style="display:inline-block;padding:16px 32px;background:#1a1a1a;border:1px solid #ff7200;border-radius:8px;font-size:28px;color:#ff7200;letter-spacing:6px;font-weight:bold">{{code}}</div>
{{/if}}
</td></tr>`)

const plainTextTemplate = `{{text}}`

async function main() {
  // 1. Create Audience
  console.log("Creating audience...")
  const audience = await resend.audiences.create({ name: "Auth Emails" })
  console.log(`Audience created: ${audience.id} (${audience.name})`)

  // 2. Create Broadcast
  console.log("Creating broadcast...")
  const broadcast = await resend.broadcasts.create({
    audience_id: audience.id,
    from: "Relentless Zombies <onboarding@resend.dev>",
    subject: "{{subject}}",
    html: broadcastHtml,
    plain_text: plainTextTemplate,
    name: "Auth Email Template",
  })
  console.log(`Broadcast created: ${broadcast.id} (${broadcast.name})`)

  console.log("\n=== SAVE THESE IDs ===")
  console.log(`RESEND_AUDIENCE_ID=${audience.id}`)
  console.log(`RESEND_BROADCAST_ID=${broadcast.id}`)
}

main().catch((err) => {
  console.error("Failed:", err.message)
  Deno.exit(1)
})
