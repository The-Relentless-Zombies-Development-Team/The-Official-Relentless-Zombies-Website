import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const BASE_URL = Deno.env.get("SITE_URL") || "https://officialrelentlesszombies.dpdns.org"
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Relentless Zombies <noreply@officialrelentlesszombies.dpdns.org>"
// NOTE: 0$ fix: onboarding@resend.dev only allows sending to Resend account owner (ahmedelkafas15@gmail.com).
// To send to any user (e.g. ahmedelkafas129@gmail.com) you MUST verify officialrelentlesszombies.dpdns.org at resend.com/domains
// (add TXT/SPF/DKIM via deSEC). Until verified, signup emails will fail with 403 validation_error.
// Fallback: disable the Supabase Auth email hook (Dashboard -> Auth -> Hooks) to use Supabase built-in email (rate-limited but works for any address).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function wrapHtml(inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Relentless Zombies</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
<tr><td style="background:#1a1a1a;border-radius:12px;border:1px solid #333;padding:40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px">
<img src="${BASE_URL}/favicon.ico" alt="RZ" width="48" height="48" style="border-radius:50%;display:block;margin:0 auto">
<h1 style="color:#fff;font-size:20px;font-weight:700;margin:16px 0 0;letter-spacing:-0.3px">Relentless&shy;Zombies</h1>
</td></tr>
${inner}
<tr><td style="padding-top:16px">
<p style="color:#888;font-size:13px;line-height:1.5;margin:0">If you didn't request this email, you can safely ignore it.</p>
</td></tr>
</table></td></tr></table></td></tr></table>
</body></html>`
}

function getSubject(type: string): string {
  const map: Record<string, string> = {
    signup: "Confirm your email - Relentless Zombies",
    recovery: "Reset your password - Relentless Zombies",
    magiclink: "Your sign-in link - Relentless Zombies",
    email_change: "Confirm your new email - Relentless Zombies",
    reauthentication: "Your verification code - Relentless Zombies",
    invite: "You've been invited - Relentless Zombies",
  }
  return map[type] || "Notification - Relentless Zombies"
}

function getPreheader(type: string, username: string): string {
  const map: Record<string, string> = {
    signup: `Welcome, ${username}! Click the button below to confirm your email and activate your account.`,
    recovery: `We received a request to reset your password, ${username}. Click the button below to choose a new one.`,
    magiclink: `Click below to sign in instantly, ${username}. This link expires shortly.`,
    email_change: `Click below to confirm this email address for your account, ${username}.`,
    reauthentication: `Your verification code is below, ${username}. It expires shortly.`,
    invite: `You've been invited to join Relentless Zombies, ${username}! Click below to accept.`,
  }
  return map[type] || `Notification for ${username}`
}

function getFooter(type: string): string {
  if (type === "signup") return "You're receiving this because you created an account on Relentless Zombies."
  if (type === "recovery") return "You're receiving this because you requested a password reset."
  if (type === "magiclink") return "You're receiving this because you requested a sign-in link."
  if (type === "email_change") return "You're receiving this because you requested an email change."
  if (type === "invite") return "You're receiving this because you were invited to join Relentless Zombies."
  return "Relentless Zombies Official Website"
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    // 0$ budget help: Resend returns 403 when using onboarding@resend.dev for non-owner recipients
    const isTestingLimit = res.status === 403 && (data?.message || "").includes("testing emails")
    if (isTestingLimit) {
      throw new Error(`Resend 403 validation_error: ${data?.message} — Fix: verify your domain (officialrelentlesszombies.dpdns.org) at resend.com/domains via deSEC TXT records, set RESEND_FROM to a verified address, or temporarily disable the Auth email hook to use Supabase built-in email. Raw: ${JSON.stringify(data)}`)
    }
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(data)}`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400, headers: corsHeaders })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  try {
    let user: any
    let emailData: any

    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")
    if (hookSecret) {
      const wh = new Webhook(hookSecret.replace("v1,whsec_", ""))
      const verified = wh.verify(payload, headers) as any
      if (!verified) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      user = verified.user
      emailData = verified.email_data
    } else {
      return new Response(JSON.stringify({ error: "SEND_EMAIL_HOOK_SECRET not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const actionType = emailData.email_action_type
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "Player"
    const redirectTo = emailData.redirect_to || emailData.site_url || BASE_URL
    const confirmationUrl = `${SUPABASE_URL}/auth/v1/verify?token=${emailData.token_hash}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`

    const subject = getSubject(actionType)
    const preheader = getPreheader(actionType, escapeHtml(username))
    const footer = getFooter(actionType)

    let inner = ""
    if (actionType === "reauthentication") {
      const code = escapeHtml(emailData.token || "")
      inner = `
<tr><td style="color:#fff;font-size:14px;padding-bottom:12px">${escapeHtml(preheader)}</td></tr>
<tr><td align="center" style="padding:20px;background:#222;border-radius:10px;margin-bottom:16px"><span style="color:#fff;font-size:32px;letter-spacing:8px;font-family:monospace;font-weight:700;">${code}</span></td></tr>
<tr><td style="color:#888;font-size:13px;padding-top:12px">${escapeHtml(footer)}</td></tr>
`
    } else {
      const labelMap: Record<string, string> = {
        signup: "Confirm your email",
        recovery: "Reset password",
        magiclink: "Sign in",
        email_change: "Confirm email",
        invite: "Accept invitation",
      }
      const actionLabel = labelMap[actionType] || "Continue"
      const safeUrl = escapeHtml(confirmationUrl)
      const safeLabel = escapeHtml(actionLabel)
      inner = `
<tr><td style="color:#ccc;font-size:14px;line-height:1.6;padding-bottom:24px">${escapeHtml(preheader)}</td></tr>
<tr><td align="center" style="padding-bottom:24px"><a href="${safeUrl}" style="display:inline-block;background:#ff7200;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">${safeLabel}</a></td></tr>
<tr><td style="color:#666;font-size:12px;word-break:break-all;padding-bottom:16px">Or copy link: <a href="${safeUrl}" style="color:#ff7200;">${safeUrl}</a></td></tr>
<tr><td style="color:#888;font-size:13px;">${escapeHtml(footer)}</td></tr>
`
    }

    const html = wrapHtml(inner)
    await sendEmail(user.email, subject, html)

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        error: { http_code: 500, message },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
