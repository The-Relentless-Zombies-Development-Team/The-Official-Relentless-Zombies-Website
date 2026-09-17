import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const BASE_URL = "https://officialrelentlesszombies.dpdns.org"
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Relentless Zombies <noreply@officialrelentlesszombies.dpdns.org>"
// NOTE: 0$ fix: onboarding@resend.dev only allows sending to Resend account owner (ahmedelkafas15@gmail.com).
// To send to any user (e.g. ahmedelkafas129@gmail.com) you MUST verify officialrelentlesszombies.dpdns.org at resend.com/domains
// (add TXT/SPF/DKIM via deSEC). Until verified, signup emails will fail with 403 validation_error.
// Fallback: disable the Supabase Auth email hook (Dashboard -> Auth -> Hooks) to use Supabase built-in email (rate-limited but works for any address).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { newUsername } = await req.json()
    if (!newUsername || typeof newUsername !== "string" || newUsername.length > 16 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return new Response(JSON.stringify({ error: "Invalid username" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Server-side cooldown check (7 days)
    const lastChange = user.user_metadata?.last_username_change_at
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    if (lastChange) {
      const cooldownEnd = new Date(new Date(lastChange).getTime() + SEVEN_DAYS)
      if (Date.now() < cooldownEnd.getTime()) {
        return new Response(JSON.stringify({ error: `Username change on cooldown until ${cooldownEnd.toLocaleDateString()}` }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    // Check username uniqueness by listing users
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 100,
    })
    if (listError) throw listError
    const usernameTaken = allUsers.users.some(
      u => u.user_metadata?.username?.toLowerCase() === newUsername.toLowerCase()
    )
    if (usernameTaken) {
      return new Response(JSON.stringify({ error: "Username already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Delete any previous unused tokens for this user
    const { error: cleanupError } = await supabase
      .from("username_change_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("used", false)
    if (cleanupError) throw cleanupError

    const confirmationToken = crypto.randomUUID()
    const confirmUrl = `${BASE_URL}/login/change-username.html?token=${confirmationToken}&uid=${user.id}`

    const { error: insertError } = await supabase
      .from("username_change_tokens")
      .insert({
        user_id: user.id,
        new_username: newUsername,
        token: confirmationToken,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      })

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create confirmation token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Confirm username change</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
<tr><td style="background:#1a1a1a;border-radius:12px;border:1px solid #333;padding:40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px">
<h1 style="color:#fff;font-size:20px;font-weight:700;margin:0">Relentless Zombies</h1>
</td></tr>
<tr><td style="color:#ccc;font-size:14px;line-height:1.6;padding-bottom:24px">Click the button below to confirm changing your username to <strong style="color:#fff;">${newUsername.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</strong>.</td></tr>
<tr><td align="center" style="padding-bottom:24px"><a href="${confirmUrl}" style="display:inline-block;background:#ff7200;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Confirm username change</a></td></tr>
<tr><td style="color:#666;font-size:12px;word-break:break-all;padding-bottom:16px">Or copy link: <a href="${confirmUrl}" style="color:#ff7200;">${confirmUrl}</a></td></tr>
<tr><td style="color:#888;font-size:13px;">You're receiving this because you requested a username change.</td></tr>
<tr><td style="padding-top:16px"><p style="color:#888;font-size:13px;line-height:1.5;margin:0">If you didn't request this, you can safely ignore it. Link expires in 1 hour.</p></td></tr>
</table></td></tr></table></td></tr></table>
</body></html>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [user.email!],
        subject: "Confirm your username change - Relentless Zombies",
        html,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      // cleanup token on email failure
      await supabase.from("username_change_tokens").delete().eq("token", confirmationToken)
      const isTestingLimit = res.status === 403 && (data?.message || JSON.stringify(data)).includes("testing emails")
      const hint = isTestingLimit ? " — Resend 403: onboarding@resend.dev only sends to account owner. Verify officialrelentlesszombies.dpdns.org at resend.com/domains or set RESEND_FROM to verified domain, or disable Auth email hook for built-in email." : ""
      return new Response(JSON.stringify({ error: `Email failed${hint}: ${JSON.stringify(data)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
