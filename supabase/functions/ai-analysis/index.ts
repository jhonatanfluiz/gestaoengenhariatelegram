import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Trata a requisição de preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let lastErrorMsg = '';
  try {
    const body = await req.json();
    const { prompt, audioBase64, audioMimeType } = body;

    if (!prompt) {
      throw new Error('O campo "prompt" é obrigatório.');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no servidor Supabase.');
    }

    const candidates = [
      { version: 'v1beta', model: 'gemini-2.0-flash' },
      { version: 'v1', model: 'gemini-2.0-flash' },
      { version: 'v1beta', model: 'gemini-1.5-pro' },
      { version: 'v1beta', model: 'gemini-1.5-flash' }
    ];

    let geminiResponse = null;
    let responseText = '';
    
    const parts: any[] = [{ text: prompt }];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType || 'audio/webm',
          data: audioBase64
        }
      });
    }

    let allErrors = [];
    for (const cand of candidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/${cand.version}/models/${cand.model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: parts
              }
            ]
          })
        });

        if (res.ok) {
          const resData = await res.json();
          responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (responseText) {
            geminiResponse = resData;
            break;
          } else {
            allErrors.push(`[${cand.model}] Resposta vazia.`);
          }
        } else {
          const errText = await res.text().catch(() => '');
          let errJson: any = {};
          try { errJson = JSON.parse(errText); } catch(e) {}
          const msg = errJson.error?.message || errText || `Status ${res.status}`;
          allErrors.push(`[${cand.model}] ${msg}`);
          console.error(`Tentativa falhou com ${cand.model} (${cand.version}):`, errText);
        }
      } catch (err) {
        allErrors.push(`[${cand.model}] ${err.message}`);
        console.error(`Erro de rede com ${cand.model} (${cand.version}):`, err.message);
      }
    }

    if (!geminiResponse) {
      lastErrorMsg = allErrors.join(' | ');
      throw new Error(lastErrorMsg || 'Erro de comunicação com a API do Gemini.');
    }

    return new Response(
      JSON.stringify({ text: responseText }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message, details: lastErrorMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
