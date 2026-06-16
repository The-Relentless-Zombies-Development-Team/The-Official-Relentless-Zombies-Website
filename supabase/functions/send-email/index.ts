import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string
const RESEND_AUDIENCE_ID = Deno.env.get("RESEND_AUDIENCE_ID") as string
const RESEND_BROADCAST_ID = Deno.env.get("RESEND_BROADCAST_ID") as string
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const BASE_URL = Deno.env.get("SITE_URL") || "https://officialrelentlesszombies.dpdns.org"

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

async function upsertContact(email: string, username: string): Promise<string> {
  const res = await fetch("https://api.resend.com/audiences/" + RESEND_AUDIENCE_ID + "/contacts", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      first_name: username,
      unsubscribed: false,
    }),
  })
  const data = await res.json()
  return data.id || ""
}

async function sendBroadcast(contactEmail: string, subject: string, preheader: string, actionUrl?: string, actionLabel?: string, code?: string, footer?: string) {
  const res = await fetch("https://api.resend.com/broadcasts/" + RESEND_BROADCAST_ID + "/send", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      preheader,
      actionUrl: actionUrl || "",
      actionLabel: actionLabel || "",
      code: code || "",
      footer: footer || "",
      contacts: {
        email: contactEmail,
      },
    }),
  })
  return res.json()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 })
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
      user = verified.user
      emailData = verified.email_data
    } else {
      const parsed = JSON.parse(payload)
      user = parsed.user
      emailData = parsed.email_data
    }

    const actionType = emailData.email_action_type
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "Player"
    const redirectTo = emailData.redirect_to || emailData.site_url || BASE_URL
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`

    const subject = getSubject(actionType)
    const preheader = getPreheader(actionType, escapeHtml(username))
    const footer = getFooter(actionType)

    let actionUrl: string | undefined
    let actionLabel: string | undefined
    let code: string | undefined

    if (actionType === "reauthentication") {
      code = emailData.token || ""
    } else {
      actionUrl = confirmationUrl
      const labelMap: Record<string, string> = {
        signup: "Confirm your email",
        recovery: "Reset password",
        magiclink: "Sign in",
        email_change: "Confirm email",
        invite: "Accept invitation",
      }
      actionLabel = labelMap[actionType] || "Continue"
    }

    await upsertContact(user.email, username)
    await sendBroadcast(user.email, subject, preheader, actionUrl, actionLabel, code, footer)

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: { http_code: 500, message: error.message },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
