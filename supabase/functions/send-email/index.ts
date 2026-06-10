import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""

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

function logoHtml(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff7200" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>`
}

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;margin:32px 0;overflow:hidden">
<tr><td style="text-align:center;padding:32px 0 16px">
${logoHtml()}
<h1 style="color:#ff7200;font-size:22px;margin:12px 0 0;font-weight:300;letter-spacing:0.5px">Relentless Zombies</h1>
</td></tr>
${content}
<tr><td style="padding:24px 32px;text-align:center;font-size:12px;color:#555;border-top:1px solid #222">
<p style="margin:0 0 4px">Relentless Zombies Official Website</p>
<p style="margin:0">If you didn't request this email, you can safely ignore it.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

function buildSignupHtml(username: string, confirmationUrl: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">Welcome, ${escapeHtml(username)}!</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">You're one step away from joining the horde. Click the button below to confirm your email address and activate your account.</p>
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">Confirm your email</a>
</td></tr>`)
}

function buildRecoveryHtml(username: string, confirmationUrl: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">Reset your password</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">We received a request to reset your password, ${escapeHtml(username)}. Click the button below to choose a new one.</p>
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">Reset password</a>
</td></tr>`)
}

function buildMagiclinkHtml(username: string, confirmationUrl: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">Your sign-in link</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">Click below to sign in instantly, ${escapeHtml(username)}. This link expires shortly and can only be used once.</p>
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">Sign in</a>
</td></tr>`)
}

function buildEmailChangeHtml(username: string, confirmationUrl: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">Confirm your new email</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">Click below to confirm this email address for your account, ${escapeHtml(username)}.</p>
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">Confirm email</a>
</td></tr>`)
}

function buildReauthHtml(username: string, token: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">Verification code</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">Use the code below to verify your identity, ${escapeHtml(username)}. It expires shortly.</p>
<div style="display:inline-block;padding:16px 32px;background:#1a1a1a;border:1px solid #ff7200;border-radius:8px;font-size:28px;color:#ff7200;letter-spacing:6px;font-weight:bold">${token}</div>
</td></tr>`)
}

function buildInviteHtml(username: string, confirmationUrl: string): string {
  return wrapHtml(`
<tr><td style="padding:0 32px 24px;text-align:center">
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">You've been invited!</h2>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px">You've been invited to join Relentless Zombies. Click below to accept and create your account.</p>
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 32px;background:#ff7200;color:#000;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold">Accept invitation</a>
</td></tr>`)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function getText(actionType: string, data: { username?: string; confirmationUrl?: string; token?: string }): string {
  const name = data.username || "Player"
  const base = `Relentless Zombies\n\n`
  const footer = `\n\n---\nRelentless Zombies Official Website\nIf you didn't request this email, you can safely ignore it.`

  switch (actionType) {
    case "signup":
      return `${base}Welcome, ${name}! Confirm your email by visiting this link:\n${data.confirmationUrl}${footer}`
    case "recovery":
      return `${base}Reset your password by visiting this link:\n${data.confirmationUrl}${footer}`
    case "magiclink":
      return `${base}Sign in by visiting this link:\n${data.confirmationUrl}${footer}`
    case "email_change":
      return `${base}Confirm your new email by visiting this link:\n${data.confirmationUrl}${footer}`
    case "reauthentication":
      return `${base}Your verification code is: ${data.token}${footer}`
    case "invite":
      return `${base}You've been invited! Accept by visiting this link:\n${data.confirmationUrl}${footer}`
    default:
      return `${base}Follow this link to complete your action:\n${data.confirmationUrl}${footer}`
  }
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
    const redirectTo = emailData.redirect_to || emailData.site_url
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`

    let html: string
    switch (actionType) {
      case "signup":
        html = buildSignupHtml(username, confirmationUrl)
        break
      case "recovery":
        html = buildRecoveryHtml(username, confirmationUrl)
        break
      case "magiclink":
        html = buildMagiclinkHtml(username, confirmationUrl)
        break
      case "email_change":
        html = buildEmailChangeHtml(username, confirmationUrl)
        break
      case "reauthentication":
        html = buildReauthHtml(username, emailData.token || "")
        break
      case "invite":
        html = buildInviteHtml(username, confirmationUrl)
        break
      default:
        html = buildSignupHtml(username, confirmationUrl)
    }

    const text = getText(actionType, {
      username,
      confirmationUrl,
      token: emailData.token,
    })

    const { error } = await resend.emails.send({
      from: "Relentless Zombies <onboarding@resend.dev>",
      to: [user.email],
      subject: getSubject(actionType),
      html,
      text,
    })

    if (error) throw error

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
