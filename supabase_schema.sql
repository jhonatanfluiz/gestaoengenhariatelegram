-- =====================================================================
-- ELEVATESYNC - DATABASE SCHEMA DEFINITION (SUPABASE/POSTGRESQL)
-- Especialista em Instalação de Elevadores Comerciais
-- =====================================================================

-- Habilitar a extensão pgcrypto se necessário para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpeza de tabelas e views existentes para garantir consistência
DROP VIEW IF EXISTS public.vw_looker_studio_metrics CASCADE;
DROP VIEW IF EXISTS public.vw_project_metrics CASCADE;
DROP VIEW IF EXISTS public.vw_pending_ranking CASCADE;

DROP TABLE IF EXISTS public.bot_sessions CASCADE;
DROP TABLE IF EXISTS public.change_logs CASCADE;
DROP TABLE IF EXISTS public.weekly_answers_log CASCADE;
DROP TABLE IF EXISTS public.project_phases_progress CASCADE;
DROP TABLE IF EXISTS public.phases CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- =====================================================================
-- 1. ESTRUTURA DE TABELAS (DDL)
-- =====================================================================

-- Tabela de Empresas (Clientes, Parceiras ou Terceirizadas)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Perfis de Usuários (Gestores e Técnicos)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional para técnicos sem acesso web
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    telegram_chat_id TEXT UNIQUE,
    whatsapp_number TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'technician')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Equipes de Instalação
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Relacional: Membros da Equipe (Muitos para Muitos)
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, profile_id)
);

-- Tabela de Obras (Projetos de Elevadores)
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    assigned_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    elevator_model TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '60 days')::DATE, -- Padrão de 60 dias alterável
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'delayed')),
    notification_frequency TEXT DEFAULT 'weekly' CHECK (notification_frequency IN ('daily', 'weekly', 'monthly', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Catálogo das 20 Fases Padrão (Populada estaticamente)
CREATE TABLE public.phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_number INT UNIQUE NOT NULL CHECK (phase_number >= 1 AND phase_number <= 20),
    name TEXT NOT NULL,
    description TEXT,
    weight INT DEFAULT 5
);

-- Tabela de Progresso Real das Fases por Projeto
CREATE TABLE public.project_phases_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    phase_id UUID REFERENCES public.phases(id) ON DELETE CASCADE NOT NULL,
    started BOOLEAN NOT NULL DEFAULT false,
    progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent IN (0, 25, 50, 75, 100)),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, phase_id)
);

-- Tabela Histórico Semanal para Gráfico da Curva de Avanço (Curva S)
CREATE TABLE public.weekly_answers_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    phase_id UUID REFERENCES public.phases(id) ON DELETE CASCADE NOT NULL,
    started BOOLEAN NOT NULL DEFAULT false,
    progress_percent INT NOT NULL CHECK (progress_percent IN (0, 25, 50, 75, 100)),
    week_start_date DATE NOT NULL, -- Primeiro dia da semana da medição
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, phase_id, week_start_date)
);

