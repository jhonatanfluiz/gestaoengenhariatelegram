import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Activity, CheckCircle, TrendingUp, Plus, Users, Wrench, Settings, 
  LogOut, Bell, ArrowLeft, AlertTriangle, UserCheck, RefreshCw, 
  Smartphone, ShieldAlert, Check, X, ChevronRight, ChevronDown, HardHat, Calendar,
  Building, Briefcase, Clock, FileText, BarChart2, Shield, Eye, Brain, Sparkles,
  Send, Trash2, Upload, FileSpreadsheet
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active view states: 'projects' | 'teams' | 'companies' | 'phases' | 'history' | 's-curve' | 'ranking' | 'new-registry'
  const [activeTab, setActiveTab] = useState('projects');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Registration sub-tab: 'project' | 'team' | 'tech' | 'company'
  const [regSubTab, setRegSubTab] = useState('project');

  // Data lists
  const [projects, setProjects] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [phasesList, setPhasesList] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [pendingRankings, setPendingRankings] = useState([]);
  
  // Active selected elements
  const [activeProject, setActiveProject] = useState(null);
  const [projectPhases, setProjectPhases] = useState([]);
  const [projectLogs, setProjectLogs] = useState([]);

  // S-Curve states
  const [sCurveProjId, setSCurveProjId] = useState('');
  const [sCurveData, setSCurveData] = useState([]);

  // Editing state for CRUD (Obras, Equipes, Técnicos, Empresas)
  const [editingElement, setEditingElement] = useState(null);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editTechId, setEditTechId] = useState('');
  const [editNotificationFreq, setEditNotificationFreq] = useState('weekly');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadlineDate, setEditDeadlineDate] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editCnpj, setEditCnpj] = useState('');


  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Project sub-tab navigation
  const [projectSubTab, setProjectSubTab] = useState('phases'); // 'phases' | 'report' | 'history'

  // Report modal state
  const [activeReportModal, setActiveReportModal] = useState(null); // { type: 'tech' | 'company', data: item }
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [tempGeminiKey, setTempGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  // Project-specific AI Forecast
  const [projectForecast, setProjectForecast] = useState(() => {
    try {
      const saved = localStorage.getItem('project_forecasts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [forecastLoading, setForecastLoading] = useState(false);

  const updateProjectForecast = (projectId, text) => {
    setProjectForecast(prev => {
      const updated = { ...prev, [projectId]: text };
      localStorage.setItem('project_forecasts', JSON.stringify(updated));
      return updated;
    });
  };

  const [rankingMonthFilter, setRankingMonthFilter] = useState('all');

  // AI Chat Assistant States
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('elevatesync_chat_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler historico de chat:', e);
    }
    return [
      { 
        role: 'assistant', 
        content: 'Olá! Sou o Assistente IA do ElevateSync. Tenho acesso completo a todas as obras, técnicos, equipes e logs de auditoria em tempo real.\n\nPosso te ajudar com análises de prazos, resumos para colar no WhatsApp, dúvidas técnicas sobre montagem ou relatórios operacionais. Como posso ajudar hoje?', 
        timestamp: new Date().toISOString() 
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const getProjectLinearEstimate = (proj) => {
    if (!proj) return { text: 'Aguardando progresso...', daysRemaining: 0, date: null, isDelayed: false };
    
    const progress = proj.overall_progress_percent || 0;
    const elapsed = proj.days_elapsed || 0;
    
    if (progress > 0) {
      if (progress === 100) {
        return { text: 'Concluída', daysRemaining: 0, date: null, isDelayed: false };
      }
      const dailyRate = progress / Math.max(1, elapsed);
      const totalEstimatedDays = Math.round(100 / dailyRate);
      const daysRemaining = Math.max(0, totalEstimatedDays - elapsed);
      
      const startDateObj = new Date(proj.start_date);
      startDateObj.setDate(startDateObj.getDate() + totalEstimatedDays);
      
      const deadlineDateObj = new Date(proj.deadline_date);
      const isDelayed = startDateObj > deadlineDateObj;
      
      return {
        text: `${startDateObj.toLocaleDateString()} (~${daysRemaining} dias adicionais)`,
        daysRemaining,
        date: startDateObj,
        isDelayed
      };
    } else if (elapsed > 0) {
      return { text: 'Nenhum avanço registrado', daysRemaining: 0, date: null, isDelayed: false };
    } else {
      return { text: 'Aguardando início', daysRemaining: 0, date: null, isDelayed: false };
    }
  };

  // Forms
  const [newProjName, setNewProjName] = useState('');
  const [newProjModel, setNewProjModel] = useState('');
  const [newProjCompanyId, setNewProjCompanyId] = useState('');
  const [newProjTeamId, setNewProjTeamId] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState('');
  const [newProjTechId, setNewProjTechId] = useState('');
  const [newProjNotificationFreq, setNewProjNotificationFreq] = useState('weekly');
  const [newProjStartDate, setNewProjStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newProjDeadline, setNewProjDeadline] = useState('');

  const [newTechName, setNewTechName] = useState('');
  const [newTechTelegram, setNewTechTelegram] = useState('');
  const [newTechCompanyId, setNewTechCompanyId] = useState('');

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCnpj, setNewCompanyCnpj] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCompanyId, setNewTeamCompanyId] = useState('');

  const [msgNotification, setMsgNotification] = useState(null);

  // Auto-calculate deadline to start_date + 60 days on change
  useEffect(() => {
    if (newProjStartDate) {
      const start = new Date(newProjStartDate);
      start.setDate(start.getDate() + 60);
      setNewProjDeadline(start.toISOString().split('T')[0]);
    }
  }, [newProjStartDate]);

  // Handle page printing body classes for modals
  useEffect(() => {
    const handleBeforePrint = () => {
      if (activeReportModal) {
        document.body.classList.add('printing-modal');
      }
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-modal');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [activeReportModal]);

  // Auth and PWA initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
    if (isIOSDevice && !window.navigator.standalone) {
      setShowInstallBanner(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  // Real-time PostgreSQL changes subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('realtime-installation-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_phases_progress' }, () => {
        fetchDashboardData();
        if (activeProject) {
          fetchProjectPhases(activeProject.project_id);
          fetchProjectAuditLogs(activeProject.project_id);
        }
        if (sCurveProjId) {
          fetchSCurveData(sCurveProjId);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeProject, sCurveProjId]);

  // Fetch S-Curve data when a project is selected
  useEffect(() => {
    if (session && sCurveProjId) {
      fetchSCurveData(sCurveProjId);
    } else {
      setSCurveData([]);
    }
  }, [sCurveProjId, session]);

  const showToast = (text, type = 'success') => {
    setMsgNotification({ text, type });
    setTimeout(() => setMsgNotification(null), 4000);
  };

  const fetchDashboardData = async () => {
    // 1. Fetch pre-calculated project metrics from view
    const { data: projs, error: err1 } = await supabase
      .from('vw_looker_studio_metrics')
      .select('*');

    if (err1) console.error(err1);
    else {
      setProjects(projs || []);
      // Set default project for S-Curve if none selected
      if (projs && projs.length > 0 && !sCurveProjId) {
        setSCurveProjId(projs[0].project_id);
      }
    }

    // 2. Fetch technicians
    const { data: techs, error: err2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name');

    if (err2) console.error(err2);
    else setTechnicians(techs || []);

    // 3. Fetch managers
    const { data: mgrs, error: err3 } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .order('full_name');

    if (err3) console.error(err3);
    else setManagers(mgrs || []);

    // 4. Fetch companies
    const { data: comps, error: err4 } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (err4) console.error(err4);
    else setCompanies(comps || []);

    // 5. Fetch teams
    const { data: tms, error: err5 } = await supabase
      .from('teams')
      .select('*, companies(name)')
      .order('name');

    if (err5) console.error(err5);
    else setTeams(tms || []);

    // 6. Fetch 20 Standard Phases Catalog
    const { data: phs, error: err6 } = await supabase
      .from('phases')
      .select('*')
      .order('phase_number');

    if (err6) console.error(err6);
    else setPhasesList(phs || []);

    // 7. Fetch all audit logs
    const { data: logs, error: err7 } = await supabase
      .from('change_logs')
      .select(`
        *,
        changed_by_profile:profiles(full_name)
      `)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (err7) console.error(err7);
    else setAllLogs(logs || []);

    // 8. Fetch Pending Rankings
    const { data: rank, error: err8 } = await supabase
      .from('vw_pending_ranking')
      .select('*');

    if (err8) console.error(err8);
    else setPendingRankings(rank || []);
  };

  const fetchProjectPhases = async (projId) => {
    const { data, error } = await supabase
      .from('project_phases_progress')
      .select(`
        id,
        started,
        progress_percent,
        updated_at,
        phases (
          id,
          phase_number,
          name,
          description
        )
      `)
      .eq('project_id', projId);

    if (error) {
      console.error(error);
    } else {
      const sorted = data.sort((a, b) => a.phases.phase_number - b.phases.phase_number);
      setProjectPhases(sorted);
    }
  };

  const fetchProjectAuditLogs = async (projId) => {
    const { data, error } = await supabase
      .from('change_logs')
      .select(`
        *,
        changed_by_profile:profiles(full_name)
      `)
      .eq('record_id', projId)
      .order('changed_at', { ascending: false })
      .limit(10);

    if (error) console.error(error);
    else setProjectLogs(data || []);
  };

  const fetchSCurveData = async (projId) => {
    const { data, error } = await supabase
      .from('weekly_answers_log')
      .select('week_start_date, progress_percent')
      .eq('project_id', projId);

    if (error) {
      console.error(error);
      return;
    }

    // Group logs by week and calculate project overall average progress for each week
    const weeklyProgressMap = {};
    data.forEach(log => {
      const week = log.week_start_date;
      if (!weeklyProgressMap[week]) {
        weeklyProgressMap[week] = { sum: 0, count: 0 };
      }
      weeklyProgressMap[week].sum += log.progress_percent;
      weeklyProgressMap[week].count += 1;
    });

    const formattedSCurve = Object.keys(weeklyProgressMap).map(week => {
      const avg = Math.round(weeklyProgressMap[week].sum / 20); // Average of 20 phases
      return {
        week,
        progress: avg
      };
    }).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    setSCurveData(formattedSCurve);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else {
        await supabase.from('profiles').insert({
          id: data.user.id,
          auth_user_id: data.user.id,
          full_name: 'Gestor Administrativo',
          role: 'manager'
        });
        showToast('Cadastro de gestor efetuado!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      else showToast('Login efetuado com sucesso!');
    }
    setLoading(false);
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName || !newProjModel || !newProjCompanyId) {
      showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newProjName,
        elevator_model: newProjModel,
        company_id: newProjCompanyId,
        team_id: newProjTeamId || null,
        assigned_manager_id: newProjManagerId || null,
        assigned_technician_id: newProjTechId || null,
        notification_frequency: newProjNotificationFreq || 'weekly',
        start_date: newProjStartDate,
        deadline_date: newProjDeadline
      })
      .select()
      .single();

    if (error) {
      showToast('Erro ao criar obra: ' + error.message, 'danger');
    } else {
      showToast(`Obra "${newProjName}" criada. 20 fases padrão inicializadas!`);
      setNewProjName('');
      setNewProjModel('');
      setNewProjCompanyId('');
      setNewProjTeamId('');
      setNewProjManagerId('');
      setNewProjTechId('');
      setNewProjNotificationFreq('weekly');
      setActiveTab('projects');
      fetchDashboardData();
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName) return;

    const { error } = await supabase
      .from('companies')
      .insert({
        name: newCompanyName,
        cnpj: newCompanyCnpj || null
      });

    if (error) showToast('Erro ao cadastrar empresa: ' + error.message, 'danger');
    else {
      showToast(`Empresa "${newCompanyName}" cadastrada!`);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setActiveTab('companies');
      fetchDashboardData();
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName || !newTeamCompanyId) return;

    const { error } = await supabase
      .from('teams')
      .insert({
        name: newTeamName,
        company_id: newTeamCompanyId
      });

    if (error) showToast('Erro ao criar equipe: ' + error.message, 'danger');
    else {
      showToast(`Equipe "${newTeamName}" criada!`);
      setNewTeamName('');
      setNewTeamCompanyId('');
      setActiveTab('teams');
      fetchDashboardData();
    }
  };

  const handleCreateTechnician = async (e) => {
    e.preventDefault();
    if (!newTechName || !newTechTelegram) return;

    const { error } = await supabase
      .from('profiles')
      .insert({
        full_name: newTechName,
        telegram_chat_id: newTechTelegram,
        company_id: newTechCompanyId || null,
        role: 'technician'
      });

    if (error) showToast('Erro ao cadastrar técnico: ' + error.message, 'danger');
    else {
      showToast(`Técnico "${newTechName}" cadastrado!`);
      setNewTechName('');
      setNewTechTelegram('');
      setNewTechCompanyId('');
      setActiveTab('teams'); // Go to teams tab to view teammates
      fetchDashboardData();
    }
  };

  const handlePhaseOverride = async (phaseId, phaseNumber, started, progress) => {
    if (!activeProject) return;

    const { error } = await supabase
      .from('project_phases_progress')
      .update({
        started,
        progress_percent: progress,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', activeProject.project_id)
      .eq('phase_id', phaseId);

    if (error) {
      showToast('Erro ao atualizar progresso: ' + error.message, 'danger');
    } else {
      showToast(`Fase ${phaseNumber} atualizada para ${progress}%!`);
      
      fetchProjectPhases(activeProject.project_id);
      fetchProjectAuditLogs(activeProject.project_id);
      
      const { data: updatedProj } = await supabase
        .from('vw_looker_studio_metrics')
        .select('*')
        .eq('project_id', activeProject.project_id)
        .maybeSingle();

      if (updatedProj) {
        setActiveProject(updatedProj);
      }
      fetchDashboardData();
    }
  };

  const handleUpdateDeadline = async (newDate) => {
    if (!activeProject) return;

    const { error } = await supabase
      .from('projects')
      .update({ deadline_date: newDate })
      .eq('id', activeProject.project_id);

    if (error) {
      showToast('Erro ao alterar prazo: ' + error.message, 'danger');
    } else {
      showToast('Prazo final atualizado com sucesso!');
      
      const { data: updatedProj } = await supabase
        .from('vw_looker_studio_metrics')
        .select('*')
        .eq('project_id', activeProject.project_id)
        .maybeSingle();

      if (updatedProj) {
        setActiveProject(updatedProj);
      }
      fetchDashboardData();
    }
  };

  const handleUpdateNotificationFrequency = async (freq) => {
    if (!activeProject) return;

    const { error } = await supabase
      .from('projects')
      .update({ notification_frequency: freq })
      .eq('id', activeProject.project_id);

    if (error) {
      showToast('Erro ao alterar frequência de lembretes: ' + error.message, 'danger');
    } else {
      showToast('Frequência de lembrete atualizada com sucesso!');
      
      const { data: updatedProj } = await supabase
        .from('vw_looker_studio_metrics')
        .select('*')
        .eq('project_id', activeProject.project_id)
        .maybeSingle();

      if (updatedProj) {
        setActiveProject(updatedProj);
      }
      fetchDashboardData();
    }
  };

  // --- CRUD FUNCTIONS FOR EDIT & DELETE ---

  const startEdit = (type, item) => {
    setEditingElement({ type, data: item });
    if (type === 'project') {
      setEditName(item.project_name || item.name || '');
      setEditModel(item.elevator_model || '');
      setEditCompanyId(item.company_id || '');
      setEditTeamId(item.team_id || '');
      setEditManagerId(item.assigned_manager_id || '');
      setEditTechId(item.assigned_technician_id || '');
      setEditNotificationFreq(item.notification_frequency || 'weekly');
      setEditStartDate(item.start_date || '');
      setEditDeadlineDate(item.deadline_date || '');
    } else if (type === 'team') {
      setEditName(item.name || '');
      setEditCompanyId(item.company_id || '');
    } else if (type === 'tech') {
      setEditName(item.full_name || '');
      setEditTelegram(item.telegram_chat_id || '');
      setEditCompanyId(item.company_id || '');
    } else if (type === 'company') {
      setEditName(item.name || '');
      setEditCnpj(item.cnpj || '');
    }
  };

  // DELETE Handlers
  const handleDeleteProject = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta obra? Todas as fases, logs semanais e sessões do bot vinculados serão excluídos permanentemente.')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir obra: ' + error.message, 'danger');
    } else {
      showToast('Obra excluída com sucesso!');
      if (activeProject && activeProject.project_id === id) {
        setActiveProject(null);
      }
      fetchDashboardData();
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta equipe? As obras associadas ficarão sem equipe e a relação de membros da equipe será limpa.')) return;
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir equipe: ' + error.message, 'danger');
    } else {
      showToast('Equipe excluída com sucesso!');
      fetchDashboardData();
    }
  };

  const handleDeleteTechnician = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este técnico?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir técnico: ' + error.message, 'danger');
    } else {
      showToast('Técnico excluído com sucesso!');
      fetchDashboardData();
    }
  };

  const handleSendTestMessage = async (tech) => {
    if (!tech.telegram_chat_id) {
      showToast('Este técnico não possui um Telegram Chat ID cadastrado!', 'danger');
      return;
    }
    
    showToast('Enviando mensagem de teste...');
    try {
      const { data, error } = await supabase.functions.invoke('telegram-bot', {
        body: {
          action: 'send_test',
          chat_id: tech.telegram_chat_id,
          text: `⚡ *Teste de Conexão ElevateSync*\n\nOlá *${tech.full_name}*!\n\nEste é um teste de integração de mensagens do painel administrativo. O seu bot do Telegram está configurado corretamente com o Chat ID \`${tech.telegram_chat_id}\`!`
        }
      });

      if (error) throw error;
      showToast('Mensagem de teste enviada com sucesso!');
    } catch (err) {
      console.error('Erro ao enviar mensagem de teste:', err);
      showToast('Erro ao enviar mensagem de teste: ' + err.message, 'danger');
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta empresa contratada? As equipes dela serão excluídas, os técnicos serão desvinculados e as obras associadas ficarão sem empresa contratada.')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir empresa: ' + error.message, 'danger');
    } else {
      showToast('Empresa excluída com sucesso!');
      fetchDashboardData();
    }
  };

  // UPDATE Handlers
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingElement) return;
    const id = editingElement.data.project_id || editingElement.data.id;
    
    const { error } = await supabase
      .from('projects')
      .update({
        name: editName,
        elevator_model: editModel,
        company_id: editCompanyId || null,
        team_id: editTeamId || null,
        assigned_manager_id: editManagerId || null,
        assigned_technician_id: editTechId || null,
        notification_frequency: editNotificationFreq || 'weekly',
        start_date: editStartDate,
        deadline_date: editDeadlineDate
      })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar obra: ' + error.message, 'danger');
    } else {
      showToast('Obra atualizada com sucesso!');
      setEditingElement(null);
      if (activeProject && activeProject.project_id === id) {
        // Refresh activeProject info
        const { data: updatedProj } = await supabase
          .from('vw_looker_studio_metrics')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        if (updatedProj) {
          setActiveProject(updatedProj);
        }
      }
      fetchDashboardData();
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editingElement) return;
    const id = editingElement.data.id;

    const { error } = await supabase
      .from('teams')
      .update({
        name: editName,
        company_id: editCompanyId || null
      })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar equipe: ' + error.message, 'danger');
    } else {
      showToast('Equipe atualizada com sucesso!');
      setEditingElement(null);
      fetchDashboardData();
    }
  };

  const handleUpdateTechnician = async (e) => {
    e.preventDefault();
    if (!editingElement) return;
    const id = editingElement.data.id;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        telegram_chat_id: editTelegram,
        company_id: editCompanyId || null
      })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar técnico: ' + error.message, 'danger');
    } else {
      showToast('Técnico atualizado com sucesso!');
      setEditingElement(null);
      fetchDashboardData();
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!editingElement) return;
    const id = editingElement.data.id;

    const { error } = await supabase
      .from('companies')
      .update({
        name: editName,
        cnpj: editCnpj || null
      })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar empresa: ' + error.message, 'danger');
    } else {
      showToast('Empresa atualizada com sucesso!');
      setEditingElement(null);
      fetchDashboardData();
    }
  };

  const handleOpenReportModal = async (type, item) => {
    setActiveReportModal({ type, data: item });
    setReportLoading(true);
    setAiAnalysis('');
    setAiLoading(false);
    setShowKeyConfig(false);
    
    try {
      const relatedProjects = projects.filter(p => 
        type === 'tech' ? p.assigned_technician_id === item.id : p.company_id === item.id
      );

      if (relatedProjects.length === 0) {
        setReportData({ projects: [], averages: {}, catalogPhases: [] });
        setReportLoading(false);
        return;
      }

      const projectIds = relatedProjects.map(p => p.project_id);

      // Fetch weekly logs
      const { data: weeklyLogs, error: err1 } = await supabase
        .from('weekly_answers_log')
        .select('*')
        .in('project_id', projectIds);

      if (err1) throw err1;

      // Fetch phase progress
      const { data: phasesProgress, error: err2 } = await supabase
        .from('project_phases_progress')
        .select(`
          id,
          project_id,
          started,
          progress_percent,
          updated_at,
          phase_id,
          phases (
            id,
            phase_number,
            name,
            description
          )
        `)
        .in('project_id', projectIds);

      if (err2) throw err2;

      // Fetch the catalog of 20 phases to map names easily
      const { data: catalogPhases, error: err3 } = await supabase
        .from('phases')
        .select('*')
        .order('phase_number');

      if (err3) throw err3;

      // Calculate time spent per phase (efficiency metrics)
      const durations = {}; // key: phase_number, value: array of durations in days

      relatedProjects.forEach(proj => {
        const projLogs = (weeklyLogs || []).filter(l => l.project_id === proj.project_id);
        const projProgress = (phasesProgress || []).filter(p => p.project_id === proj.project_id);

        catalogPhases.forEach(catPhase => {
          const phaseId = catPhase.id;
          const phaseNum = catPhase.phase_number;
          const currentProgress = projProgress.find(p => p.phase_id === phaseId);
          const phaseLogs = projLogs.filter(l => l.phase_id === phaseId).sort((a, b) => new Date(a.week_start_date) - new Date(b.week_start_date));

          let startDate = null;
          let endDate = null;

          const firstStartLog = phaseLogs.find(l => l.progress_percent > 0);
          if (firstStartLog) {
            startDate = new Date(firstStartLog.week_start_date);
          } else if (currentProgress && currentProgress.progress_percent > 0) {
            startDate = new Date(proj.start_date);
          }

          const firstEndLog = phaseLogs.find(l => l.progress_percent === 100);
          if (firstEndLog) {
            endDate = new Date(firstEndLog.week_start_date);
          } else if (currentProgress && currentProgress.progress_percent === 100) {
            endDate = new Date(currentProgress.updated_at);
          }

          if (startDate) {
            let durationDays = 0;
            if (endDate) {
              durationDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
            } else {
              durationDays = Math.max(1, Math.round((new Date() - startDate) / (1000 * 60 * 60 * 24)));
            }
            if (!durations[phaseNum]) {
              durations[phaseNum] = [];
            }
            durations[phaseNum].push(durationDays);
          }
        });
      });

      // Calculate average durations
      const averages = {};
      catalogPhases.forEach(catPhase => {
        const phaseNum = catPhase.phase_number;
        const list = durations[phaseNum] || [];
        if (list.length > 0) {
          const sum = list.reduce((a, b) => a + b, 0);
          averages[phaseNum] = Math.round((sum / list.length) * 10) / 10;
        } else {
          averages[phaseNum] = 0; // Not started or no data
        }
      });

      setReportData({
        projects: relatedProjects,
        averages,
        catalogPhases
      });
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar dados do relatório: ' + e.message, 'danger');
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateAIReport = async () => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const localKey = localStorage.getItem('gemini_api_key');
    const key = tempGeminiKey || localKey || envKey;
    if (!key) {
      showToast('Por favor, configure sua chave da API do Gemini.', 'danger');
      return;
    }

    setAiLoading(true);
    setAiAnalysis('');

    try {
      const type = activeReportModal.type;
      const name = activeReportModal.data.full_name || activeReportModal.data.name;
      const { projects: relProj, averages, catalogPhases } = reportData;

      // Build data description
      let dataText = '';
      catalogPhases.forEach(ph => {
        const days = averages[ph.phase_number];
        dataText += `- Fase ${ph.phase_number}: ${ph.name} -> Tempo Médio Gasto: ${days > 0 ? `${days} dias` : 'Sem registros ou não iniciada'}\n`;
      });

      const prompt = type === 'tech'
        ? `Você é um supervisor de instalação de elevadores comerciais e especialista em gestão de obras.
Analise os seguintes dados operacionais do técnico de campo "${name}" nos últimos 12 meses.

**Métricas Operacionais:**
- Obras sob responsabilidade: ${relProj.length}
- Progresso médio das obras: ${relProj.length > 0 ? Math.round(relProj.reduce((acc, p) => acc + p.overall_progress_percent, 0) / relProj.length) : 0}%
- Obras atrasadas: ${relProj.filter(p => p.is_delayed).length}

**Tempo médio gasto por fase técnica de montagem:**
${dataText}

Por favor, faça uma análise aprofundada:
1. **Pontuação de Eficiência**: Atribua uma nota de 0 a 100 com base nos prazos e andamento, justificando-a.
2. **Gargalos Operacionais**: Identifique as fases onde o técnico mais perdeu tempo (fases com maior média de dias). Explique as possíveis razões técnicas para o atraso nessas fases específicas de elevadores comerciais (ex: alinhamento do chassi, ajuste de portas de pavimento, fiação elétrica ou cabos de tração).
3. **Plano de Ação e Recomendações**: Forneça recomendações de treinamento técnico ou melhorias de processo para que ele consiga otimizar esses gargalos e entregar dentro do prazo padrão de 60 dias.

Gere o relatório formatado em Markdown rico e profissional (use emojis, seções claras e bullet points).`
        : `Você é um auditor sênior de engenharia de elevadores comerciais e especialista em processos operacionais.
Analise os seguintes dados consolidados da empresa contratada "${name}" nos últimos 12 meses.

**Métricas da Empresa:**
- Total de obras em andamento/concluídas: ${relProj.length}
- Progresso médio geral: ${relProj.length > 0 ? Math.round(relProj.reduce((acc, p) => acc + p.overall_progress_percent, 0) / relProj.length) : 0}%
- Obras com status de atraso: ${relProj.filter(p => p.is_delayed).length}

**Tempo médio gasto por fase técnica de montagem nas equipes da empresa:**
${dataText}

Por favor, faça um relatório de auditoria operacional:
1. **Índice de Eficiência Geral**: Dê uma pontuação de 0 a 100 para a empresa, analisando o cumprimento de prazos.
2. **Identificação de Gargalos de Equipes**: Aponte as fases técnicas críticas que representam os maiores atrasos agregados na montagem. Forneça o contexto técnico envolvido nestas etapas críticas de elevadores comerciais.
3. **Recomendações Gerenciais**: Sugira melhorias gerenciais de planejamento (ex: planejamento de entrega de guias, logística de frete, cronograma semanal de avanço com técnicos, integração Conversacional/Telegram) para mitigar atrasos e garantir o limite padrão de 60 dias.

Gere o relatório formatado em Markdown rico e profissional (use emojis, seções claras e bullet points).`;

      const candidates = [
        { version: 'v1', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' }
      ];

      let response = null;
      let lastErrorMsg = '';

      for (const cand of candidates) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${cand.version}/models/${cand.model}:generateContent?key=${key}`, {
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
            response = res;
            break;
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

      if (!response) {
        throw new Error(lastErrorMsg || 'Erro de comunicação com a API do Gemini.');
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível extrair a resposta do modelo.';
      setAiAnalysis(text);
      
      // Save key if it worked
      if (tempGeminiKey && tempGeminiKey.trim()) {
        localStorage.setItem('gemini_api_key', tempGeminiKey);
        setShowKeyConfig(false);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro na análise da IA: ' + e.message, 'danger');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateProjectForecast = async () => {
    if (!activeProject) return;

    const key = tempGeminiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      showToast('Por favor, configure sua Gemini API Key na aba de relatórios de eficiência ou no próprio painel para habilitar a previsão.', 'warning');
      return;
    }

    setForecastLoading(true);

    try {
      const completedList = projectPhases.filter(p => p.progress_percent === 100).map(p => `Fase ${p.phases.phase_number}: ${p.phases.name}`);
      const pendingList = projectPhases.filter(p => p.progress_percent < 100).map(p => `Fase ${p.phases.phase_number}: ${p.phases.name} (${p.progress_percent}% concluído)`);

      const prompt = `Você é um supervisor sênior especialista em instalação de elevadores comerciais. 
Estime de forma realista a data estimada de término e o status do projeto baseado nas informações abaixo.

**Dados da Obra:**
- Nome da Obra: ${activeProject.project_name}
- Modelo do Elevador: ${activeProject.elevator_model}
- Data de Início: ${activeProject.start_date}
- Data Limite do Contrato (Deadline): ${activeProject.deadline_date} (Prazo total padrão de 60 dias corridos)
- Dias Decorridos desde o Início: ${activeProject.days_elapsed} dias
- Progresso Físico Real Acumulado: ${activeProject.overall_progress_percent}%

**Fases Já Concluídas (${completedList.length}/20):**
${completedList.length > 0 ? completedList.join('\n') : 'Nenhuma fase concluída ainda.'}

**Fases Restantes/Pendentes (${pendingList.length}/20):**
${pendingList.length > 0 ? pendingList.join('\n') : 'Todas as fases concluídas.'}

**Sua tarefa:**
Escreva uma previsão técnica muito objetiva de término para o gestor.
1. **Previsão Realista de Término**: Qual a estimativa de dias adicionais e a data aproximada no calendário (ex: DD/MM/AAAA ou meados de tal mês)? Lembre-se que as fases finais de montagem (Ajustes elétricos, Testes operacionais, Ajustes finais e acabamento, Entrega técnica ao cliente) são complexas, exigem precisão de testes e costumam levar cerca de 3 a 5 dias cada caso haja problemas de fiação ou nivelamento.
2. **Status da Obra**: O projeto deve terminar Dentro do Prazo ou Atrasar? Justifique com base nos dias restantes.
3. **Ponto de Atenção Técnico**: Cite qual das fases pendentes exige maior cuidado de montagem e por quê.

Gere uma resposta curta (máximo de 150 palavras), formatada de maneira limpa com negritos nos prazos e datas. Não use introduções formais.`;

      const candidates = [
        { version: 'v1', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' }
      ];

      let response = null;
      let lastErrorMsg = '';

      for (const cand of candidates) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${cand.version}/models/${cand.model}:generateContent?key=${key}`, {
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
            response = res;
            break;
          } else {
            const errJson = await res.json().catch(() => ({}));
            lastErrorMsg = errJson.error?.message || `Status ${res.status} para o modelo ${cand.model} (${cand.version})`;
          }
        } catch (err) {
          lastErrorMsg = err.message || `Falha de rede para o modelo ${cand.model} (${cand.version})`;
        }
      }

      if (!response) {
        throw new Error(lastErrorMsg || 'Erro de comunicação com a API do Gemini.');
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'Previsão indisponível.';
      
      // Update local storage and state
      updateProjectForecast(activeProject.id, text);
      showToast('Previsão IA atualizada com sucesso!', 'success');
      
      // Save key if it worked
      if (tempGeminiKey && tempGeminiKey.trim()) {
        localStorage.setItem('gemini_api_key', tempGeminiKey);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao estimar com IA: ' + e.message, 'danger');
    } finally {
      setForecastLoading(false);
    }
  };

  const handleSendChatMessage = async (textToSend) => {
    const messageText = textToSend || chatInput;
    if (!messageText || !messageText.trim()) return;

    const key = tempGeminiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      showToast('Por favor, configure sua Gemini API Key para iniciar a conversa.', 'warning');
      return;
    }

    // Add user message to state
    const newUserMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    localStorage.setItem('elevatesync_chat_history', JSON.stringify(updatedMessages));
    setChatInput('');
    setChatLoading(true);

    try {
      // Build Context Snapshot
      let projectsContext = '';
      projects.forEach((p, index) => {
        const linearEst = getProjectLinearEstimate(p);
        const savedForecast = projectForecast[p.project_id] || 'Nenhuma previsão gerada ainda.';
        
        projectsContext += `${index + 1}. **Obra**: ${p.project_name}
   - Elevador: ${p.elevator_model}
   - Empresa Contratada: ${p.company_name || 'Sem empresa'}
   - Técnico Responsável: ${p.technician_name || 'Não definido'}
   - Progresso Físico Real: ${p.overall_progress_percent}%
   - Dias Decorridos: ${p.days_elapsed} dias
   - Dias Restantes do Contrato: ${p.days_remaining} dias
   - Status do Prazo: ${p.is_delayed ? 'ATRASADA' : 'NO PRAZO'}
   - Lembretes Telegram: ${p.notification_frequency || 'weekly'}
   - Projeção Linear de Término: ${linearEst.text}
   - Previsão IA de Término: ${savedForecast}\n\n`;
      });

      let companiesContext = companies.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
      let techniciansContext = technicians.map(t => `- Técnico: ${t.full_name} | Supervisor: ${t.supervisor_name || 'Não definido'}`).join('\n');
      
      let logsContext = allLogs.slice(0, 15).map(log => {
        const time = new Date(log.created_at).toLocaleString('pt-BR');
        const user = log.changed_by_profile?.full_name || 'Sistema';
        return `[${time}] Ação: ${log.action_type} na tabela: ${log.table_name} por: ${user}`;
      }).join('\n');

      let spreadsheetContext = '';
      if (uploadedData) {
        spreadsheetContext = `\n**DADOS EXTRATADOS DA PLANILHA EXTERNA (NOVAS OBRAS FUTURAS A INICIAR):**\n${JSON.stringify(uploadedData, null, 2)}\n`;
      }

      const systemPrompt = `Você é o Co-piloto de Gestão Inteligente e Assistente IA do ElevateSync.
Você é um engenheiro eletrônico sênior e supervisor de instalação especialista em gestão de obras de elevadores comerciais.
Sua missão é responder perguntas do gestor sobre o andamento das obras, eficiência de equipes e prover suporte técnico.

Você tem acesso ao seguinte snapshot de dados em tempo real do banco de dados (Supabase):

**OBRAS CADASTRADAS E METRICAS:**
${projectsContext || 'Nenhuma obra cadastrada.'}

**EMPRESAS CONTRATADAS:**
${companiesContext || 'Nenhuma empresa cadastrada.'}

**TECNICOS DE CAMPO:**
${techniciansContext || 'Nenhum técnico cadastrado.'}

**HISTORICO RECENTE DE AUDITORIA (LOGS):**
${logsContext || 'Nenhum log de auditoria recente.'}
${spreadsheetContext}

**INSTRUÇÕES DE RESPOSTA:**
1. Responda em Markdown rico e profissional, de forma objetiva, direta e amigável.
2. Sempre que o usuário pedir resumos, estatísticas ou relatórios (ex: "relatório para WhatsApp", "resumo para copiar"), formate a resposta com emojis e marcadores para que fique perfeita para colar no WhatsApp.
3. Para dúvidas técnicas de montagem (fases de instalação, ajustes, etc.), use sua expertise em elevadores comerciais para responder com autoridade.
4. Se o usuário perguntar sobre obras específicas, use os dados fornecidos no snapshot (prazos, progresso, linear e IA) para responder de forma precisa.
5. Caso o usuário solicite a **Previsão de Capacidade (4 Meses)** (especialmente usando os dados da planilha de obras a iniciar anexada), gere uma análise preditiva detalhada para os próximos 4 meses. Para cada mês:
   - Liste quais obras ativas projetam conclusão naquele mês (e quais técnicos correspondentes serão liberados/ficarão disponíveis).
   - Liste quais novas obras da planilha enviada estão agendadas para começar naquele mês.
   - Recomende a alocação dos técnicos liberados ou ociosos para essas novas obras.
   - Aponte se haverá sobrecarga (obras sem técnicos) ou ociosidade. Apresente um balanço final em tabelas Markdown estruturadas mês a mês.

Histórico da conversa atual:
${chatMessages.map(msg => `${msg.role === 'user' ? 'Gestor' : 'Assistente IA'}: ${msg.content}`).join('\n')}
Gestor: ${messageText}
Assistente IA:`;

      const candidates = [
        { version: 'v1', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' }
      ];

      let response = null;
      let lastErrorMsg = '';

      for (const cand of candidates) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${cand.version}/models/${cand.model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: systemPrompt
                    }
                  ]
                }
              ]
            })
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            const errJson = await res.json().catch(() => ({}));
            lastErrorMsg = errJson.error?.message || `Status ${res.status} para o modelo ${cand.model} (${cand.version})`;
          }
        } catch (err) {
          lastErrorMsg = err.message || `Falha de rede para o modelo ${cand.model} (${cand.version})`;
        }
      }

      if (!response) {
        throw new Error(lastErrorMsg || 'Erro de comunicação com a API do Gemini.');
      }

      const resData = await response.json();
      const assistantText = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui formular uma resposta no momento.';
      
      const newAssistantMessage = {
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, newAssistantMessage];
      setChatMessages(finalMessages);
      localStorage.setItem('elevatesync_chat_history', JSON.stringify(finalMessages));
      
      // Save key if it worked
      if (tempGeminiKey && tempGeminiKey.trim()) {
        localStorage.setItem('gemini_api_key', tempGeminiKey);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao processar mensagem do chat: ' + e.message, 'danger');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChatHistory = () => {
    if (window.confirm('Deseja limpar todo o histórico de conversas com o Assistente IA?')) {
      const defaultMsg = [
        { 
          role: 'assistant', 
          content: 'Olá! Sou o Assistente IA do ElevateSync. Tenho acesso completo a todas as obras, técnicos, equipes e logs de auditoria em tempo real.\n\nPosso te ajudar com análises de prazos, resumos para colar no WhatsApp, dúvidas técnicas sobre montagem ou relatórios operacionais. Como posso ajudar hoje?', 
          timestamp: new Date().toISOString() 
        }
      ];
      setChatMessages(defaultMsg);
      localStorage.setItem('elevatesync_chat_history', JSON.stringify(defaultMsg));
      showToast('Histórico de chat limpo!', 'success');
    }
  };

  const loadSheetJS = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = (err) => reject(new Error('Falha ao carregar SheetJS da CDN'));
      document.body.appendChild(script);
    });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extensions
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
      showToast('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV.', 'danger');
      return;
    }

    setChatLoading(true);
    setUploadedFileName(file.name);

    try {
      const reader = new FileReader();
      const readPromise = new Promise((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const XLSX = await loadSheetJS();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });

      const parsedData = await readPromise;
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('A planilha está vazia ou não pôde ser lida corretamente.');
      }

      setUploadedData(parsedData);
      showToast(`Planilha "${file.name}" carregada com sucesso!`, 'success');

      // Append system message in chat history
      const sysMessage = {
        role: 'assistant',
        content: `📁 **Planilha Anexada:** \`${file.name}\` contendo **${parsedData.length} registros** de obras futuras/pipeline.\n\nAgora posso cruzar esses dados externos para simular as previsões de mão de obra e alocações. Use o botão rápido **"🔮 Previsão de Capacidade (4 Meses)"** para gerar o relatório!`,
        timestamp: new Date().toISOString()
      };
      
      const newMessages = [...chatMessages, sysMessage];
      setChatMessages(newMessages);
      localStorage.setItem('elevatesync_chat_history', JSON.stringify(newMessages));

    } catch (err) {
      console.error(err);
      setUploadedFileName('');
      setUploadedData(null);
      showToast('Erro ao ler a planilha: ' + err.message, 'danger');
    } finally {
      setChatLoading(false);
      // Reset input element value so same file can be uploaded again
      e.target.value = '';
    }
  };

  const handleRemoveSpreadsheet = () => {
    setUploadedData(null);
    setUploadedFileName('');
    showToast('Planilha desanexada do Assistente.', 'info');
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('### ')) {
        return <h4 key={index} style={{ color: '#06b6d4', marginTop: '16px', marginBottom: '8px', fontSize: '1.1rem', fontWeight: 600 }}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={index} style={{ color: '#22d3ee', marginTop: '20px', marginBottom: '10px', fontSize: '1.25rem', fontWeight: 700 }}>{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={index} style={{ color: '#ffffff', marginTop: '24px', marginBottom: '12px', fontSize: '1.4rem', fontWeight: 700 }}>{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        return <li key={index} style={{ marginLeft: '16px', marginBottom: '6px', color: '#e2e8f0', listStyleType: 'disc' }}>{parseInlineMarkdown(content)}</li>;
      }
      if (line.trim() === '') {
        return <div key={index} style={{ height: '8px' }} />;
      }
      return <p key={index} style={{ marginBottom: '8px', lineHeight: 1.5, color: '#e2e8f0' }}>{parseInlineMarkdown(line)}</p>;
    });
  };

  const parseInlineMarkdown = (text) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} style={{ color: '#ffffff', fontWeight: 700 }}>{part}</strong>;
      }
      return part;
    });
  };

  const renderProjectReport = () => {
    if (!activeProject) return null;
    
    const completedPhases = projectPhases.filter(p => p.progress_percent === 100);
    const inProgressPhases = projectPhases.filter(p => p.started && p.progress_percent < 100);
    const notStartedPhases = projectPhases.filter(p => !p.started);
    
    // Calculo da Estimativa Linear
    const linearEst = getProjectLinearEstimate(activeProject);
    const linearEstimateText = linearEst.text;
    const isLinearDelayed = linearEst.isDelayed;
    const progress = activeProject.overall_progress_percent || 0;


    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Report Header for printing */}
        <div className="print-only" style={{ borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#000000', margin: 0 }}>ElevateSync - Relatório Técnico de Obra</h1>
          <p style={{ margin: '6px 0 0', color: '#555555', fontSize: '0.95rem' }}>Gerado em {new Date().toLocaleString()}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Relatório Consolidado da Obra</h2>
          <button 
            onClick={() => window.print()} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <FileText size={16} />
            Imprimir / Exportar PDF
          </button>
        </div>

        {/* Overview section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>Obra</h4>
            <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{activeProject.project_name}</strong>
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>Empresa Contratada</h4>
            <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{activeProject.company_name || 'Não atribuída'}</strong>
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>Modelo do Elevador</h4>
            <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{activeProject.elevator_model}</strong>
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>Status Operacional</h4>
            <span style={{ 
              fontWeight: 700, 
              color: activeProject.is_delayed ? '#ef4444' : '#10b981',
              background: activeProject.is_delayed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: activeProject.is_delayed ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
              fontSize: '0.85rem'
            }}>
              {activeProject.is_delayed ? 'Atrasada' : 'No Prazo'}
            </span>
          </div>
        </div>

        {/* Team details and timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Equipe Responsável</h3>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Equipe de Campo: <strong>{activeProject.team_name || 'Não atribuída'}</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Técnico de Instalação: <strong>{activeProject.technician_name || 'Não atribuído'}</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Gestor Supervisor: <strong>{activeProject.manager_name || 'Não atribuído'}</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Lembrete Conversacional: <strong>
              {activeProject.notification_frequency === 'daily' && 'Diário'}
              {activeProject.notification_frequency === 'weekly' && 'Semanal'}
              {activeProject.notification_frequency === 'monthly' && 'Mensal'}
              {activeProject.notification_frequency === 'disabled' && 'Desativado'}
              {!activeProject.notification_frequency && 'Semanal (Padrão)'}
            </strong></p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Prazos & Avanço Físico</h3>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Início da Obra: <strong>{new Date(activeProject.start_date).toLocaleDateString()}</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Data Limite (Padrão 60 dias): <strong>{new Date(activeProject.deadline_date).toLocaleDateString()}</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Dias Decorridos: <strong>{activeProject.days_elapsed} dias</strong></p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>Dias Restantes: <strong>{activeProject.days_remaining} dias</strong></p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Brain size={16} style={{ color: '#06b6d4' }} />
                Estimativa de Término
              </h3>
              
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Projeção Linear (Automatizada)</span>
                <strong style={{ fontSize: '0.9rem', color: isLinearDelayed ? '#ef4444' : '#10b981' }}>
                  {linearEstimateText}
                </strong>
              </div>
              
              <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Previsão Refinada (IA Gemini)</span>
                
                {!(tempGeminiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) ? (
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px', marginTop: '6px' }} className="no-print">
                    <p style={{ fontSize: '0.75rem', color: '#fca5a5', margin: '0 0 6px' }}>Configure a API Key do Gemini para ativar a estimativa com IA:</p>
                    <input 
                      type="password"
                      className="form-control"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto', marginBottom: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      placeholder="Cole sua Gemini API Key aqui"
                      value={tempGeminiKey}
                      onChange={e => setTempGeminiKey(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if (tempGeminiKey.trim()) {
                          localStorage.setItem('gemini_api_key', tempGeminiKey);
                          showToast('Chave Gemini salva localmente!', 'success');
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Salvar Chave
                    </button>
                  </div>
                ) : (
                  <>
                    {projectForecast[activeProject.id] ? (
                      <div style={{ fontSize: '0.8rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '110px', overflowY: 'auto' }}>
                        {renderMarkdown(projectForecast[activeProject.id])}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0' }}>Nenhuma estimativa de IA gerada ainda.</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {progress > 0 && progress < 100 && (tempGeminiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) && (
              <div className="no-print" style={{ marginTop: '12px' }}>
                <button
                  onClick={handleGenerateProjectForecast}
                  disabled={forecastLoading}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Sparkles size={12} />
                  {forecastLoading ? 'Calculando Estimativa...' : 'Calcular Estimativa IA'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progression stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>{completedPhases.length}</strong>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>Fases Concluídas</p>
          </div>
          <div style={{ background: 'rgba(2,132,199,0.05)', border: '1px solid rgba(2,132,199,0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ fontSize: '1.5rem', color: '#0284c7' }}>{inProgressPhases.length}</strong>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>Fases Em Andamento</p>
          </div>
          <div style={{ background: 'rgba(71,85,105,0.05)', border: '1px solid rgba(71,85,105,0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <strong style={{ fontSize: '1.5rem', color: '#94a3b8' }}>{notStartedPhases.length}</strong>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>Fases Não Iniciadas</p>
          </div>
        </div>

        {/* Main table of 20 phases checklist status */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>Fases Técnicas de Instalação</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Nº</th>
                <th style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Fase Técnica</th>
                <th style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Iniciado</th>
                <th style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Progresso</th>
                <th style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Última Atualização</th>
              </tr>
            </thead>
            <tbody>
              {projectPhases.map((phase) => (
                <tr key={phase.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 700, color: '#06b6d4' }}>{phase.phases.phase_number}</td>
                  <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                    <strong>{phase.phases.name}</strong>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{phase.phases.description}</div>
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.85rem' }}>{phase.started ? 'Sim' : 'Não'}</td>
                  <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                    <span style={{ 
                      color: phase.progress_percent === 100 ? '#10b981' : phase.progress_percent > 0 ? '#0284c7' : '#94a3b8',
                      fontWeight: 700 
                    }}>
                      {phase.progress_percent}%
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {new Date(phase.updated_at).toLocaleDateString()} {new Date(phase.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReportModal = () => {
    if (!activeReportModal) return null;

    const { type, data } = activeReportModal;
    const name = data.full_name || data.name;

    return (
      <div className="modal-overlay" onClick={() => setActiveReportModal(null)}>
        <div 
          className="modal-content glass-panel" 
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '800px', width: '90%', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={24} style={{ color: '#06b6d4' }} />
              Relatório de Eficiência IA: {type === 'tech' ? 'Técnico' : 'Empresa'}
            </h3>
            <button 
              onClick={() => setActiveReportModal(null)} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          </div>

          {reportLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: '#06b6d4', margin: '0 auto 16px' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Compilando métricas operacionais e históricos...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Header Info */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#ffffff' }}>{name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Obras nos Últimos 12 Meses</span>
                    <strong style={{ fontSize: '1.25rem', color: '#06b6d4' }}>{reportData?.projects?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Progresso Médio Geral</span>
                    <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>
                      {reportData?.projects?.length > 0 
                        ? `${Math.round(reportData.projects.reduce((acc, p) => acc + p.overall_progress_percent, 0) / reportData.projects.length)}%` 
                        : '0%'
                      }
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Obras em Atraso</span>
                    <strong style={{ fontSize: '1.25rem', color: '#ef4444' }}>
                      {reportData?.projects?.filter(p => p.is_delayed).length || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {reportData?.projects?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <AlertTriangle size={32} style={{ color: '#f59e0b', marginBottom: '12px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma obra vinculada a este registro nos últimos 12 meses.</p>
                </div>
              ) : (
                <>
                  {/* Phase Durations Section */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#ffffff' }}>Duração Média das Fases Técnicas (Gargalos)</h4>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
                      Dias médios decorridos desde o início da fase até a sua conclusão (100%) em todas as obras sob responsabilidade.
                    </p>
                    
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px', fontSize: '0.8rem', textAlign: 'left', color: '#94a3b8' }}>Fase</th>
                            <th style={{ padding: '8px', fontSize: '0.8rem', textAlign: 'left', color: '#94a3b8' }}>Descrição</th>
                            <th style={{ padding: '8px', fontSize: '0.8rem', textAlign: 'center', color: '#94a3b8' }}>Duração Média</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData?.catalogPhases?.map(ph => {
                            const avgDays = reportData.averages[ph.phase_number] || 0;
                            return (
                              <tr key={ph.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#06b6d4' }}>F{ph.phase_number}</td>
                                <td style={{ padding: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>{ph.name}</td>
                                <td style={{ padding: '8px', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: avgDays > 10 ? '#ef4444' : avgDays > 5 ? '#f59e0b' : avgDays > 0 ? '#10b981' : '#94a3b8' }}>
                                  {avgDays > 0 ? `${avgDays} dias` : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* AI Analysis Section */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Brain size={18} style={{ color: '#22d3ee' }} />
                        Análise de Produtividade por IA
                      </h4>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) && (
                          <button 
                            onClick={handleGenerateAIReport}
                            disabled={aiLoading}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
                            {aiAnalysis ? 'Atualizar Análise' : 'Gerar Análise'}
                          </button>
                        )}
                        <button 
                          onClick={() => setShowKeyConfig(!showKeyConfig)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        >
                          {showKeyConfig ? 'Ocultar Config' : 'Chave API'}
                        </button>
                      </div>
                    </div>

                    {/* Gemini Key Config Form */}
                    {(!(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) || showKeyConfig) && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                          Para ativar a análise de IA, insira sua chave gratuita do Gemini (gerada no Google AI Studio). A chave será salva localmente e com segurança em seu navegador.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="password"
                            placeholder={localStorage.getItem('gemini_api_key') ? '••••••••••••••••' : 'Cole sua Gemini API Key aqui'}
                            value={tempGeminiKey}
                            onChange={e => setTempGeminiKey(e.target.value)}
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '4px' }}
                          />
                          <button 
                            onClick={() => {
                              if (tempGeminiKey.trim()) {
                                localStorage.setItem('gemini_api_key', tempGeminiKey);
                                showToast('Chave salva com sucesso!');
                                setShowKeyConfig(false);
                              } else {
                                showToast('Por favor, digite uma chave válida.', 'danger');
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Salvar Chave
                          </button>
                          {localStorage.getItem('gemini_api_key') && (
                            <button 
                              onClick={() => {
                                localStorage.removeItem('gemini_api_key');
                                setTempGeminiKey('');
                                showToast('Chave removida.');
                                setShowKeyConfig(true);
                              }}
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                        <a 
                          href="https://aistudio.google.com/" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ fontSize: '0.75rem', color: '#06b6d4', textDecoration: 'underline' }}
                        >
                          Obter chave gratuita no Google AI Studio ↗
                        </a>
                      </div>
                    )}

                    {/* AI analysis result */}
                    {aiLoading && (
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ color: '#06b6d4', margin: '0 auto 12px' }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                          O Gemini está analisando as 20 fases operacionais e mapeando os principais gargalos técnicos...
                        </p>
                      </div>
                    )}

                    {aiAnalysis && (
                      <div 
                        style={{ 
                          background: 'rgba(15,23,42,0.6)', 
                          border: '1px solid var(--border-color-active)', 
                          padding: '20px', 
                          borderRadius: '8px', 
                          fontSize: '0.85rem', 
                          color: '#e2e8f0', 
                          maxHeight: '350px', 
                          overflowY: 'auto' 
                        }}
                      >
                        {renderMarkdown(aiAnalysis)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', justifyContent: 'flex-end' }} className="no-print">
            {reportData?.projects?.length > 0 && (
              <button 
                onClick={() => window.print()} 
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Imprimir Relatório
              </button>
            )}
            <button 
              onClick={() => setActiveReportModal(null)} 
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingElement) return null;

    const { type, data } = editingElement;

    return (
      <div className="modal-overlay" onClick={() => setEditingElement(null)}>
        <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>
              {type === 'project' && 'Editar Obra'}
              {type === 'team' && 'Editar Equipe'}
              {type === 'tech' && 'Editar Técnico'}
              {type === 'company' && 'Editar Empresa'}
            </h3>
            <button 
              onClick={() => setEditingElement(null)} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          </div>

          {type === 'project' && (
            <form onSubmit={handleUpdateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Identificação / Nome da Obra</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>Modelo do Elevador</label>
                <input type="text" value={editModel} onChange={e => setEditModel(e.target.value)} required />
              </div>
              <div>
                <label>Empresa Contratada Proprietária</label>
                <select value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)} required>
                  <option value="">-- Selecione a Empresa Contratada --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Equipe de Instalação Responsável</label>
                <select value={editTeamId} onChange={e => setEditTeamId(e.target.value)}>
                  <option value="">-- Sem Equipe --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.companies?.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Gestor Técnico Responsável (Obra)</label>
                <select value={editManagerId} onChange={e => setEditManagerId(e.target.value)}>
                  <option value="">-- Sem Gestor --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Técnico Responsável (Confirmação de Fases)</label>
                <select 
                  value={editTechId} 
                  onChange={e => setEditTechId(e.target.value)}
                  disabled={!editCompanyId}
                >
                  <option value="">{editCompanyId ? '-- Sem Técnico --' : '-- Selecione a Empresa Contratada Primeiro --'}</option>
                  {technicians.filter(t => t.company_id === editCompanyId).map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Frequência de Lembrete Conversacional (Telegram)</label>
                <select 
                  value={editNotificationFreq} 
                  onChange={e => setEditNotificationFreq(e.target.value)}
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal (Segunda-Feira 08h)</option>
                  <option value="monthly">Mensal (Todo dia 1º)</option>
                  <option value="disabled">Desativado</option>
                </select>
              </div>
              <div>
                <label>Data de Início</label>
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} required />
              </div>
              <div>
                <label>Prazo Limite para Conclusão</label>
                <input type="date" value={editDeadlineDate} onChange={e => setEditDeadlineDate(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Alterações</button>
                <button type="button" onClick={() => setEditingElement(null)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {type === 'team' && (
            <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Nome da Equipe</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>Empresa Vinculada</label>
                <select value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)} required>
                  <option value="">-- Selecione a Empresa --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Alterações</button>
                <button type="button" onClick={() => setEditingElement(null)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {type === 'tech' && (
            <form onSubmit={handleUpdateTechnician} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Nome Completo do Técnico</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>Telegram Chat ID</label>
                <input type="text" value={editTelegram} onChange={e => setEditTelegram(e.target.value)} required />
              </div>
              <div>
                <label>Empresa do Técnico (Opcional)</label>
                <select value={editCompanyId} onChange={e => setEditCompanyId(e.target.value)}>
                  <option value="">-- Sem Empresa --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Alterações</button>
                <button type="button" onClick={() => setEditingElement(null)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {type === 'company' && (
            <form onSubmit={handleUpdateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label>Nome da Empresa</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>CNPJ (Opcional)</label>
                <input type="text" value={editCnpj} onChange={e => setEditCnpj(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar Alterações</button>
                <button type="button" onClick={() => setEditingElement(null)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  const getProgressColorClass = (percent) => {
    if (percent === 100) return 'bg-progress-p100 progress-p100';
    if (percent === 75) return 'bg-progress-p75 progress-p75';
    if (percent === 50) return 'bg-progress-p50 progress-p50';
    if (percent === 25) return 'bg-progress-p25 progress-p25';
    return 'bg-progress-p0 progress-p0';
  };

  const renderSCurveSVG = () => {
    if (sCurveData.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Nenhum histórico registrado de curva S para este projeto ainda. Atualize o progresso semanalmente para traçar a curva!
        </div>
      );
    }

    const width = 500;
    const height = 220;
    const padding = 35;
    
    // Scale data points
    const pointsCount = sCurveData.length;
    const xStep = pointsCount > 1 ? (width - padding * 2) / (pointsCount - 1) : 0;
    
    const svgPoints = sCurveData.map((d, index) => {
      const x = padding + index * xStep;
      // 0% progress starts at bottom (height - padding), 100% starts at top (padding)
      const y = (height - padding) - (d.progress / 100) * (height - padding * 2);
      return { x, y, label: `${d.progress}%`, week: d.week };
    });

    let pathD = '';
    if (svgPoints.length > 0) {
      pathD = `M ${svgPoints[0].x} ${svgPoints[0].y} ` + svgPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: '600px', height: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(val => {
            const y = (height - padding) - (val / 100) * (height - padding * 2);
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <text x={padding - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{val}%</text>
              </g>
            );
          })}

          {/* S-Curve Path Line */}
          {pathD && <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 6px rgba(6,182,212,0.4))' }} />}

          {/* S-Curve Data Nodes */}
          {svgPoints.map((p, index) => (
            <g key={index}>
              <circle cx={p.x} cy={p.y} r="5" fill="#06b6d4" stroke="#090d16" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{p.label}</text>
              {/* Vertical label line */}
              <line x1={p.x} y1={p.y + 4} x2={p.x} y2={height - padding} stroke="rgba(255,255,255,0.03)" />
              {/* Date label */}
              <text x={p.x} y={height - padding + 15} fill="#94a3b8" fontSize="8" textAnchor="middle" transform={`rotate(15, ${p.x}, ${height - padding + 15})`}>
                {p.week.split('-').slice(1).reverse().join('/')}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#06b6d4' }}></span>
            <span>Avanço Realizado (%)</span>
          </div>
        </div>

        {/* Weekly Divisions comparison list */}
        <div style={{ marginTop: '32px', width: '100%', maxWidth: '600px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <Calendar size={18} style={{ color: '#06b6d4' }} />
            Comparativo de Avanço Semanal (Realizado vs Esperado)
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sCurveData.map((d, index) => {
              const proj = projects.find(p => p.project_id === sCurveProjId);
              let expectedProgress = 0;
              if (proj) {
                const start = new Date(proj.start_date).getTime();
                const end = new Date(proj.deadline_date).getTime();
                const target = new Date(d.week).getTime();
                const totalDur = end - start;
                if (totalDur > 0) {
                  const elap = target - start;
                  expectedProgress = elap <= 0 ? 0 : Math.min(100, Math.round((elap / totalDur) * 100));
                } else {
                  expectedProgress = 100;
                }
              }

              const isAheadOrOnTime = d.progress >= expectedProgress;

              return (
                <div 
                  key={index} 
                  style={{ 
                    padding: '14px 18px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    borderRadius: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      S{index + 1}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>SEMANA {index + 1}</span>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
                        Semana de {d.week.split('-').reverse().join('/')}
                      </h5>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: d.progress === 100 ? '#10b981' : '#06b6d4' }}>{d.progress}%</span>
                      <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Realizado</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>{expectedProgress}%</span>
                      <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Esperado</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', minWidth: '90px', justifyContent: 'flex-end' }}>
                      {isAheadOrOnTime ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          No Prazo
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          Atrasado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16' }}>
        <RefreshCw style={{ animation: 'spin 2s linear infinite', color: '#06b6d4' }} size={48} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Carregando painel ElevateSync...</p>
      </div>
    );
  }

  // Not Logged In Screen
  if (!session) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '32px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <Activity style={{ color: '#06b6d4' }} size={32} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>ElevateSync</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Acompanhamento de Obras de Elevadores</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>E-mail do Gestor</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="gestor@empresa.com" />
            </div>

            <div>
              <label>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>

            {authError && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                <ShieldAlert size={20} />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {isSignUp ? 'Criar Cadastro Admin' : 'Entrar no Sistema'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
              {isSignUp ? 'Já possui conta? Fazer Login' : 'Criar nova conta de Gestor'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Toast */}
      {msgNotification && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px',
          borderRadius: '12px', color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          background: msgNotification.type === 'danger' ? '#ef4444' : '#10b981',
        }}>
          {msgNotification.type === 'danger' ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{msgNotification.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="glass-panel no-print" style={{ margin: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity style={{ color: '#06b6d4' }} size={28} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>ElevateSync</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitoramento de Instalações de Elevadores Comerciais</p>
          </div>
        </div>
        <button onClick={handleLogOut} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* Detailed Project View */}
      {activeProject ? (
        <main style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="no-print">
            <button onClick={() => { setActiveProject(null); fetchDashboardData(); }} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              <ArrowLeft size={16} />
              Voltar para Obras
            </button>
            
            {activeProject.is_delayed && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Obra em Atraso
              </span>
            )}
          </div>

          {/* Project details panel */}
          <div className="glass-panel no-print" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>{activeProject.project_name}</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} /> Empresa Contratada: {activeProject.company_name || 'Sem empresa'} | Modelo: {activeProject.elevator_model}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={16} /> Equipe de Campo: {activeProject.team_name || 'Sem equipe'} | Técnico: {activeProject.technician_name || 'Sem técnico'} | Gestor: {activeProject.manager_name || 'Sem gestor'}
              </p>
            </div>

            {/* Editable deadline */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '0.75rem' }}>Prazo Final (Edite se necessário)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Calendar size={18} style={{ color: '#06b6d4' }} />
                <input 
                  type="date" 
                  value={activeProject.deadline_date} 
                  onChange={e => handleUpdateDeadline(e.target.value)} 
                  style={{ padding: '6px 12px', fontSize: '0.9rem', width: '150px' }} 
                />
              </div>
            </div>

            {/* Programmable Notification Frequency */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '0.75rem' }}>Agendar Lembretes Telegram</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Bell size={18} style={{ color: activeProject.notification_frequency === 'disabled' ? '#64748b' : '#10b981' }} />
                <select 
                  value={activeProject.notification_frequency || 'weekly'} 
                  onChange={e => handleUpdateNotificationFrequency(e.target.value)}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.9rem', 
                    background: 'rgba(15,23,42,0.6)', 
                    border: '1px solid var(--border-color)', 
                    color: '#ffffff',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }} 
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal (Segunda 08h)</option>
                  <option value="monthly">Mensal (Dia 1º)</option>
                  <option value="disabled">Desativado</option>
                </select>
              </div>
            </div>

            {/* Project Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 700, color: '#06b6d4' }}>{activeProject.overall_progress_percent}%</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Realizado</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{activeProject.expected_linear_progress}%</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Esperado (Linear)</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activeProject.days_elapsed}d</span>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Decorridos</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: activeProject.days_remaining <= 5 ? '#ef4444' : '#10b981' }}>{activeProject.days_remaining}d</span>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Restantes</p>
              </div>
            </div>
          </div>

          {/* Sub-tabs for Project Details */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px', gap: '8px', overflowX: 'auto' }} className="no-print">
            {[
              { id: 'phases', label: '📋 Fases da Obra' },
              { id: 'report', label: '📄 Relatório Técnico' },
              { id: 'history', label: '🕒 Histórico & Logs' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setProjectSubTab(tab.id)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: '10px 16px', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: projectSubTab === tab.id ? '#06b6d4' : '#94a3b8', 
                  borderBottom: projectSubTab === tab.id ? '2px solid #06b6d4' : 'none', 
                  whiteSpace: 'nowrap' 
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {projectSubTab === 'phases' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={20} style={{ color: '#06b6d4' }} />
                Acompanhamento das 20 Fases Padrão (Fórmulas Ativas)
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {projectPhases.map((phase) => (
                  <div 
                    key={phase.id} 
                    className={getProgressColorClass(phase.progress_percent)}
                    style={{
                      padding: '16px', borderRadius: '12px', border: '1px solid',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>FASE {phase.phases.phase_number}/20</span>
                        {phase.progress_percent === 100 && <CheckCircle size={16} />}
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ffffff' }}>{phase.phases.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', opacity: 0.85 }}>{phase.phases.description}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9 }}>
                        <span>Status: <strong>{phase.started ? 'SIM' : 'NÃO'}</strong></span>
                        <span>Progresso: <strong>{phase.progress_percent}%</strong></span>
                      </div>

                      {/* Progress selector */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <button 
                          onClick={() => handlePhaseOverride(phase.phases.id, phase.phases.phase_number, false, 0)}
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: phase.progress_percent === 0 ? 'rgba(255,255,255,0.2)' : 'none', color: '#fff', cursor: 'pointer' }}
                        >
                          NÃO
                        </button>
                        {[25, 50, 75, 100].map(val => (
                          <button 
                            key={val}
                            onClick={() => handlePhaseOverride(phase.phases.id, phase.phases.phase_number, true, val)}
                            style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: phase.progress_percent === val ? 'rgba(255,255,255,0.25)' : 'none', color: '#fff', cursor: 'pointer' }}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projectSubTab === 'history' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} style={{ color: '#06b6d4' }} />
                Histórico de Logs (Últimos 10)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {projectLogs.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum log de alteração registrado.</p>
                ) : (
                  projectLogs.map(log => (
                    <div key={log.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4', fontWeight: 600 }}>
                        <span>Ação: {log.action}</span>
                        <span>{new Date(log.changed_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ color: '#ffffff', marginTop: '4px' }}>Alterado por: {log.changed_by_profile?.full_name || 'Sistema'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {projectSubTab === 'report' && renderProjectReport()}
        </main>
      ) : (
        /* Standard Navigation Views */
        <main style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px', gap: '8px', overflow: 'visible', position: 'relative' }} className="no-print">
            {[
              { id: 'projects', label: 'Obras Comerciais' },
              { id: 's-curve', label: 'Curva S & Avanço' },
              { id: 'ai-chat', label: '🤖 Assistente IA' },
              { id: 'new-registry', label: '📝 Cadastros (+)' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMoreMenu(false);
                }} 
                style={{ background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: activeTab === tab.id ? '#06b6d4' : '#94a3b8', borderBottom: activeTab === tab.id ? '2px solid #06b6d4' : 'none', whiteSpace: 'nowrap' }}
              >
                {tab.label}
              </button>
            ))}

            {/* Dropdown for retracted tabs */}
            {(() => {
              const collapsedTabs = [
                { id: 'teams', label: 'Equipes Fixas & Técnicos' },
                { id: 'companies', label: 'Empresas Contratadas' },
                { id: 'phases', label: 'Checklists & Fases' },
                { id: 'ranking', label: 'Ranking de Pendências' },
                { id: 'history', label: 'Histórico & Auditoria' }
              ];
              const isCollapsedActive = collapsedTabs.some(t => t.id === activeTab);
              const activeCollapsed = collapsedTabs.find(t => t.id === activeTab);
              const buttonLabel = activeCollapsed ? `Mais: ${activeCollapsed.label}` : 'Mais';

              return (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isCollapsedActive ? '#06b6d4' : '#94a3b8',
                      borderBottom: isCollapsedActive ? '2px solid #06b6d4' : 'none',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {buttonLabel}
                    <ChevronDown size={14} style={{ transform: showMoreMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {showMoreMenu && (
                    <>
                      {/* Backdrop overlay to close on clicking outside */}
                      <div
                        onClick={() => setShowMoreMenu(false)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 998,
                          background: 'transparent'
                        }}
                      />
                      
                      {/* Dropdown items */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          background: '#111928',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                          zIndex: 999,
                          minWidth: '220px',
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '4px 0',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        {collapsedTabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setShowMoreMenu(false);
                            }}
                            style={{
                              background: activeTab === tab.id ? 'rgba(6, 182, 212, 0.15)' : 'none',
                              border: 'none',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: activeTab === tab.id ? 600 : 500,
                              color: activeTab === tab.id ? '#06b6d4' : '#94a3b8',
                              width: '100%',
                              whiteSpace: 'nowrap',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'none';
                              }
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Projects view */}
          {activeTab === 'projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }} className="animate-fade-in">
              {projects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <AlertTriangle style={{ color: '#f59e0b', marginBottom: '12px' }} size={32} />
                  <h4 style={{ color: '#ffffff' }}>Nenhuma obra comercial cadastrada</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px' }}>Selecione a aba "📝 Cadastros (+)" acima para inicializar a instalação de um elevador.</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div key={proj.project_id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', border: proj.is_delayed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{proj.project_name}</h3>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(6,182,212,0.1)', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>
                          {proj.elevator_model}
                        </span>
                      </div>
                      
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} /> Empresa Contratada: {proj.company_name || 'Sem empresa'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Users size={14} /> Equipe: {proj.team_name || 'Sem equipe'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <HardHat size={14} style={{ color: '#06b6d4' }} /> Técnico Responsável: {proj.technician_name || 'Não definido'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Bell size={14} style={{ color: proj.notification_frequency === 'disabled' ? '#64748b' : '#10b981' }} /> 
                        Lembretes Telegram: <strong style={{ color: proj.notification_frequency === 'disabled' ? '#64748b' : '#06b6d4' }}>
                          {proj.notification_frequency === 'daily' && 'Diário'}
                          {proj.notification_frequency === 'weekly' && 'Semanal'}
                          {proj.notification_frequency === 'monthly' && 'Mensal'}
                          {proj.notification_frequency === 'disabled' && 'Desativado'}
                          {!proj.notification_frequency && 'Semanal'}
                        </strong>
                      </p>
                      
                      {/* Progress Metrics (Realizado vs Esperado) */}
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Realizado */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} style={{ color: proj.overall_progress_percent === 100 ? '#10b981' : '#06b6d4' }} />
                              Realizado:
                            </span>
                            <span style={{ fontWeight: 700, color: proj.overall_progress_percent === 100 ? '#10b981' : '#06b6d4' }}>{proj.overall_progress_percent}%</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${proj.overall_progress_percent}%`, height: '100%', backgroundColor: proj.overall_progress_percent === 100 ? '#10b981' : '#06b6d4', borderRadius: '3px' }}></div>
                          </div>
                        </div>

                        {/* Esperado (Linear) */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <TrendingUp size={12} style={{ color: '#f59e0b' }} />
                              Esperado (Linear):
                            </span>
                            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{proj.expected_linear_progress}%</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${proj.expected_linear_progress}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Deadlines */}
                      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>Decorridos: <strong>{proj.days_elapsed}d (~{(proj.days_elapsed / 7).toFixed(1)} sem)</strong></span>
                          <span>Restantes: <strong>{proj.days_remaining}d (~{(proj.days_remaining / 7).toFixed(1)} sem)</strong></span>
                        </div>
                        {proj.is_delayed ? (
                          <span style={{ color: '#ef4444', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Atraso</span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>Prazo OK</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button 
                        onClick={() => { setActiveProject(proj); setProjectSubTab('phases'); fetchProjectPhases(proj.project_id); fetchProjectAuditLogs(proj.project_id); }} 
                        className="btn btn-primary" style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem' }}
                      >
                        Acompanhar Fases
                        <ChevronRight size={16} />
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => startEdit('project', proj)} 
                          className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteProject(proj.project_id)} 
                          className="btn btn-danger" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Teams tab */}
          {activeTab === 'teams' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {teams.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>Nenhuma equipe cadastrada.</p>
                ) : (
                  teams.map(t => (
                    <div key={t.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Empresa Parceira: {t.companies?.name || 'Não associada'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        <button 
                          onClick={() => startEdit('team', t)} 
                          className="btn btn-secondary" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteTeam(t.id)} 
                          className="btn btn-danger" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Technicians section */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} style={{ color: '#06b6d4' }} />
                  Técnicos Cadastrados
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {technicians.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum técnico cadastrado ainda.</p>
                  ) : (
                    technicians.map(tech => (
                      <div key={tech.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
                            <HardHat size={16} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tech.full_name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Telegram Chat ID: <code>{tech.telegram_chat_id}</code></p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => startEdit('tech', tech)} 
                            className="btn btn-secondary" style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem', minWidth: '60px' }}
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteTechnician(tech.id)} 
                            className="btn btn-danger" style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem', minWidth: '60px' }}
                          >
                            Excluir
                          </button>
                          <button 
                            onClick={() => handleSendTestMessage(tech)} 
                            className="btn btn-secondary" style={{ flex: '1 0 100%', padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #10b981', color: '#10b981', marginTop: '4px' }}
                          >
                            <Send size={12} />
                            Testar Bot Telegram
                          </button>
                          <button 
                            onClick={() => handleOpenReportModal('tech', tech)} 
                            className="btn btn-secondary" style={{ flex: '1 0 100%', padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', marginTop: '4px' }}
                          >
                            <Brain size={12} />
                            Relatório IA
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Companies tab */}
          {activeTab === 'companies' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }} className="animate-fade-in">
              {companies.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>Nenhuma empresa parceira cadastrada.</p>
              ) : (
                companies.map(c => (
                  <div key={c.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Building style={{ color: '#06b6d4' }} />
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{c.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CNPJ: {c.cnpj || 'Não informado'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => startEdit('company', c)} 
                        className="btn btn-secondary" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', minWidth: '60px' }}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteCompany(c.id)} 
                        className="btn btn-danger" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', minWidth: '60px' }}
                      >
                        Excluir
                      </button>
                      <button 
                        onClick={() => handleOpenReportModal('company', c)} 
                        className="btn btn-secondary" style={{ flex: '1 0 100%', padding: '8px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', marginTop: '4px' }}
                      >
                        <Brain size={12} />
                        Relatório IA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Checklist & Phases tab */}
          {activeTab === 'phases' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: '#06b6d4' }} />
                Checklist Padrão: Cadastro das 20 Fases Técnicas
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
                Estas são as 20 fases técnicas pré-cadastradas que toda nova instalação de elevador segue obrigatoriamente.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {phasesList.map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center', color: '#06b6d4', fontWeight: 'bold' }}>
                      {p.phase_number}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>{p.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>{p.description}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ color: '#06b6d4' }}>Perguntas:</span>
                      <span>1. Executado?</span>
                      <span>|</span>
                      <span>2. Progresso (25% a 100%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* S-Curve & weekly progress chart tab */}
          {activeTab === 's-curve' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={20} style={{ color: '#06b6d4' }} />
                    Curva de Avanço (Curva S - Medição Semanal)
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                    Histórico consolidado do avanço percentual das obras ao longo das semanas de trabalho.
                  </p>
                </div>
                
                {/* Project selector */}
                <div>
                  <select value={sCurveProjId} onChange={e => setSCurveProjId(e.target.value)} style={{ width: '260px' }}>
                    <option value="">-- Selecione uma Obra --</option>
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {sCurveProjId && renderSCurveSVG()}
            </div>
          )}

          {/* Pending Rankings tab */}
          {activeTab === 'ranking' && (() => {
            // Extract available completion months
            const availableMonths = [];
            projects.forEach(p => {
              const est = getProjectLinearEstimate(p);
              if (est.date) {
                const monthIndex = est.date.getMonth(); // 0-11
                const year = est.date.getFullYear();
                const label = est.date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                
                if (!availableMonths.some(m => m.month === monthIndex && m.year === year)) {
                  availableMonths.push({
                    value: `${monthIndex}-${year}`,
                    label: capitalizedLabel,
                    month: monthIndex,
                    year
                  });
                }
              }
            });

            // Sort months chronologically
            availableMonths.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });

            // Filter rankings
            const filteredRankings = pendingRankings.filter(rank => {
              if (rankingMonthFilter === 'all') return true;
              
              const proj = projects.find(p => p.project_id === rank.project_id);
              if (!proj) return false;
              
              const est = getProjectLinearEstimate(proj);
              if (!est.date) return false;
              
              const monthYearKey = `${est.date.getMonth()}-${est.date.getFullYear()}`;
              return monthYearKey === rankingMonthFilter;
            });

            // Sort rankings by total pending phases descending
            const sortedRankings = [...filteredRankings].sort((a, b) => {
              const aTotal = (a.not_started_phases_count || 0) + (a.in_progress_phases_count || 0);
              const bTotal = (b.not_started_phases_count || 0) + (b.in_progress_phases_count || 0);
              return bTotal - aTotal;
            });

            return (
              <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                  Ranking de Pendências (Fases Incompletas)
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }} className="no-print">
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Obras ordenadas pelo volume de pendências e fases não iniciadas.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Filtrar Conclusão por Mês:</span>
                    <select
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '4px 12px', width: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', height: 'auto' }}
                      value={rankingMonthFilter}
                      onChange={e => setRankingMonthFilter(e.target.value)}
                    >
                      <option value="all">Todos os Meses</option>
                      {availableMonths.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedRankings.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>Nenhuma pendência encontrada para o filtro selecionado!</p>
                  ) : (
                    sortedRankings.map((rank, idx) => {
                      const proj = projects.find(p => p.project_id === rank.project_id);
                      const linearEst = proj ? getProjectLinearEstimate(proj) : null;
                      const aiEst = projectForecast[rank.project_id];

                      return (
                        <div key={rank.project_id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>{idx + 1}</span>
                              {rank.project_name}
                            </h4>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                              <span style={{ color: '#ef4444' }}>{rank.not_started_phases_count} Não Iniciadas</span>
                              <span style={{ color: '#f59e0b' }}>{rank.in_progress_phases_count} Em Progresso</span>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '0.8rem', background: '#020617', padding: '12px', borderRadius: '8px', color: '#94a3b8' }}>
                            <strong>Fases Pendentes:</strong> {rank.pending_phases_list || 'Nenhuma'}
                          </div>

                          {/* Completion Estimates Panel inside the ranking card */}
                          {proj && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '4px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                              <div>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Previsão Linear (Automática)</span>
                                <strong style={{ fontSize: '0.8rem', color: linearEst.isDelayed ? '#ef4444' : '#10b981' }}>
                                  {linearEst.text}
                                </strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Brain size={12} style={{ color: '#06b6d4' }} /> Previsão Refinada (IA Gemini)
                                </span>
                                <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                                  {aiEst ? (
                                    <div style={{ maxHeight: '80px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                      {renderMarkdown(aiEst)}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                      Estimativa de IA ainda não calculada. (Calcule na aba "Relatório Técnico" da obra).
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* AI Chat tab */}
          {activeTab === 'ai-chat' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '580px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 600 }}>
                  <Brain size={22} style={{ color: '#06b6d4' }} />
                  Assistente IA - Co-piloto de Gestão
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                  Pergunte sobre atrasos, status de obras, resumos para o WhatsApp, ou tire dúvidas sobre as fases técnicas de elevadores.
                </p>
              </div>

              {!(tempGeminiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) ? (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', padding: '24px', borderRadius: '12px', textAlign: 'center', margin: '40px auto', maxWidth: '500px' }}>
                  <AlertTriangle size={40} style={{ color: '#f87171', margin: '0 auto 12px' }} />
                  <h4 style={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>Chave da API do Gemini Necessária</h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
                    Para interagir com o Assistente IA, configure sua Gemini API Key gratuita (gerada no Google AI Studio). A chave é armazenada de forma segura e local no seu navegador.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
                    <input 
                      type="password"
                      className="form-control"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center' }}
                      placeholder="Cole sua Gemini API Key aqui"
                      value={tempGeminiKey}
                      onChange={e => setTempGeminiKey(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if (tempGeminiKey.trim()) {
                          localStorage.setItem('gemini_api_key', tempGeminiKey);
                          showToast('Chave Gemini salva com sucesso! O assistente está pronto.', 'success');
                        } else {
                          showToast('Por favor, digite ou cole uma chave válida.', 'warning');
                        }
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px' }}
                    >
                      Ativar Assistente IA
                    </button>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.75rem', color: '#06b6d4', textDecoration: 'underline', marginTop: '4px' }}
                    >
                      Obtenha uma chave gratuita no Google AI Studio
                    </a>
                  </div>
                </div>
              ) : (() => {
                // Determine suggestions chips dynamically
                const chips = [
                  { text: 'Quais obras estão atrasadas neste momento e quem são os responsáveis?', label: '🔴 Obras Atrasadas' },
                  { text: 'Gere um resumo geral do progresso físico de todas as obras para eu colar no WhatsApp.', label: '📊 Resumo WhatsApp' },
                  { text: 'Qual fase técnica de elevador comercial representa o maior gargalo nas nossas obras?', label: '🔨 Maior Gargalo' },
                  { text: 'Quais são os últimos logs de auditoria ou atividades registradas?', label: '🕒 Logs Recentes' }
                ];

                if (uploadedData) {
                  chips.unshift({
                    text: 'Gere a Previsão de Capacidade Operacional para os próximos 4 meses. Liste detalhadamente mês a mês: 1. Obras ativas projetadas para concluir e técnicos correspondentes que serão liberados; 2. Novas obras da planilha anexada programadas para iniciar; 3. Recomendações de alocação de técnicos para essas novas obras; 4. Análise de gargalos ou sobrecargas de equipes. Apresente em formato de tabelas Markdown separadas por mês.',
                    label: '🔮 Previsão de Capacidade (4 Meses)'
                  });
                }

                return (
                  <>
                    {/* Excel Upload Panel */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }} className="no-print">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: uploadedFileName ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: uploadedFileName ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(6,182,212,0.2)' }}>
                          {uploadedFileName ? <FileSpreadsheet size={20} style={{ color: '#10b981' }} /> : <Upload size={20} style={{ color: '#06b6d4' }} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                            {uploadedFileName ? 'Planilha de Novas Obras Anexada' : 'Anexar Obras Futuras a Iniciar'}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {uploadedFileName ? `${uploadedFileName} (${uploadedData?.length || 0} registros)` : 'Carregue arquivos .xlsx ou .csv para cruzamento de capacidade de 4 meses.'}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        {uploadedFileName ? (
                          <button
                            onClick={handleRemoveSpreadsheet}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}
                          >
                            <X size={12} />
                            Desanexar
                          </button>
                        ) : (
                          <label 
                            className="btn btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.08)', margin: 0 }}
                          >
                            <Upload size={12} />
                            Selecionar Arquivo
                            <input 
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleExcelUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Quick Suggestions Chips */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {chips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendChatMessage(chip.text)}
                          disabled={chatLoading}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
                          e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Chat Messages area */}
                  <div style={{ 
                    flex: 1, 
                    minHeight: '350px',
                    maxHeight: '480px',
                    overflowY: 'auto', 
                    background: 'rgba(0,0,0,0.15)', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          background: msg.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                          border: msg.role === 'user' ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '10px 14px',
                          color: '#e2e8f0',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', padding: '0 4px' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}

                    {chatLoading && (
                      <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px 12px 12px 2px' }}>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>O Assistente está analisando os dados e redigindo...</span>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={handleClearChatHistory}
                      className="btn btn-secondary"
                      title="Limpar Histórico de Conversa"
                      style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', color: '#ef4444' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <input
                      type="text"
                      className="form-control"
                      style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      placeholder="Pergunte ao Assistente (ex: 'Quais obras correm risco de atraso?')..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !chatLoading) {
                          handleSendChatMessage();
                        }
                      }}
                      disabled={chatLoading}
                    />
                    <button
                      onClick={() => handleSendChatMessage()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="btn btn-primary"
                      style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}
                    >
                      <Send size={16} />
                      Enviar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

          {/* Audit Logs tab */}
          {activeTab === 'history' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} style={{ color: '#06b6d4' }} />
                Histórico Completo & Logs de Auditoria (Últimos 50 eventos)
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
                Rastreabilidade de todas as criações, edições e deleções feitas pelo sistema ou webhooks.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 8px' }}>Data/Hora</th>
                      <th style={{ padding: '12px 8px' }}>Tabela</th>
                      <th style={{ padding: '12px 8px' }}>Ação</th>
                      <th style={{ padding: '12px 8px' }}>Usuário</th>
                      <th style={{ padding: '12px 8px' }}>Novos Dados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px 8px', textAlign: 'center', color: '#94a3b8' }}>Nenhum log de alteração disponível.</td>
                      </tr>
                    ) : (
                      allLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#ffffff' }}>
                          <td style={{ padding: '12px 8px', color: '#94a3b8' }}>{new Date(log.changed_at).toLocaleString()}</td>
                          <td style={{ padding: '12px 8px' }}><code style={{ background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px' }}>{log.table_name}</code></td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: log.action === 'UPDATE' ? 'rgba(6,182,212,0.1)' : log.action === 'INSERT' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: log.action === 'UPDATE' ? '#06b6d4' : log.action === 'INSERT' ? '#10b981' : '#ef4444' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{log.changed_by_profile?.full_name || 'Sistema (Bot/Webhook)'}</td>
                          <td style={{ padding: '12px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {JSON.stringify(log.new_data || log.old_data)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unified Registration form tab */}
          {activeTab === 'new-registry' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
                <button 
                  onClick={() => setRegSubTab('project')} 
                  style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: regSubTab === 'project' ? '#06b6d4' : '#94a3b8', borderBottom: regSubTab === 'project' ? '2px solid #06b6d4' : 'none' }}
                >
                  Nova Obra
                </button>
                <button 
                  onClick={() => setRegSubTab('team')} 
                  style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: regSubTab === 'team' ? '#06b6d4' : '#94a3b8', borderBottom: regSubTab === 'team' ? '2px solid #06b6d4' : 'none' }}
                >
                  Nova Equipe
                </button>
                <button 
                  onClick={() => setRegSubTab('tech')} 
                  style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: regSubTab === 'tech' ? '#06b6d4' : '#94a3b8', borderBottom: regSubTab === 'tech' ? '2px solid #06b6d4' : 'none' }}
                >
                  Novo Técnico
                </button>
                <button 
                  onClick={() => setRegSubTab('company')} 
                  style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: regSubTab === 'company' ? '#06b6d4' : '#94a3b8', borderBottom: regSubTab === 'company' ? '2px solid #06b6d4' : 'none' }}
                >
                  Nova Empresa Contratada
                </button>
              </div>

              {/* Form Renderers */}
              {regSubTab === 'project' && (
                <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <h4 style={{ marginBottom: '8px' }}>Cadastrar Elevador Comercial para Instalação</h4>
                  <div>
                    <label>Identificação / Nome da Obra</label>
                    <input type="text" value={newProjName} onChange={e => setNewProjName(e.target.value)} required placeholder="Ex: Shopping Iguatemi - Elevador 1" />
                  </div>
                  <div>
                    <label>Modelo do Elevador</label>
                    <input type="text" value={newProjModel} onChange={e => setNewProjModel(e.target.value)} required placeholder="Ex: Schindler 5500" />
                  </div>
                  <div>
                    <label>Empresa Contratada Proprietária</label>
                    <select value={newProjCompanyId} onChange={e => setNewProjCompanyId(e.target.value)} required>
                      <option value="">-- Selecione a Empresa Contratada --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Equipe de Instalação Responsável</label>
                    <select value={newProjTeamId} onChange={e => setNewProjTeamId(e.target.value)}>
                      <option value="">-- Selecione a Equipe --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.companies?.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Gestor Técnico Responsável (Obra)</label>
                    <select value={newProjManagerId} onChange={e => setNewProjManagerId(e.target.value)}>
                      <option value="">-- Selecione o Gestor --</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Técnico Responsável (Confirmação de Fases)</label>
                    <select 
                      value={newProjTechId} 
                      onChange={e => setNewProjTechId(e.target.value)}
                      disabled={!newProjCompanyId}
                    >
                      <option value="">{newProjCompanyId ? '-- Selecione o Técnico --' : '-- Selecione a Empresa Contratada Primeiro --'}</option>
                      {technicians.filter(t => t.company_id === newProjCompanyId).map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Frequência de Lembrete Conversacional (Telegram)</label>
                    <select 
                      value={newProjNotificationFreq} 
                      onChange={e => setNewProjNotificationFreq(e.target.value)}
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal (Segunda-Feira 08h)</option>
                      <option value="monthly">Mensal (Todo dia 1º)</option>
                      <option value="disabled">Desativado</option>
                    </select>
                  </div>
                  <div>
                    <label>Data de Início</label>
                    <input type="date" value={newProjStartDate} onChange={e => setNewProjStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label>Prazo Limite para Conclusão (Padrão: 60 dias corridos)</label>
                    <input type="date" value={newProjDeadline} onChange={e => setNewProjDeadline(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Inicializar Obra</button>
                </form>
              )}

              {regSubTab === 'team' && (
                <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <h4 style={{ marginBottom: '8px' }}>Nova Equipe de Instalação de Elevadores</h4>
                  <div>
                    <label>Nome da Equipe</label>
                    <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: Equipe Leste - Montadores" />
                  </div>
                  <div>
                    <label>Empresa Vinculada</label>
                    <select value={newTeamCompanyId} onChange={e => setNewTeamCompanyId(e.target.value)} required>
                      <option value="">-- Selecione a Empresa --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Criar Equipe</button>
                </form>
              )}

              {regSubTab === 'tech' && (
                <form onSubmit={handleCreateTechnician} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <h4 style={{ marginBottom: '8px' }}>Adicionar Técnico Autorizado</h4>
                  <div>
                    <label>Nome Completo do Técnico</label>
                    <input type="text" value={newTechName} onChange={e => setNewTechName(e.target.value)} required placeholder="Ex: João da Silva" />
                  </div>
                  <div>
                    <label>Telegram Chat ID</label>
                    <input type="text" value={newTechTelegram} onChange={e => setNewTechTelegram(e.target.value)} required placeholder="Ex: 81273981" />
                  </div>
                  <div>
                    <label>Empresa do Técnico (Opcional)</label>
                    <select value={newTechCompanyId} onChange={e => setNewTechCompanyId(e.target.value)}>
                      <option value="">-- Selecione a Empresa --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar Técnico</button>
                </form>
              )}

              {regSubTab === 'company' && (
                <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                  <h4 style={{ marginBottom: '8px' }}>Cadastrar Nova Empresa Contratada</h4>
                  <div>
                    <label>Nome da Empresa</label>
                    <input type="text" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} required placeholder="Ex: Elevadores & Cia Ltda" />
                  </div>
                  <div>
                    <label>CNPJ (Opcional)</label>
                    <input type="text" value={newCompanyCnpj} onChange={e => setNewCompanyCnpj(e.target.value)} placeholder="Ex: 00.000.000/0001-00" />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar Empresa Contratada</button>
                </form>
              )}
            </div>
          )}

        </main>
      )}
      {renderEditModal()}
      {renderReportModal()}
    </div>
  );
}
