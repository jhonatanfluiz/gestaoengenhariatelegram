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

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('O campo "prompt" é obrigatório.');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no servidor Supabase.');
    }

    const candidates = [
      { version: 'v1', model: 'gemini-1.5-flash' },
      { version: 'v1beta', model: 'gemini-1.5-flash' },
      { version: 'v1', model: 'gemini-1.5-pro' },
      { version: 'v1beta', model: 'gemini-1.5-pro' },
      { version: 'v1', model: 'gemini-2.0-flash' },
      { version: 'v1beta', model: 'gemini-2.0-flash' },
      { version: 'v1', model: 'gemini-2.5-flash' },
      { version: 'v1beta', model: 'gemini-2.5-flash' }
    ];

    let geminiResponse = null;
    let lastErrorMsg = '';
    let responseText = '';

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
                parts: [
                  {
                    text: prompt
                  }
                ]
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
            lastErrorMsg = 'Resposta vazia da API do Gemini.';
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          lastErrorMsg = errJson.error?.message || `Status ${res.status} para o modelo ${cand.model} (${cand.version})`;
          console.warn(`Tentativa falhou com ${cand.model} (${cand.version}): ${lastErrorMsg}`);
        }
      } catch (err) {
        lastErrorMsg = err.message || `Falha de rede para o modelo ${cand.model} (${cand.version})`;
        console.warn(`Erro de rede com ${cand.model} (${cand.version}): ${lastErrorMsg}`);
      }
    }

    if (!geminiResponse) {
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
