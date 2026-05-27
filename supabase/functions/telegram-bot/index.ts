import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

let BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('telegram_bot_token') || '';
// Limpa parênteses, colchetes, aspas ou espaços adicionados acidentalmente
BOT_TOKEN = BOT_TOKEN.replace(/[()\[\]'"]/g, '').trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: {
      id: number;
      first_name?: string;
      username?: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const logs: string[] = [];
  const log = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    console.log(msg);
    logs.push(msg);
  };

  let body: any = {};
  let chatId: string | null = null;
  let text: string | null = null;

  try {
    log('BOT_TOKEN loaded in Deno:', BOT_TOKEN ? `${BOT_TOKEN.slice(0, 5)}...${BOT_TOKEN.slice(-4)} (length: ${BOT_TOKEN.length})` : 'EMPTY');
    
    // Safe parse JSON body
    try {
      body = await req.json();
      if (body.message) {
        chatId = String(body.message.chat.id);
        text = body.message.text || '';
      } else if (body.callback_query) {
        chatId = String(body.callback_query.message.chat.id);
        text = body.callback_query.data || '';
      }
    } catch (e) {
      log('Failed to parse request JSON body:', e.message);
    }
    
    // Check if it's a debug request to test token and connectivity
    if (body.action === 'debug_info') {
      const rawUpper = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
      const rawLower = Deno.env.get('telegram_bot_token') || '';
      const sanitized = BOT_TOKEN;
      
      log('Starting debug info query...');
      log(`sanitized_token length: ${sanitized ? sanitized.length : 0}`);
      
      let telegramMe: any = null;
      try {
        const testUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
        const testResp = await fetch(testUrl, { method: 'GET' });
        if (testResp.ok) {
          telegramMe = await testResp.json();
          log('Telegram getMe: SUCCESS');
        } else {
          log(`Telegram getMe: FAILED (Status ${testResp.status}) - ${await testResp.text()}`);
        }
      } catch (err) {
        log(`Telegram getMe: ERROR - ${err.message}`);
      }

      if (body.simulate_chat_id) {
        log(`Simulating message check for chat_id: ${body.simulate_chat_id}...`);
        try {
          const cId = String(body.simulate_chat_id);
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_chat_id', cId)
            .maybeSingle();

          if (profileErr) {
            log(`Profile lookup error: ${JSON.stringify(profileErr)}`);
          } else if (!profile) {
            log(`Profile lookup: NOT FOUND for chat_id ${cId}`);
          } else {
            log(`Profile lookup: FOUND user ${profile.full_name} (ID: ${profile.id}, Role: ${profile.role})`);
            
            // Check projects
            const { data: directProjects, error: directProjErr } = await supabase
              .from('projects')
              .select('*')
              .eq('assigned_technician_id', profile.id)
              .neq('status', 'completed')
              .order('created_at', { ascending: false });

            if (directProjErr) {
              log(`Direct projects query error: ${JSON.stringify(directProjErr)}`);
            } else {
              log(`Direct projects count: ${directProjects?.length || 0}`);
              if (directProjects && directProjects.length > 0) {
                log(`Direct projects list: ${directProjects.map(p => `${p.name} (ID: ${p.id}, Status: ${p.status}, Tech: ${p.assigned_technician_id})`).join(', ')}`);
              }
            }

            // Check memberships
            const { data: memberships, error: memErr } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('profile_id', profile.id);

            if (memErr) {
              log(`Memberships query error: ${JSON.stringify(memErr)}`);
            } else {
              log(`Memberships count: ${memberships?.length || 0}`);
            }
          }
        } catch (e) {
          log(`Simulation caught error: ${e.message}`);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        env: {
          TELEGRAM_BOT_TOKEN_raw_upper: rawUpper ? `${rawUpper.slice(0, 5)}...${rawUpper.slice(-4)} (len: ${rawUpper.length})` : 'EMPTY',
          telegram_bot_token_raw_lower: rawLower ? `${rawLower.slice(0, 5)}...${rawLower.slice(-4)} (len: ${rawLower.length})` : 'EMPTY',
          sanitized_token: sanitized ? `${sanitized.slice(0, 5)}...${sanitized.slice(-4)} (len: ${sanitized.length})` : 'EMPTY',
          SUPABASE_URL: SUPABASE_URL || 'EMPTY',
          SUPABASE_SERVICE_ROLE_KEY_present: !!SUPABASE_SERVICE_ROLE_KEY,
        },
        telegram_get_me: telegramMe,
        debug_logs: logs,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check if it's a custom admin action from the dashboard
    if (body.action === 'send_test') {
      const { chat_id, text } = body;
      if (!chat_id) {
        return new Response(JSON.stringify({ error: 'Missing chat_id' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      await sendTelegram('sendMessage', {
        chat_id: String(chat_id),
        text: text || '⚡ *Teste de Conexão*\n\nSeu Chat ID do Telegram foi configurado com sucesso no painel ElevateSync!',
        parse_mode: 'Markdown',
      }, log);
      return new Response(JSON.stringify({ ok: true, message: 'Test message sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const update: TelegramUpdate = body;
    log('Received Telegram Update payload:', JSON.stringify(update));

    if (update.message) {
      await handleMessage(update.message, log);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, log);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    log('Error processing update:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // Write debug log to database (non-blocking)
    if (body.action !== 'debug_info' && (chatId || text || logs.length > 0)) {
      supabase.from('bot_debug_logs').insert({
        chat_id: chatId,
        message_text: text,
        payload: body,
        logs: logs
      }).then(({ error }) => {
        if (error) console.error('Error inserting bot_debug_log:', error);
      });
    }
  }
});

async function sendTelegram(method: string, body: object, log: (...args: any[]) => void) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  log(`Sending Telegram request to method: ${method}...`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    log(`Telegram API response status for ${method}:`, response.status);
    if (!response.ok) {
      log(`Telegram API error on ${method}:`, await response.text());
    }
  } catch (err) {
    clearTimeout(timeoutId);
    log(`Fetch error on Telegram ${method}:`, err.message);
  }
}

async function handleMessage(message: any, log: (...args: any[]) => void) {
  const chatId = String(message.chat.id);
  const text = message.text?.trim() || '';

  log(`Handling message from ${chatId}: "${text}"`);

  // 1. Check if user is registered in 'profiles'
  log('Querying profile from database...');
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (profileErr) {
    log('Database profile query error:', profileErr);
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: 'Erro interno ao consultar seu perfil. Tente novamente mais tarde.',
    }, log);
    return;
  }

  if (!profile) {
    log(`Profile NOT found for Telegram Chat ID: "${chatId}". Sending registration message.`);
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `Olá! Bem-vindo ao Sistema de Gestão de Instalação de Elevadores.\n\nVocê ainda não está cadastrado como técnico autorizado.\n\n🔑 Seu **Chat ID** do Telegram é:\n\`${chatId}\`\n\nPor favor, envie esse número para o seu Gestor no painel administrativo para que ele libere o seu acesso.`,
      parse_mode: 'Markdown',
    }, log);
    return;
  }

  log(`Profile found: "${profile.full_name}" (ID: ${profile.id}, Role: ${profile.role})`);

  if (text.startsWith('/start')) {
    log('Processing /start command');
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `Olá, **${profile.full_name}**! Técnico autorizado de instalação.\n\nEste bot serve para atualizar as 20 fases da instalação de elevadores comerciais atribuídas à sua equipe.\n\nUse o comando /atualizar para enviar o relatório de progresso do seu projeto atual.`,
      parse_mode: 'Markdown',
    }, log);
    return;
  }

  if (text.startsWith('/atualizar')) {
    log('Processing /atualizar command');
    
    // 2. Try to find projects directly assigned to this technician
    log('Querying directly assigned projects...');
    const { data: directProjects, error: directProjErr } = await supabase
      .from('projects')
      .select('*')
      .eq('assigned_technician_id', profile.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (directProjErr) {
      log('Error fetching direct projects:', directProjErr);
    } else {
      log(`Found ${directProjects?.length || 0} direct projects.`);
    }

    // 3. Find teams this technician belongs to (for fallback/team-based projects)
    log('Querying team memberships...');
    let teamProjectIds: string[] = [];
    const { data: memberships, error: memErr } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', profile.id);

    if (memErr) {
      log('Error fetching memberships:', memErr);
    } else if (memberships && memberships.length > 0) {
      const teamIds = memberships.map(m => m.team_id);
      log(`User belongs to ${teamIds.length} teams:`, teamIds);
      const { data: teamProjects, error: teamProjErr } = await supabase
        .from('projects')
        .select('id')
        .in('team_id', teamIds)
        .neq('status', 'completed');
      
      if (!teamProjErr && teamProjects) {
        teamProjectIds = teamProjects.map(p => p.id);
        log(`Found ${teamProjectIds.length} team projects.`);
      } else if (teamProjErr) {
        log('Error fetching team projects:', teamProjErr);
      }
    } else {
      log('No team memberships found.');
    }

    // 4. Combine unique active projects
    const allProjects: any[] = [];
    const seenIds = new Set<string>();

    if (directProjects) {
      for (const p of directProjects) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProjects.push(p);
        }
      }
    }

    if (teamProjectIds.length > 0) {
      const unseenTeamProjIds = teamProjectIds.filter(id => !seenIds.has(id));
      if (unseenTeamProjIds.length > 0) {
        log(`Fetching ${unseenTeamProjIds.length} unseen team projects...`);
        const { data: extraProjects } = await supabase
          .from('projects')
          .select('*')
          .in('id', unseenTeamProjIds)
          .neq('status', 'completed')
          .order('created_at', { ascending: false });
        
        if (extraProjects) {
          for (const p of extraProjects) {
            if (!seenIds.has(p.id)) {
              seenIds.add(p.id);
              allProjects.push(p);
            }
          }
        }
      }
    }

    log(`Total combined projects found: ${allProjects.length}`);

    if (allProjects.length === 0) {
      log('No active projects found. Sending error message.');
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Você não possui nenhum projeto de elevador ativo atribuído no momento. Peça para o gestor associá-lo a uma obra como Técnico Responsável.',
      }, log);
      return;
    }

    // Default to the first (newest) active project
    const activeProject = allProjects[0];
    log(`Selected active project: "${activeProject.name}" (ID: ${activeProject.id})`);

    // 5. Fetch all phases for this project to calculate the current phase (first incomplete)
    log('Fetching project phases progress...');
    const { data: phasesProgress, error: phaseErr } = await supabase
      .from('project_phases_progress')
      .select(`
        *,
        phases:phase_id (
          id,
          phase_number,
          name
        )
      `)
      .eq('project_id', activeProject.id);

    if (phaseErr || !phasesProgress || phasesProgress.length === 0) {
      log('Error or empty phases progress:', phaseErr);
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `Erro ao buscar o progresso do projeto "${activeProject.name}".`,
      }, log);
      return;
    }

    // Sort by phase number in memory
    const sortedPhases = phasesProgress.sort((a: any, b: any) => 
      (a.phases?.phase_number || 0) - (b.phases?.phase_number || 0)
    );

    // Find the current active phase (first phase that is not 100% complete)
    const currentPhaseProgress = sortedPhases.find((p: any) => p.progress_percent < 100) || sortedPhases[19];
    const currentPhaseNum = currentPhaseProgress.phases?.phase_number || 20;
    const currentPhaseName = currentPhaseProgress.phases?.name || 'Entrega técnica';

    log(`Active Phase: [${currentPhaseNum}/20] "${currentPhaseName}"`);

    // Ask Question 1: Did they start the phase?
    log('Sending start question message...');
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `🏗️ **Projeto:** ${activeProject.name}\n📍 **Fase [${currentPhaseNum}/20]:** ${currentPhaseName}\n\n**Esta fase já foi executada ou iniciada?**`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👍 Sim', callback_data: `start:yes:${currentPhaseNum}:${activeProject.id}:${currentPhaseProgress.phase_id}:${profile.id}` },
            { text: '👎 Não', callback_data: `start:no:${currentPhaseNum}:${activeProject.id}:${currentPhaseProgress.phase_id}:${profile.id}` }
          ]
        ]
      }
    }, log);

    // Save session state
    log('Upserting bot session...');
    const { error: sessErr } = await supabase.from('bot_sessions').upsert({
      telegram_chat_id: chatId,
      active_project_id: activeProject.id,
      current_question: 'awaiting_started',
      temp_phase_number: currentPhaseNum,
      updated_at: new Date().toISOString(),
    });
    if (sessErr) {
      log('Bot session upsert error:', sessErr);
    } else {
      log('Bot session upsert SUCCESS');
    }
    return;
  }

  log('Command not recognized. Sending fallback message.');
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: 'Comando não reconhecido. Use /atualizar para reportar o andamento da instalação.',
  }, log);
}

