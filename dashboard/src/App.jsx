import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Activity, CheckCircle, TrendingUp, Plus, Users, Wrench, Settings, 
  LogOut, Bell, ArrowLeft, AlertTriangle, UserCheck, RefreshCw, 
  Smartphone, ShieldAlert, Check, X, ChevronRight, HardHat, Calendar,
  Building, Briefcase, Clock, FileText, BarChart2
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

  // Active view states: 'projects' | 'teams' | 'companies' | 'new-project' | 'new-tech' | 'new-company' | 'new-team'
  const [activeTab, setActiveTab] = useState('projects');
  
  // Data lists
  const [projects, setProjects] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectPhases, setProjectPhases] = useState([]);
  const [projectLogs, setProjectLogs] = useState([]);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Forms
  const [newProjName, setNewProjName] = useState('');
  const [newProjModel, setNewProjModel] = useState('');
  const [newProjCompanyId, setNewProjCompanyId] = useState('');
  const [newProjTeamId, setNewProjTeamId] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState('');
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
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeProject]);

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
    else setProjects(projs || []);

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
      // Sort by phase number in memory
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
      setActiveTab('technicians');
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
      
      // Update local state metrics dynamically
      fetchProjectPhases(activeProject.project_id);
      fetchProjectAuditLogs(activeProject.project_id);
      
      // Reload projects view
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
      
      // Refresh project object
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

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const getProgressColorClass = (percent) => {
    if (percent === 100) return 'bg-progress-p100 progress-p100';
    if (percent === 75) return 'bg-progress-p75 progress-p75';
    if (percent === 50) return 'bg-progress-p50 progress-p50';
    if (percent === 25) return 'bg-progress-p25 progress-p25';
    return 'bg-progress-p0 progress-p0';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16' }}>
        <RefreshCw style={{ animation: 'spin 2s linear infinite', color: '#06b6d4' }} size={48} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Carregando dados estruturados do Supabase...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '32px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <Activity style={{ color: '#06b6d4' }} size={32} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>ElevateSync</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Painel Comercial de Instalações</p>
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
      <header className="glass-panel" style={{ margin: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity style={{ color: '#06b6d4' }} size={28} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>ElevateSync</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitoramento de Instalações Comerciais</p>
          </div>
        </div>
        <button onClick={handleLogOut} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* Project Detail Sub-view */}
      {activeProject ? (
        <main style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

          {/* Project Info Block */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>{activeProject.project_name}</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} /> Cliente: {activeProject.company_name || 'Sem empresa'} | Modelo: {activeProject.elevator_model}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={16} /> Equipe de Campo: {activeProject.team_name || 'Sem equipe'} | Gestor: {activeProject.manager_name || 'Sem gestor'}
              </p>
            </div>

            {/* Editable Deadline Field */}
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

            {/* Metrics */}
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

          {/* 20 Phases Grid */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={20} style={{ color: '#06b6d4' }} />
              Acompanhamento de Fases (Fases 1 a 20)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
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
                      <span>Status: <strong>{phase.started ? 'Executado' : 'Não Executado'}</strong></span>
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
        </main>
      ) : (
        /* Standard Navigation Views */
        <main style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px', gap: '8px', overflowX: 'auto' }}>
            {[
              { id: 'projects', label: 'Instalações Comerciais' },
              { id: 'teams', label: 'Equipes de Campo' },
              { id: 'companies', label: 'Clientes / Empresas' },
              { id: 'new-project', label: '+ Nova Obra' },
              { id: 'new-team', label: '+ Nova Equipe' },
              { id: 'new-tech', label: '+ Novo Técnico' },
              { id: 'new-company', label: '+ Novo Cliente' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                style={{ background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: activeTab === tab.id ? '#06b6d4' : '#94a3b8', borderBottom: activeTab === tab.id ? '2px solid #06b6d4' : 'none', whiteSpace: 'nowrap' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Projects view */}
          {activeTab === 'projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }} className="animate-fade-in">
              {projects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <AlertTriangle style={{ color: '#f59e0b', marginBottom: '12px' }} size={32} />
                  <h4 style={{ color: '#ffffff' }}>Nenhuma instalação comercial cadastrada</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px' }}>Selecione "+ Nova Obra" acima para inicializar a instalação de um elevador.</p>
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
                        <Building size={14} /> Cliente: {proj.company_name || 'Sem empresa'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Users size={14} /> Equipe: {proj.team_name || 'Sem equipe'}
                      </p>
                      
                      {/* Linear bar metrics */}
                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${proj.overall_progress_percent}%`, height: '100%', backgroundColor: proj.overall_progress_percent === 100 ? '#10b981' : '#06b6d4', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: proj.overall_progress_percent === 100 ? '#10b981' : '#06b6d4' }}>{proj.overall_progress_percent}%</span>
                      </div>

                      {/* Deadlines */}
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>Restam: <strong>{proj.days_remaining} dias</strong></span>
                        {proj.is_delayed ? (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>Atraso</span>
                        ) : (
                          <span>Prazo OK</span>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => { setActiveProject(proj); fetchProjectPhases(proj.project_id); fetchProjectAuditLogs(proj.project_id); }} 
                      className="btn btn-primary" style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem' }}
                    >
                      Acompanhar Fases
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Teams tab */}
          {activeTab === 'teams' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }} className="animate-fade-in">
              {teams.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>Nenhuma equipe cadastrada.</p>
              ) : (
                teams.map(t => (
                  <div key={t.id} className="glass-panel" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Empresa Parceira: {t.companies?.name || 'Não associada'}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Companies tab */}
          {activeTab === 'companies' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }} className="animate-fade-in">
              {companies.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>Nenhuma empresa cadastrada.</p>
              ) : (
                companies.map(c => (
                  <div key={c.id} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building style={{ color: '#06b6d4' }} />
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{c.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CNPJ: {c.cnpj || 'Não informado'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* New Project Form */}
          {activeTab === 'new-project' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus style={{ color: '#06b6d4' }} /> Nova Obra de Elevador Comercial
              </h3>
              
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Identificação da Obra / Localização</label>
                  <input type="text" value={newProjName} onChange={e => setNewProjName(e.target.value)} required placeholder="Ex: Shopping Iguatemi - Elevador Serviço 3" />
                </div>
                
                <div>
                  <label>Modelo do Elevador</label>
                  <input type="text" value={newProjModel} onChange={e => setNewProjModel(e.target.value)} required placeholder="Ex: Schindler 5500" />
                </div>

                <div>
                  <label>Cliente (Empresa)</label>
                  <select value={newProjCompanyId} onChange={e => setNewProjCompanyId(e.target.value)} required>
                    <option value="">-- Selecione o Cliente --</option>
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
                  <label>Gestor da Obra</label>
                  <select value={newProjManagerId} onChange={e => setNewProjManagerId(e.target.value)}>
                    <option value="">-- Selecione o Gestor --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Data de Início da Obra</label>
                  <input type="date" value={newProjStartDate} onChange={e => setNewProjStartDate(e.target.value)} required />
                </div>

                <div>
                  <label>Prazo Final Estimado (Padrão: 60 dias corridos)</label>
                  <input type="date" value={newProjDeadline} onChange={e => setNewProjDeadline(e.target.value)} required />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Criar Projeto & Inicializar Fases
                </button>
              </form>
            </div>
          )}

          {/* New Team Form */}
          {activeTab === 'new-team' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ marginBottom: '20px' }}>Nova Equipe de Instalação</h3>
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Nome da Equipe</label>
                  <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: Equipe Alfa - Montadores" />
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
                <button type="submit" className="btn btn-primary">Criar Equipe</button>
              </form>
            </div>
          )}

          {/* New Tech Form */}
          {activeTab === 'new-tech' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ marginBottom: '20px' }}>Adicionar Técnico Autorizado</h3>
              <form onSubmit={handleCreateTechnician} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Nome do Técnico</label>
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
                <button type="submit" className="btn btn-primary">Cadastrar Técnico</button>
              </form>
            </div>
          )}

          {/* New Company Form */}
          {activeTab === 'new-company' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ marginBottom: '20px' }}>Cadastrar Nova Empresa Cliente</h3>
              <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Nome da Empresa</label>
                  <input type="text" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} required placeholder="Ex: Elevadores & Cia Ltda" />
                </div>
                <div>
                  <label>CNPJ (Opcional)</label>
                  <input type="text" value={newCompanyCnpj} onChange={e => setNewCompanyCnpj(e.target.value)} placeholder="Ex: 00.000.000/0001-00" />
                </div>
                <button type="submit" className="btn btn-primary">Cadastrar Empresa</button>
              </form>
            </div>
          )}

        </main>
      )}
    </div>
  );
}
