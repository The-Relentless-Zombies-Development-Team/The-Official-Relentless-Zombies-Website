import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string
const RESEND_BROADCAST_ID = Deno.env.get("RESEND_BROADCAST_ID") as string
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const BASE_URL = "https://officialrelentlesszombies.dpdns.org"

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

    const oldUsername = user.user_metadata?.username || user.email?.split("@")[0] || "Player"
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

    const broadcastRes = await fetch("https://api.resend.com/broadcasts/" + RESEND_BROADCAST_ID + "/send", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Confirm your username change - Relentless Zombies",
        preheader: `Click the button below to confirm changing your username to ${newUsername}.`,
        actionUrl: confirmUrl,
        actionLabel: "Confirm username change",
        code: "",
        footer: "You're receiving this because you requested a username change.",
        contacts: {
          email: user.email,
        },
      }),
    })

    const broadcastData = await broadcastRes.json()

    return new Response(JSON.stringify({ success: true, broadcastData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