async function handleCallbackQuery(callbackQuery: any, log: (...args: any[]) => void) {
  const chatId = String(callbackQuery.message.chat.id);
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

  log(`Handling Callback Query from ${chatId}: ${data}`);

  // Split callback data
  // Format: action:value:phaseNum:projectId:phaseId:profileId
  const parts = data.split(':');
  const action = parts[0]; 
  const value = parts[1];  
  const phaseNum = parseInt(parts[2], 10);
  const projectId = parts[3];
  const phaseId = parts[4];
  const profileId = parts[5];

  // Fetch phase name
  log(`Querying phase name for ID: ${phaseId}...`);
  const { data: phase } = await supabase
    .from('phases')
    .select('name')
    .eq('id', phaseId)
    .maybeSingle();

  const phaseName = phase?.name || `Fase ${phaseNum}`;
  log(`Phase Name resolved: "${phaseName}"`);

  if (action === 'start') {
    if (value === 'yes') {
      // Prompt for progress percent
      log('User answered YES to start phase. Sending progress selection message.');
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `📍 **Fase [${phaseNum}/20]:** ${phaseName}\n\nQual o **percentual executado**?`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 25%', callback_data: `progress:25:${phaseNum}:${projectId}:${phaseId}:${profileId}` },
              { text: '📊 50%', callback_data: `progress:50:${phaseNum}:${projectId}:${phaseId}:${profileId}` }
            ],
            [
              { text: '📊 75%', callback_data: `progress:75:${phaseNum}:${projectId}:${phaseId}:${profileId}` },
              { text: '✅ 100% (Concluído)', callback_data: `progress:100:${phaseNum}:${projectId}:${phaseId}:${profileId}` }
            ]
          ]
        }
      }, log);

      // Update session state
      log('Updating bot session to awaiting_progress...');
      await supabase.from('bot_sessions').upsert({
        telegram_chat_id: chatId,
        active_project_id: projectId,
        current_question: 'awaiting_progress',
        temp_phase_number: phaseNum,
        updated_at: new Date().toISOString(),
      });
    } else {
      // "No" clicked: update database to started=false, progress=0
      log('User answered NO to start phase. Resetting progress to 0% in database.');
      await supabase
        .from('project_phases_progress')
        .update({ 
          started: false, 
          progress_percent: 0,
          updated_at: new Date().toISOString() 
        })
        .eq('project_id', projectId)
        .eq('phase_id', phaseId);

      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `Entendido. A **Fase [${phaseNum}/20]: ${phaseName}** foi registrada como **Não executada (0%)**.`,
        parse_mode: 'Markdown',
      }, log);

      // Reset bot session
      log('Deleting bot session...');
      await supabase.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
    }
  } else if (action === 'progress') {
    const progressPercent = parseInt(value, 10);
    log(`User selected progress percent: ${progressPercent}%. Updating database...`);

    // Update progress in DB
    // Trigger automatically logs this in change_logs and weekly_answers_log!
    const { error: updateErr } = await supabase
      .from('project_phases_progress')
      .update({
        started: true,
        progress_percent: progressPercent,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('phase_id', phaseId);

    if (updateErr) {
      log('Error updating progress:', updateErr);
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Erro ao registrar progresso no banco de dados. Tente novamente.',
      }, log);
      return;
    }

    log('Database progress update success.');

    if (progressPercent === 100) {
      let nextMsg = '';
      if (phaseNum < 20) {
        // Fetch next phase name
        const nextPhaseNum = phaseNum + 1;
        log(`Querying next phase name for number: ${nextPhaseNum}...`);
        const { data: nextPhase } = await supabase
          .from('phases')
          .select('name')
          .eq('phase_number', nextPhaseNum)
          .maybeSingle();

        nextMsg = `\n\nPróxima etapa: **Fase [${nextPhaseNum}/20]: ${nextPhase?.name || ''}**`;
      } else {
        // Complete the project status in the database
        log('Project completed! Updating project status to completed in database.');
        await supabase
          .from('projects')
          .update({ status: 'completed' })
          .eq('id', projectId);

        nextMsg = `\n\n🎉 **Instalação Comercial Concluída!** Todas as 20 fases foram finalizadas e registradas. Elevador pronto para comissionamento e entrega técnica!`;
      }

      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ **Fase [${phaseNum}/20]: ${phaseName}** concluída com **100%** de progresso!${nextMsg}`,
        parse_mode: 'Markdown',
      }, log);
    } else {
      // Progress updated but not completed (25%, 50%, 75%)
      log('Sending progress updated confirmation.');
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `📈 Progresso da **Fase [${phaseNum}/20]: ${phaseName}** atualizado para **${progressPercent}%** com sucesso. Bom trabalho!`,
        parse_mode: 'Markdown',
      }, log);
    }

    // Reset bot session
    log('Deleting bot session...');
    await supabase.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
  }

  // Answer callback query to stop loading spinner on Telegram
  log('Answering callback query to stop Telegram spinner...');
  await sendTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
  }, log);
}
