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
  const { data: ajustadores, error: aErr } = await supabase.from('profiles').select('*').eq('role', 'ajustador');
  const { data: teams, error: tErr } = await supabase.from('teams').select('*');
  const { data: teamMembers, error: tmErr } = await supabase.from('team_members').select('*');
  
  console.log('Ajustadores:', ajustadores?.map(a => a.full_name));
  console.log('Equipes:', teams?.map(t => t.name));

  if (ajustadores && ajustadores.length > 0 && teams && teams.length > 0) {
    for (const ajustador of ajustadores) {
      const isLinked = teamMembers.some(tm => tm.profile_id === ajustador.id);
      if (!isLinked) {
        console.log(`Ajustador ${ajustador.full_name} não está em nenhuma equipe. Vinculando à primeira equipe: ${teams[0].name}`);
        const { error: insertErr } = await supabase.from('team_members').insert({
          team_id: teams[0].id,
          profile_id: ajustador.id
        });
        if (insertErr) console.error('Erro ao vincular:', insertErr.message);
        else console.log('Sucesso!');
      } else {
        console.log(`Ajustador ${ajustador.full_name} já está em uma equipe.`);
      }
    }
  } else {
    console.log('Não há ajustadores ou equipes suficientes para vincular.');
  }
}

check();
