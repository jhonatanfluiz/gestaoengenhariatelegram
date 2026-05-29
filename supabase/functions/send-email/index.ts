import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = "re_BuZcJ3rb_NqP2Sh3Ay3WhSqUNkcs5QtJq";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { toEmails, targetManagerName, deletingUserName } = await req.json();

    if (!toEmails || toEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No target emails provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'ElevateSync Security <onboarding@resend.dev>',
        to: toEmails,
        subject: `⚠️ ALERTA DE SEGURANÇA: Exclusão de Gestor Master`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ef4444;">Alerta de Segurança Crítico</h2>
            <p>Olá,</p>
            <p>Um procedimento de exclusão de um usuário de nível <strong>MASTER</strong> foi iniciado no painel ElevateSync.</p>
            <div style="background-color: #f8d7da; border-left: 5px solid #ef4444; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Gestor a ser excluído:</strong> ${targetManagerName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Iniciado por:</strong> ${deletingUserName}</p>
            </div>
            <p>Se você desconhece esta ação, acesse imediatamente o painel para revogar o acesso do usuário iniciador.</p>
            <p>Atenciosamente,<br/>Equipe ElevateSync</p>
          </div>
        `
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error sending email via Resend');
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro na edge function send-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
