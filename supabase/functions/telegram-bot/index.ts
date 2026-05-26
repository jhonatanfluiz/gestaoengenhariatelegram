import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update: TelegramUpdate = await req.json();
    console.log('Received Telegram Update:', JSON.stringify(update));

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing update:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function sendTelegram(method: string, body: object) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`Telegram API error on ${method}:`, await response.text());
  }
}

async function handleMessage(message: any) {
  const chatId = String(message.chat.id);
  const text = message.text?.trim() || '';

  // 1. Check if user is registered in 'profiles'
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (profileErr) {
    console.error('Database profile query error:', profileErr);
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: 'Erro interno ao consultar seu perfil. Tente novamente mais tarde.',
    });
    return;
  }

  if (!profile) {
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `Olá! Bem-vindo ao Sistema de Gestão de Instalação de Elevadores.\n\nVocê ainda não está cadastrado como técnico autorizado.\n\n🔑 Seu **Chat ID** do Telegram é:\n\`${chatId}\`\n\nPor favor, envie esse número para o seu Gestor no painel administrativo para que ele libere o seu acesso.`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (text.startsWith('/start')) {
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `Olá, **${profile.full_name}**! Técnico autorizado de instalação.\n\nEste bot serve para atualizar as 20 fases da instalação de elevadores comerciais atribuídas à sua equipe.\n\nUse o comando /atualizar para enviar o relatório de progresso do seu projeto atual.`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (text.startsWith('/atualizar')) {
    // 2. Find teams this technician belongs to
    const { data: memberships, error: memErr } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', profile.id);

    if (memErr || !memberships || memberships.length === 0) {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Você não está vinculado a nenhuma equipe de instalação ativa. Peça para o gestor cadastrá-lo em uma equipe.',
      });
      return;
    }

    const teamIds = memberships.map(m => m.team_id);

    // 3. Find projects assigned to these teams
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .in('team_id', teamIds)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (projErr || !projects || projects.length === 0) {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Sua equipe não possui nenhum projeto de elevador ativo atribuído no momento.',
      });
      return;
    }

    // Default to the first (newest) active project
    const activeProject = projects[0];

    // 4. Fetch all phases for this project to calculate the current phase (first incomplete)
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
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `Erro ao buscar o progresso do projeto "${activeProject.name}".`,
      });
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

    // Ask Question 1: Did they start the phase?
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
    });

    // Save session state
    await supabase.from('bot_sessions').upsert({
      telegram_chat_id: chatId,
      active_project_id: activeProject.id,
      current_question: 'awaiting_started',
      temp_phase_number: currentPhaseNum,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: 'Comando não reconhecido. Use /atualizar para reportar o andamento da instalação.',
  });
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = String(callbackQuery.message.chat.id);
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

  console.log(`Callback Query from ${chatId}: ${data}`);

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
  const { data: phase } = await supabase
    .from('phases')
    .select('name')
    .eq('id', phaseId)
    .maybeSingle();

  const phaseName = phase?.name || `Fase ${phaseNum}`;

  if (action === 'start') {
    if (value === 'yes') {
      // Prompt for progress percent
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
      });

      // Update session state
      await supabase.from('bot_sessions').upsert({
        telegram_chat_id: chatId,
        active_project_id: projectId,
        current_question: 'awaiting_progress',
        temp_phase_number: phaseNum,
        updated_at: new Date().toISOString(),
      });
    } else {
      // "No" clicked: update database to started=false, progress=0
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
      });

      // Reset bot session
      await supabase.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
    }
  } else if (action === 'progress') {
    const progressPercent = parseInt(value, 10);

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
      console.error('Error updating progress:', updateErr);
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Erro ao registrar progresso no banco de dados. Tente novamente.',
      });
      return;
    }

    if (progressPercent === 100) {
      let nextMsg = '';
      if (phaseNum < 20) {
        // Fetch next phase name
        const nextPhaseNum = phaseNum + 1;
        const { data: nextPhase } = await supabase
          .from('phases')
          .select('name')
          .eq('phase_number', nextPhaseNum)
          .maybeSingle();

        nextMsg = `\n\nPróxima etapa: **Fase [${nextPhaseNum}/20]: ${nextPhase?.name || ''}**`;
      } else {
        // Complete the project status in the database
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
      });
    } else {
      // Progress updated but not completed (25%, 50%, 75%)
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `📈 Progresso da **Fase [${phaseNum}/20]: ${phaseName}** atualizado para **${progressPercent}%** com sucesso. Bom trabalho!`,
        parse_mode: 'Markdown',
      });
    }

    // Reset bot session
    await supabase.from('bot_sessions').delete().eq('telegram_chat_id', chatId);
  }

  // Answer callback query to stop loading spinner on Telegram
  await sendTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
  });
}
