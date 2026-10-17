import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || ""

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

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the code in user_metadata for verification
    const { error: updateError } = await supabase.auth.admin.updateUser(user.id, {
      user_metadata: { delete_otp: code },
    })
    if (updateError) throw updateError

    // Send the code via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Relentless Zombies <noreply@relentlesszombies.rexo.is-a.dev>",
        to: [user.email],
        subject: "Delete Account Verification Code",
        html: `
          <h2 style="color:#ff7200;font-family:sans-serif">Relentless Zombies</h2>
          <p>Your account deletion verification code is:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#fff;background:#1a1a1a;padding:12px;border-radius:8px;display:inline-block">${code}</p>
          <p style="font-size:12px;color:#888">This code expires after use. If you didn't request this, ignore this email.</p>
        `,
        text: `Your account deletion verification code is: ${code}`,
        reply_to: "support@officialrelentlesszombies.dpdns.org",
        headers: {
          "X-Entity-Ref-ID": `rz-delete-${Date.now()}`,
          "List-Unsubscribe": "<mailto:support@officialrelentlesszombies.dpdns.org?subject=Unsubscribe>, <https://officialrelentlesszombies.dpdns.org/unsubscribe>",
        },
        tags: [{ name: "category", value: "transactional" }],
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(`Resend error ${res.status}: ${JSON.stringify(data)}`)
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