-- Tabela para Logs e Auditoria de Alterações
CREATE TABLE public.change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Controle de Sessões do Telegram Bot (State Machine)
CREATE TABLE public.bot_sessions (
    telegram_chat_id TEXT PRIMARY KEY,
    active_project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    current_question TEXT CHECK (current_question IN ('awaiting_started', 'awaiting_progress', 'idle')),
    temp_phase_number INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 2. POPULAR AS 20 FASES PADRÃO DE MONTAGEM DE ELEVADORES
-- =====================================================================
INSERT INTO public.phases (phase_number, name, description, weight) VALUES
(1, 'Mobilização da equipe', 'Chegada de equipe, EPIs, e ferramentas na obra.', 2),
(2, 'Conferência da prumada', 'Verificação das dimensões e alinhamento do poço.', 3),
(3, 'Liberação do poço', 'Inspeção física, limpeza e checagem de infiltrações no fundo do poço.', 3),
(4, 'Instalação de andaimes e proteção', 'Montagem das estruturas auxiliares de segurança no poço.', 4),
(5, 'Instalação das guias da cabine', 'Montagem e fixação dos trilhos que guiarão a cabine.', 8),
(6, 'Instalação das guias do contrapeso', 'Montagem e fixação dos trilhos que guiarão o contrapeso.', 6),
(7, 'Montagem da máquina de tração', 'Fixação do motor de tração no topo do poço ou casa de máquinas.', 10),
(8, 'Instalação da base da máquina', 'Montagem da base metálica/apoios que sustentam a máquina.', 5),
(9, 'Instalação do limitador de velocidade', 'Fixação do sistema mecânico de segurança contra queda livre.', 4),
(10, 'Instalação do quadro de comando', 'Fixação física do painel elétrico principal de controle.', 6),
(11, 'Passagem de chicotes e cabeamentos', 'Instalação da fiação do poço, botoeiras e sensores.', 8),
(12, 'Montagem da cabine', 'Montagem do piso, teto, e painéis de parede da cabine do elevador.', 10),
(13, 'Montagem do contrapeso', 'Montagem do chassi e preenchimento com blocos de peso.', 5),
(14, 'Instalação das portas de pavimento', 'Fixação das portas automáticas em cada um dos andares.', 8),
(15, 'Instalação das botoeiras e sinalizações', 'Montagem dos painéis de chamada externos e displays.', 3),
(16, 'Instalação do operador de portas', 'Acoplamento do motor que abre a porta na cabine.', 4),
(17, 'Ajustes elétricos e parametrizações', 'Configuração inicial do inversor e lógica do quadro.', 5),
(18, 'Testes operacionais', 'Movimentação do elevador em velocidade reduzida de inspeção.', 3),
(19, 'Ajustes finais e acabamento', 'Polimento de guias, ajustes de nivelamento e barulho.', 2),
(20, 'Entrega técnica ao cliente', 'Realização de testes de segurança finais e liberação para uso comercial.', 1)
ON CONFLICT (phase_number) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    weight = EXCLUDED.weight;

-- =====================================================================
-- 3. ÍNDICES PARA ALTA PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_progress_project ON public.project_phases_progress(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_phase ON public.project_phases_progress(phase_id);
CREATE INDEX IF NOT EXISTS idx_weekly_project ON public.weekly_answers_log(project_id);
CREATE INDEX IF NOT EXISTS idx_weekly_date ON public.weekly_answers_log(week_start_date);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON public.projects(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_changelogs_record ON public.change_logs(record_id);

-- =====================================================================
-- 4. VIEWS GERENCIAIS (Métricas, Looker Studio e Dashboards)
-- =====================================================================

-- View Principal de Métricas do Projeto (tempo real, dias decorridos, dias restantes e atrasos)
CREATE OR REPLACE VIEW public.vw_project_metrics AS
WITH project_calculations AS (
    SELECT 
        p.id AS project_id,
        p.name AS project_name,
        p.start_date,
        p.deadline_date,
        p.status AS current_status,
        -- Total de dias corridos do projeto
        (p.deadline_date - p.start_date) AS total_duration_days,
        -- Dias decorridos até hoje
        GREATEST(0, CURRENT_DATE - p.start_date) AS days_elapsed,
        -- Dias restantes
        GREATEST(0, p.deadline_date - CURRENT_DATE) AS days_remaining,
        -- Cálculo ponderado do progresso real (PFP %)
        COALESCE(ROUND(SUM((pp.progress_percent::decimal * ph.weight::decimal) / 100.0)), 0) AS overall_progress_percent
    FROM public.projects p
    LEFT JOIN public.project_phases_progress pp ON p.id = pp.project_id
    LEFT JOIN public.phases ph ON pp.phase_id = ph.id
    GROUP BY p.id, p.name, p.start_date, p.deadline_date, p.status
)
SELECT 
    *,
    -- Progresso linear teórico esperado (ex: se 30 dias de 60 decorreram, espera-se 50%)
    CASE 
        WHEN total_duration_days <= 0 THEN 100
        ELSE LEAST(100, ROUND((days_elapsed::DECIMAL / total_duration_days::DECIMAL) * 100))
    END AS expected_linear_progress,
    -- Indicador lógico de atraso
    CASE
        WHEN overall_progress_percent = 100 THEN false
        WHEN CURRENT_DATE > deadline_date THEN true
        WHEN overall_progress_percent < (LEAST(100, ROUND((days_elapsed::DECIMAL / total_duration_days::DECIMAL) * 100)) - 10) THEN true -- Tolera 10% de folga
        ELSE false
    END AS is_delayed
FROM project_calculations;

-- View para BI / Google Looker Studio (Estrutura desnormalizada e limpa)
CREATE OR REPLACE VIEW public.vw_looker_studio_metrics AS
SELECT 
    pm.*,
    c.name AS company_name,
    t.name AS team_name,
    mgr.full_name AS manager_name,
    tech.full_name AS technician_name,
    proj.elevator_model,
    proj.assigned_technician_id,
    proj.company_id,
    proj.team_id,
    proj.assigned_manager_id,
    proj.notification_frequency
FROM public.vw_project_metrics pm
JOIN public.projects proj ON pm.project_id = proj.id
LEFT JOIN public.companies c ON proj.company_id = c.id
LEFT JOIN public.teams t ON proj.team_id = t.id
LEFT JOIN public.profiles mgr ON proj.assigned_manager_id = mgr.id
LEFT JOIN public.profiles tech ON proj.assigned_technician_id = tech.id;

-- View de Pendências e Ranking de Atrasos
CREATE OR REPLACE VIEW public.vw_pending_ranking AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    COUNT(pp.id) FILTER (WHERE NOT pp.started) AS not_started_phases_count,
    COUNT(pp.id) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100) AS in_progress_phases_count,
    STRING_AGG(ph.name, ', ' ORDER BY ph.phase_number) FILTER (WHERE NOT pp.started OR pp.progress_percent < 100) AS pending_phases_list
FROM public.projects p
JOIN public.project_phases_progress pp ON p.id = pp.project_id
JOIN public.phases ph ON pp.phase_id = ph.id
GROUP BY p.id, p.name;

-- =====================================================================
-- 5. AUTOMAÇÕES POR TRIGGERS & FUNCTIONS
-- =====================================================================

-- Função 1: Inicializa as 20 fases técnicas padrão ao criar uma obra
CREATE OR REPLACE FUNCTION public.fn_initialize_project_phases()
RETURNS TRIGGER AS $$
DECLARE
    phase_record RECORD;
BEGIN
    FOR phase_record IN SELECT id, phase_number FROM public.phases LOOP
        INSERT INTO public.project_phases_progress (project_id, phase_id, started, progress_percent)
        VALUES (NEW.id, phase_record.id, false, 0)
        ON CONFLICT (project_id, phase_id) DO NOTHING;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_initialize_project_phases
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_initialize_project_phases();

-- Função 2: Mantém histórico semanal atualizado (para curva S e gráficos de linha)
CREATE OR REPLACE FUNCTION public.fn_log_weekly_progress()
RETURNS TRIGGER AS $$
DECLARE
    week_start DATE;
BEGIN
    -- Obter a segunda-feira da semana atual
    week_start := date_trunc('week', now())::DATE;

    -- Upsert para salvar a foto da semana daquela fase específica
    INSERT INTO public.weekly_answers_log (project_id, phase_id, started, progress_percent, week_start_date)
    VALUES (NEW.project_id, NEW.phase_id, NEW.started, NEW.progress_percent, week_start)
    ON CONFLICT (project_id, phase_id, week_start_date) 
    DO UPDATE SET 
        started = EXCLUDED.started,
        progress_percent = EXCLUDED.progress_percent,
        created_at = now();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_weekly_progress
AFTER INSERT OR UPDATE ON public.project_phases_progress
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_weekly_progress();

-- Função 3: Auditoria automática de alterações (Change Logs)
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_profile_id UUID;
    record_id UUID;
BEGIN
    -- Tenta obter o ID do perfil a partir do auth.uid() do Supabase se disponível
    SELECT id INTO current_user_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    
    IF TG_OP = 'DELETE' THEN
        record_id := OLD.id;
        INSERT INTO public.change_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, record_id, TG_OP, row_to_json(OLD)::jsonb, current_user_profile_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        record_id := NEW.id;
        INSERT INTO public.change_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, record_id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user_profile_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        record_id := NEW.id;
        INSERT INTO public.change_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, record_id, TG_OP, row_to_json(NEW)::jsonb, current_user_profile_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_projects
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();

CREATE TRIGGER tr_audit_progress
AFTER INSERT OR UPDATE OR DELETE ON public.project_phases_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();

-- =====================================================================
-- 6. POLÍCIES DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- =====================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_answers_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Políticas Públicas de Visualização (Simplificadas para testes de MVP e Dashboard Web)
CREATE POLICY "Leitura irrestrita para usuários autenticados" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de equipes" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de membros de equipe" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de projetos" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de fases catálogo" ON public.phases FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de progresso" ON public.project_phases_progress FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de logs semanais" ON public.weekly_answers_log FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de logs de auditoria" ON public.change_logs FOR SELECT USING (true);
CREATE POLICY "Leitura irrestrita de sessões do bot" ON public.bot_sessions FOR SELECT USING (true);

-- 2. Políticas de Edição (Somente Administradores ou sistema de webhook)
CREATE POLICY "Modificação irrestrita para gerenciamento" ON public.companies FOR ALL USING (true);
CREATE POLICY "Modificação irrestrita de perfis" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Modificação irrestrita de equipes" ON public.teams FOR ALL USING (true);
CREATE POLICY "Modificação irrestrita de membros de equipe" ON public.team_members FOR ALL USING (true);
CREATE POLICY "Modificação irrestrita de projetos" ON public.projects FOR ALL USING (true);
CREATE POLICY "Modificação irrestrita de progresso" ON public.project_phases_progress FOR ALL USING (true);
CREATE POLICY "Modificação de logs semanais" ON public.weekly_answers_log FOR ALL USING (true);
CREATE POLICY "Modificação de logs de auditoria" ON public.change_logs FOR ALL USING (true);
CREATE POLICY "Modificação de sessões do bot" ON public.bot_sessions FOR ALL USING (true);

-- =====================================================================
-- 7. MODELOS DE PAYLOAD JSON E FORMATOS DE INTEGRAÇÃO (DOCUMENTAÇÃO SQL)
-- =====================================================================

/*
  Abaixo estão documentadas as estruturas prontas para integração com Evolution API, n8n e Looker Studio.
  
  7.1 ESTRUTURA JSON DA RESPOSTA (Armazenada e processada via webhook):
  {
    "project_id": "7bf3b3ef-88eb-4cd5-ba58-868670b0cc82",
    "phase_number": 5,
    "started": true,
    "progress_percent": 50,
    "reporter": {
      "telegram_chat_id": "123456789",
      "name": "João da Silva",
      "role": "technician"
    },
    "timestamp": "2026-05-25T23:30:00Z"
  }

  7.2 MODELO DE PAYLOAD WEBHOOK (Saída para n8n / Evolution API):
  Para integrar com n8n ou Evolution API, configure um webhook de banco de dados (Database Webhook)
  no painel do Supabase apontando para a URL do seu n8n. O payload enviado conterá a seguinte estrutura automática:
  {
    "type": "UPDATE",
    "table": "project_phases_progress",
    "schema": "public",
    "record": {
      "id": "e458e0a3-f09b-4395-88d4-8ceb264e1d52",
      "project_id": "7bf3b3ef-88eb-4cd5-ba58-868670b0cc82",
      "phase_id": "a90df232-a50d-45db-bc7a-5db00df2d233",
      "started": true,
      "progress_percent": 75,
      "updated_at": "2026-05-25T23:30:00Z"
    },
    "old_record": {
      "id": "e458e0a3-f09b-4395-88d4-8ceb264e1d52",
      "project_id": "7bf3b3ef-88eb-4cd5-ba58-868670b0cc82",
      "phase_id": "a90df232-a50d-45db-bc7a-5db00df2d233",
      "started": true,
      "progress_percent": 50,
      "updated_at": "2026-05-25T20:00:00Z"
    }
  }

  7.3 FUNÇÃO AUXILIAR PARA RETORNAR PAYLOAD FORMATADO (Pronto para n8n):
  Esta função retorna todos os dados de uma alteração de progresso consolidados em um único JSON,
  evitando que o n8n precise fazer várias consultas no Supabase.
*/

CREATE OR REPLACE FUNCTION public.fn_get_n8n_integration_payload(progress_id UUID)
RETURNS JSONB AS $$
DECLARE
    payload JSONB;
BEGIN
    SELECT jsonb_build_object(
        'event_id', ppp.id,
        'project', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'elevator_model', p.elevator_model,
            'start_date', p.start_date,
            'deadline_date', p.deadline_date,
            'status', p.status
        ),
        'phase', jsonb_build_object(
            'number', ph.phase_number,
            'name', ph.name
        ),
        'progress', jsonb_build_object(
            'started', ppp.started,
            'percent', ppp.progress_percent,
            'updated_at', ppp.updated_at
        ),
        'metrics', jsonb_build_object(
            'overall_progress_percent', pm.overall_progress_percent,
            'days_elapsed', pm.days_elapsed,
            'days_remaining', pm.days_remaining,
            'is_delayed', pm.is_delayed
        )
    ) INTO payload
    FROM public.project_phases_progress ppp
    JOIN public.projects p ON ppp.project_id = p.id
    JOIN public.phases ph ON ppp.phase_id = ph.id
    JOIN public.vw_project_metrics pm ON p.id = pm.project_id
    WHERE ppp.id = progress_id;

    RETURN payload;
END;
$$ LANGUAGE plpgsql;

-- 8. CONFIGURAÇÃO DE LEMBRETES AGENDADOS (pg_cron + pg_net)
-- Habilita as extensões necessárias para agendamento assíncrono de chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendamento de Lembretes Diários (Todos os dias às 10:00 UTC / 07:00 Horário de Brasília)
SELECT cron.schedule(
  'daily-telegram-reminders',
  '0 10 * * *',
  $$ SELECT net.http_post(
       url := 'https://ovprluqhqhlolijrmkjl.supabase.co/functions/v1/telegram-bot',
       body := '{"action": "trigger_reminders", "frequency": "daily"}'::jsonb
     );
  $$
);

-- Agendamento de Lembretes Semanais (Toda segunda-feira às 10:00 UTC / 07:00 Horário de Brasília)
SELECT cron.schedule(
  'weekly-telegram-reminders',
  '0 10 * * 1',
  $$ SELECT net.http_post(
       url := 'https://ovprluqhqhlolijrmkjl.supabase.co/functions/v1/telegram-bot',
       body := '{"action": "trigger_reminders", "frequency": "weekly"}'::jsonb
     );
  $$
);

-- Agendamento de Lembretes Mensais (Todo dia 1º de cada mês às 10:00 UTC / 07:00 Horário de Brasília)
SELECT cron.schedule(
  'monthly-telegram-reminders',
  '0 10 1 * *',
  $$ SELECT net.http_post(
       url := 'https://ovprluqhqhlolijrmkjl.supabase.co/functions/v1/telegram-bot',
       body := '{"action": "trigger_reminders", "frequency": "monthly"}'::jsonb
     );
  $$
);
