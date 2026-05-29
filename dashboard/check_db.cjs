const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: mensagens, error: mErr } = await supabase.from('mensagens_obra').select('*').eq('status', 'Pendente');
  const { data: phases, error: pErr } = await supabase.from('phases').select('*');
  console.log('Mensagens:', JSON.stringify(mensagens.slice(-5), null, 2));
  console.log('Phases:', JSON.stringify(phases.slice(0, 5), null, 2));
}

check();
