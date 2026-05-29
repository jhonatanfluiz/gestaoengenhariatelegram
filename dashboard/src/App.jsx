import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Activity, CheckCircle, TrendingUp, Plus, Users, Wrench, Settings, 
  LogOut, Bell, ArrowLeft, AlertTriangle, UserCheck, RefreshCw, 
  Smartphone, ShieldAlert, Check, X, ChevronLeft, ChevronRight, ChevronDown, HardHat, Calendar,
  Building, Briefcase, Clock, FileText, BarChart2, Shield, Eye, Brain, Sparkles,
  Send, Trash2, Upload, FileSpreadsheet, Maximize2, Minimize2, Lock, Flag, Printer, MessageCircle, Camera, Image as ImageIcon, Mic, Square
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AudioRecorder from 'audio-recorder-polyfill';

// Use polyfill on Safari since it doesn't support audio/webm natively
if (!window.MediaRecorder || (window.MediaRecorder && !window.MediaRecorder.isTypeSupported('audio/webm'))) {
  window.MediaRecorder = AudioRecorder;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [emailErrorText, setEmailErrorText] = useState('');

  // View Only state
  const urlParams = new URLSearchParams(window.location.search);
  const isTechView = !!urlParams.get('tech_view');
  const [viewOnlyProjectId] = useState(() => urlParams.get('view_report') || urlParams.get('tech_view'));
  const [clientIsAuthenticated, setClientIsAuthenticated] = useState(false);
  const [clientPasswordInput, setClientPasswordInput] = useState('');
  const [viewOnlyProject, setViewOnlyProject] = useState(null);
  const [viewOnlyPhases, setViewOnlyPhases] = useState([]);
  const [viewOnlyLoading, setViewOnlyLoading] = useState(false);
  const [showMobileSchedule, setShowMobileSchedule] = useState(false);
  const [viewOnlyIssues, setViewOnlyIssues] = useState([]);

  useEffect(() => {
    if (viewOnlyProjectId) {
      const fetchViewOnlyData = async () => {
        setViewOnlyLoading(true);
        try {
          // Fetch project
          const { data: projData, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('id', viewOnlyProjectId)
            .single();

          if (projErr) throw projErr;
          setViewOnlyProject(projData);

          // Fetch phases progress
          const { data: phasesData, error: phasesErr } = await supabase
            .from('project_phases_progress')
            .select(`
              *,
              phases:phase_id (
                id,
                phase_number,
                name
              )
            `)
            .eq('project_id', viewOnlyProjectId)
            .order('phase_number', { referencedTable: 'phases', ascending: true });

          if (!phasesErr && phasesData) {
            setViewOnlyPhases(phasesData.sort((a, b) => a.phases.phase_number - b.phases.phase_number));
          }
          
          const { data: issuesData } = await supabase
            .from('mensagens_obra')
            .select('*')
            .eq('obra_id', viewOnlyProjectId);
          if (issuesData) setViewOnlyIssues(issuesData);
          
          setSCurveProjId(viewOnlyProjectId);
        } catch (error) {
          console.error("Error fetching view only data:", error);
        } finally {
          setViewOnlyLoading(false);
        }
      };
      fetchViewOnlyData();
    }
  }, [viewOnlyProjectId]);
  // Active view states: 'projects' | 'teams' | 'companies' | 'phases' | 'history' | 's-curve' | 'ranking' | 'new-registry'
  const [activeTab, setActiveTab] = useState('menu');
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
  const [globalIssues, setGlobalIssues] = useState([]);
  const [showGlobalIssuesModal, setShowGlobalIssuesModal] = useState(false);
  
  // Exclusão de Master
  const [masterToDelete, setMasterToDelete] = useState(null);
  const [showMasterDeleteConfirm, setShowMasterDeleteConfirm] = useState(false);
  const [showMasterDeletePin, setShowMasterDeletePin] = useState(false);
  const [masterDeleteGeneratedPin, setMasterDeleteGeneratedPin] = useState('');
  const [masterDeleteInputPin, setMasterDeleteInputPin] = useState('');
  
  // Active selected elements
  const [activeProject, setActiveProject] = useState(null);
  const [projectPhases, setProjectPhases] = useState([]);
  const [projectLogs, setProjectLogs] = useState([]);
  
  // Ocorrências/Mensagens
  const [projectIssues, setProjectIssues] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuePhaseId, setIssuePhaseId] = useState(null);
  const [issueText, setIssueText] = useState('');
  const [issueFile, setIssueFile] = useState(null);
  const [uploadingIssue, setUploadingIssue] = useState(false);
  const [resolveIssueText, setResolveIssueText] = useState({});

  const [selectedCascadeTeamId, setSelectedCascadeTeamId] = useState('');
  const [selectedCascadeCompanyId, setSelectedCascadeCompanyId] = useState('');
  const teamCarouselRef = React.useRef(null);
  const companyCarouselRef = React.useRef(null);

  const scrollTeams = (direction) => {
    if (teamCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      teamCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollCompanies = (direction) => {
    if (companyCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      companyCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToCompany = (companyId) => {
    const container = companyCarouselRef.current;
    if (!container) return;
    const card = container.querySelector(`[data-company-id="${companyId}"]`);
    if (!card) return;
    
    // Calculate the scroll position to center the card
    const cardCenter = card.offsetLeft + card.clientWidth / 2;
    const containerCenterOffset = container.clientWidth / 2;
    const targetScrollLeft = cardCenter - containerCenterOffset;
    
    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  };

  const handleCompanyScroll = (e) => {
    const container = e.target;
    const children = container.children;
    if (!children || children.length === 0) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestCompanyId = '';
    let minDistance = Infinity;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const companyId = child.getAttribute('data-company-id');
      if (!companyId) continue;

      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestCompanyId = companyId;
      }
    }

    if (closestCompanyId && closestCompanyId !== selectedCascadeCompanyId) {
      setSelectedCascadeCompanyId(closestCompanyId);
    }
  };

  const scrollToTeam = (teamId) => {
    const container = teamCarouselRef.current;
    if (!container) return;
    const card = container.querySelector(`[data-team-id="${teamId}"]`);
    if (!card) return;
    
    const cardCenter = card.offsetLeft + card.clientWidth / 2;
    const containerCenterOffset = container.clientWidth / 2;
    const targetScrollLeft = cardCenter - containerCenterOffset;
    
    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
  };

  const centerElementInViewport = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // S-Curve states
  const [sCurveProjId, setSCurveProjId] = useState('');
  const [sCurveData, setSCurveData] = useState([]);

  // Editing state for CRUD (Obras, Equipes, Técnicos, Empresas)
  const [editingElement, setEditingElement] = useState(null);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editTeamManagerId, setEditTeamManagerId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editTechId, setEditTechId] = useState('');
  const [editNotificationFreq, setEditNotificationFreq] = useState('weekly');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadlineDate, setEditDeadlineDate] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editFixedTeamId, setEditFixedTeamId] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editStops, setEditStops] = useState('');
  const [editType, setEditType] = useState('passageiro');
  const [editAddress, setEditAddress] = useState('');
  const [editClientPassword, setEditClientPassword] = useState('');


  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Project sub-tab navigation
  const [projectSubTab, setProjectSubTab] = useState('menu'); // 'menu' | 'phases' | 'report' | 'history' | 'schedule' | 'issues'

  // Report modal state
  const [activeReportModal, setActiveReportModal] = useState(null); // { type: 'tech' | 'company', data: item }
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);


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
  const [expandedAiEst, setExpandedAiEst] = useState(null); // { projectName, text }
  const [expandedPhases, setExpandedPhases] = useState({});

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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [uploadedData, setUploadedData] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/wav' });
        const actualMimeType = audioBlob.type;
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          if (!base64data) {
            showToast('Erro: gravação de áudio vazia. Tente novamente.', 'danger');
            return;
          }
          // Strip codecs=... if present
          const cleanMimeType = actualMimeType.split(';')[0];
          const geminiMimeType = cleanMimeType === 'audio/mp4' ? 'video/mp4' : cleanMimeType;
          handleSendChatMessage("🔊 Mensagem de Áudio enviada", base64data, geminiMimeType);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      showToast('Erro ao acessar microfone: ' + err.message, 'danger');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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
  const [newProjCapacity, setNewProjCapacity] = useState('');
  const [newProjStops, setNewProjStops] = useState('');
  const [newProjType, setNewProjType] = useState('passageiro');
  const [newProjAddress, setNewProjAddress] = useState('');
  const [newProjClientPassword, setNewProjClientPassword] = useState('');

  const [newTechName, setNewTechName] = useState('');
  const [newTechTelegram, setNewTechTelegram] = useState('');
  const [newTechCompanyId, setNewTechCompanyId] = useState('');

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCnpj, setNewCompanyCnpj] = useState('');
  const [newCompanyFixedTeamId, setNewCompanyFixedTeamId] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCompanyId, setNewTeamCompanyId] = useState('');
  const [newTeamManagerId, setNewTeamManagerId] = useState('');

  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [newManagerAccessLevel, setNewManagerAccessLevel] = useState('restricted');

  const [msgNotification, setMsgNotification] = useState(null);
  const [aiFloatHover, setAiFloatHover] = useState(false);

  // Touch swipe handling for mobile
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

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
      if (session) {
        localStorage.setItem('device_verified_' + session.user.id, 'true');
        setSession(session);
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (!localStorage.getItem('device_verified_' + session.user.id)) {
          if (window.isChecking2FA) return; // Prevent saving during password check
          localStorage.setItem('device_verified_' + session.user.id, 'true');
        }
        setSession(session);
        fetchUserProfile(session.user.id);
      } else {
        setSession(null);
        setUserProfile(null);
        setLoading(false);
      }
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

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.warn('Profile not found for authenticated user:', userId);
        showToast('Perfil de usuário não encontrado. Faça cadastro primeiro.', 'danger');
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      showToast('Erro ao carregar perfil de usuário.', 'danger');
      await supabase.auth.signOut();
      setSession(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (session && userProfile) {
      fetchDashboardData();
    }
  }, [session, userProfile]);

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
          fetchProjectIssues(activeProject.project_id);
        }
        if (sCurveProjId) {
          fetchSCurveData(sCurveProjId);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_obra' }, () => {
        fetchDashboardData();
        if (activeProject) {
          fetchProjectIssues(activeProject.project_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeProject, sCurveProjId]);

  // Fetch S-Curve data when a project is selected
  useEffect(() => {
    if ((session || viewOnlyProjectId) && sCurveProjId) {
      fetchSCurveData(sCurveProjId);
    } else {
      setSCurveData([]);
    }
  }, [sCurveProjId, session, viewOnlyProjectId]);

  const showToast = (text, type = 'success') => {
    setMsgNotification({ text, type });
    setTimeout(() => setMsgNotification(null), 4000);
  };

  const fetchDashboardData = async () => {
    // 1. Fetch pre-calculated project metrics from view
    let projQuery = supabase.from('vw_looker_studio_metrics').select('*');
    if (userProfile && userProfile.role === 'manager' && userProfile.access_level === 'restricted') {
      projQuery = projQuery.eq('assigned_manager_id', userProfile.id);
    }
    const { data: projs, error: err1 } = await projQuery;

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

    // 3. Fetch managers and masters
    const { data: mgrs, error: err3 } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['master', 'manager'])
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
      .select('*, profiles:assigned_manager_id(full_name)')
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
    let logsQuery = supabase.from('change_logs').select(`
      *,
      changed_by_profile:profiles(full_name)
    `);
    if (userProfile && userProfile.role === 'manager' && userProfile.access_level === 'restricted') {
      const assignedProjIds = projs ? projs.map(p => p.project_id) : [];
      if (assignedProjIds.length > 0) {
        logsQuery = logsQuery.in('record_id', assignedProjIds);
      } else {
        logsQuery = logsQuery.eq('record_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: logs, error: err7 } = await logsQuery.order('changed_at', { ascending: false }).limit(50);

    if (err7) console.error(err7);
    else setAllLogs(logs || []);

    // 8. Fetch Pending Rankings
    let rankQuery = supabase.from('vw_pending_ranking').select('*');
    if (userProfile && userProfile.role === 'manager' && userProfile.access_level === 'restricted') {
      const assignedProjIds = projs ? projs.map(p => p.project_id) : [];
      if (assignedProjIds.length > 0) {
        rankQuery = rankQuery.in('project_id', assignedProjIds);
      } else {
        rankQuery = rankQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: rank, error: err8 } = await rankQuery;

    if (err8) console.error(err8);
    else setPendingRankings(rank || []);

    // 9. Fetch global pending issues
    let issuesQuery = supabase.from('mensagens_obra').select('*').eq('status', 'Pendente');
    if (userProfile && userProfile.role === 'manager' && userProfile.access_level === 'restricted') {
      const assignedProjIds = projs ? projs.map(p => p.project_id) : [];
      if (assignedProjIds.length > 0) {
        issuesQuery = issuesQuery.in('obra_id', assignedProjIds);
      } else {
        issuesQuery = issuesQuery.eq('obra_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: gIssues, error: gErr } = await issuesQuery.order('created_at', { ascending: false });
    if (gErr) console.error(gErr);
    else setGlobalIssues(gIssues || []);
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

  const fetchProjectIssues = async (projId) => {
    const { data, error } = await supabase
      .from('mensagens_obra')
      .select('*, phases(name, phase_number)')
      .eq('obra_id', projId)
      .order('created_at', { ascending: false });
    if (!error) setProjectIssues(data || []);
  };

  const handleCreateIssue = async () => {
    if (!issueText.trim() && !issueFile) return;
    setUploadingIssue(true);
    setShowIssueModal(false);
    showToast('Enviando ocorrência em segundo plano...', 'info');
    const targetProjId = viewOnlyProjectId || activeProject?.project_id;
    try {
      let imageUrl = null;
      if (issueFile) {
        const fileExt = issueFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${targetProjId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ocorrencias').upload(filePath, issueFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('ocorrencias').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
      
      const { error } = await supabase.from('mensagens_obra').insert([{
        obra_id: targetProjId,
        fase_id: issuePhaseId,
        texto_tecnico: issueText,
        imagem_url: imageUrl,
        status: 'Pendente'
      }]);
      
      if (error) throw error;
      showToast('Ocorrência registrada com sucesso.', 'success');
      setIssueText('');
      setIssueFile(null);
      setIssuePhaseId(null);
      if (activeProject) fetchProjectIssues(activeProject.project_id);
      if (viewOnlyProjectId) {
        const { data: issuesData } = await supabase
          .from('mensagens_obra')
          .select('*')
          .eq('obra_id', viewOnlyProjectId);
        if (issuesData) setViewOnlyIssues(issuesData);
      }
    } catch (e) {
      showToast('Erro ao criar ocorrência: ' + e.message, 'danger');
      setShowIssueModal(true);
    } finally {
      setUploadingIssue(false);
    }
  };

  const handleResolveIssue = async (issueId) => {
    const response = resolveIssueText[issueId];
    if (!response?.trim()) return;
    try {
      const { error } = await supabase.from('mensagens_obra').update({
        status: 'Resolvido',
        resposta_gestor: response,
        updated_at: new Date().toISOString()
      }).eq('id', issueId);
      
      if (error) throw error;
      showToast('Ocorrência resolvida.', 'success');
      setResolveIssueText(prev => ({ ...prev, [issueId]: '' }));
      fetchProjectIssues(activeProject.project_id);
    } catch (e) {
      showToast('Erro ao resolver: ' + e.message, 'danger');
    }
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

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    
    // Check for uppercase, spaces, accented chars, or cedilla
    if (/[A-ZÀ-ÿÇç\s]/.test(val)) {
      setEmailErrorText('Digite e-mail válido (minúsculo, sem acentos)');
    } else {
      setEmailErrorText('');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Por favor, insira um e-mail válido (ex: gestor@empresa.com).');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      try {
        // Query master count
        const { count, error: countErr } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'master');

        if (countErr) throw countErr;

        if (count !== null && count >= 2) {
          setAuthError('O limite de 2 administradores Master já foi atingido. Para cadastrar um novo administrador, peça para um Master atual excluir uma conta existente na aba "Equipes & Técnicos".');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        } else {
          if (data?.user) {
            await supabase.from('profiles').insert({
              id: data.user.id,
              auth_user_id: data.user.id,
              full_name: 'Gestor Master',
              role: 'master',
              access_level: 'unrestricted'
            });
            showToast('Cadastro Master efetuado com sucesso! Faça login.');
            setIsSignUp(false);
          } else {
            showToast('Cadastro solicitado, verifique seu e-mail se necessário.');
          }
        }
      } catch (err) {
        console.error('Error in signup check:', err);
        setAuthError('Erro ao verificar limite de administradores: ' + err.message);
      }
    } else {
      window.isChecking2FA = true;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        window.isChecking2FA = false;
        setAuthError(error.message);
      } else {
        // Ignorando verificação de 2FA do dispositivo temporariamente (evita erro de limite de emails no Supabase)
        localStorage.setItem('device_verified_' + data.user.id, 'true');
        window.isChecking2FA = false;
        setSession(data.session);
        fetchUserProfile(data.user.id);
        showToast('Login efetuado com sucesso!');
      }
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    setAuthError(null);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Por favor, insira seu e-mail acima para recuperar a senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAuthError('Erro ao solicitar recuperação: ' + error.message);
    } else {
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setIsForgotPassword(false);
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
        deadline_date: newProjDeadline,
        capacidade_pessoas: newProjCapacity ? parseInt(newProjCapacity, 10) : null,
        numero_paradas: newProjStops ? parseInt(newProjStops, 10) : null,
        tipo_elevador: newProjType,
        endereco: newProjAddress,
        senha_cliente: newProjClientPassword
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
      setNewProjCapacity('');
      setNewProjStops('');
      setNewProjType('passageiro');
      setNewProjAddress('');
      setNewProjClientPassword('');
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
        cnpj: newCompanyCnpj || null,
        fixed_team_id: newCompanyFixedTeamId || null
      });

    if (error) showToast('Erro ao cadastrar empresa: ' + error.message, 'danger');
    else {
      showToast(`Empresa "${newCompanyName}" cadastrada!`);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setNewCompanyFixedTeamId('');
      setActiveTab('companies');
      fetchDashboardData();
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) return;

    const { error } = await supabase
      .from('teams')
      .insert({
        name: newTeamName,
        assigned_manager_id: newTeamManagerId || null
      });

    if (error) showToast('Erro ao criar equipe: ' + error.message, 'danger');
    else {
      showToast(`Equipe "${newTeamName}" criada!`);
      setNewTeamName('');
      setNewTeamManagerId('');
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

  // Auto-set assigned manager for manager accounts
  useEffect(() => {
    if (userProfile && userProfile.role === 'manager') {
      setNewProjManagerId(userProfile.id);
    } else {
      setNewProjManagerId('');
    }
  }, [userProfile]);

  const handleCreateManager = async (e) => {
    e.preventDefault();
    if (!newManagerName || !newManagerEmail || !newManagerPassword) {
      showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    try {
      showToast('Cadastrando novo gestor...');
      
      // Secondary client configured without session persistence
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data, error: signUpError } = await authClient.auth.signUp({
        email: newManagerEmail,
        password: newManagerPassword
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Falha ao criar usuário de autenticação do gestor.');
      }

      const newUserId = data.user.id;

      // Insert profile details using current master session
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          auth_user_id: newUserId,
          full_name: newManagerName,
          email: newManagerEmail,
          role: 'manager',
          access_level: newManagerAccessLevel
        });

      if (profileError) {
        if (profileError.message.includes('profiles_auth_user_id_fkey') || profileError.code === '23503') {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        throw profileError;
      }

      showToast(`Gestor "${newManagerName}" cadastrado com sucesso!`);
      setNewManagerName('');
      setNewManagerEmail('');
      setNewManagerPassword('');
      setNewManagerAccessLevel('restricted');
      fetchDashboardData();
    } catch (err) {
      console.error('Error creating manager:', err);
      showToast('Erro ao criar gestor: ' + err.message, 'danger');
    }
  };

  const handleToggleManagerAccess = async (mgr) => {
    const nextAccess = mgr.access_level === 'unrestricted' ? 'restricted' : 'unrestricted';
    const { error } = await supabase
      .from('profiles')
      .update({ access_level: nextAccess })
      .eq('id', mgr.id);

    if (error) {
      showToast('Erro ao atualizar acesso do gestor: ' + error.message, 'danger');
    } else {
      showToast(`Acesso de "${mgr.full_name}" alterado para ${nextAccess === 'unrestricted' ? 'Irrestrito' : 'Restrito'}!`);
      fetchDashboardData();
    }
  };

  const handleDeleteManager = async (mgr) => {
    if (mgr.role === 'master') {
      setMasterToDelete(mgr);
      setShowMasterDeleteConfirm(true);
      return;
    }

    if (!window.confirm('Tem certeza de que deseja excluir este gestor? O acesso dele será bloqueado imediatamente.')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', mgr.id);

    if (error) {
      showToast('Erro ao excluir gestor: ' + error.message, 'danger');
    } else {
      showToast('Gestor excluído com sucesso!');
      fetchDashboardData();
    }
  };

  const handleConfirmMasterDeleteStage1 = async () => {
    if (!masterToDelete) return;
    
    showToast('Enviando e-mail de alerta...');
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit pin
    setMasterDeleteGeneratedPin(pin);
    setMasterDeleteInputPin('');

    try {
      const targetEmails = managers
        .filter(m => m.role === 'master' && m.id !== masterToDelete.id && m.email)
        .map(m => m.email);

      if (targetEmails.length > 0) {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            toEmails: targetEmails,
            targetManagerName: masterToDelete.full_name,
            deletingUserName: userProfile?.full_name || 'Desconhecido'
          }
        });
        if (error) {
          console.error('Edge Function error:', error);
          // Permite prosseguir mesmo com erro, ou bloqueia? 
          // O usuário quer aviso. Mas se a edge function falhar por conta do Resend não aceitar, vamos continuar para não travar o sistema.
        }
      }
      
      setShowMasterDeleteConfirm(false);
      setShowMasterDeletePin(true);
      showToast('Aviso disparado. Digite o PIN de segurança.');
    } catch (err) {
      console.error(err);
      showToast('Erro interno ao disparar e-mail, mas prosseguindo com segurança.', 'warning');
      setShowMasterDeleteConfirm(false);
      setShowMasterDeletePin(true);
    }
  };

  const handleConfirmMasterDeleteStage2 = async () => {
    if (masterDeleteInputPin !== masterDeleteGeneratedPin) {
      showToast('Código PIN incorreto!', 'danger');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', masterToDelete.id);

    if (error) {
      showToast('Erro ao excluir gestor master: ' + error.message, 'danger');
    } else {
      showToast('Gestor master excluído com sucesso!');
      fetchDashboardData();
      setMasterToDelete(null);
      setShowMasterDeletePin(false);
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
      fetchProjectIssues(activeProject.project_id);
      
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
      setEditCapacity(item.capacidade_pessoas || '');
      setEditStops(item.numero_paradas || '');
      setEditType(item.tipo_elevador || 'passageiro');
      setEditAddress(item.endereco || '');
      setEditClientPassword(item.senha_cliente || '');
    } else if (type === 'team') {
      setEditName(item.name || '');
      setEditCompanyId(item.company_id || '');
      setEditTeamManagerId(item.assigned_manager_id || '');
    } else if (type === 'tech') {
      setEditName(item.full_name || '');
      setEditTelegram(item.telegram_chat_id || '');
      setEditCompanyId(item.company_id || '');
    } else if (type === 'company') {
      setEditName(item.name || '');
      setEditCnpj(item.cnpj || '');
      setEditFixedTeamId(item.fixed_team_id || '');
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
        deadline_date: editDeadlineDate,
        capacidade_pessoas: editCapacity ? parseInt(editCapacity, 10) : null,
        numero_paradas: editStops ? parseInt(editStops, 10) : null,
        tipo_elevador: editType,
        endereco: editAddress,
        senha_cliente: editClientPassword
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
        assigned_manager_id: editTeamManagerId || null
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
        cnpj: editCnpj || null,
        fixed_team_id: editFixedTeamId || null
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

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { prompt }
      });

      if (error) throw error;
      if (!data || !data.text) throw new Error('Sem resposta da IA.');

      setAiAnalysis(data.text);
    } catch (e) {
      console.error(e);
      showToast('Erro na análise da IA: ' + e.message, 'danger');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateProjectForecast = async () => {
    if (!activeProject) return;

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

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { prompt }
      });

      if (error) throw error;
      if (!data || !data.text) throw new Error('Sem resposta da IA.');
      
      const text = data.text;
      
      // Update local storage and state
      updateProjectForecast(activeProject.project_id, text);
      showToast('Previsão IA atualizada com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao estimar com IA: ' + e.message, 'danger');
    } finally {
      setForecastLoading(false);
    }
  };

  const handleSendChatMessage = async (textToSend = null, audioBase64 = null, audioMimeType = null) => {
    const messageText = textToSend || chatInput;
    if (!messageText || !messageText.trim()) return;

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

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { 
          prompt: systemPrompt,
          ...(audioBase64 ? { audioBase64, audioMimeType } : {})
        }
      });

      if (error) throw error;
      if (!data || !data.text) throw new Error('Sem resposta da IA.');

      const assistantText = data.text;
      
      const newAssistantMessage = {
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, newAssistantMessage];
      setChatMessages(finalMessages);
      localStorage.setItem('elevatesync_chat_history', JSON.stringify(finalMessages));
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
  const renderProjectSchedule = () => {
    if (!activeProject) return null;
    
    const start = new Date(activeProject.start_date);
    const end = new Date(activeProject.deadline_date);
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const phaseCount = projectPhases.length || 20;
    const daysPerPhase = totalDays / phaseCount;

    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} style={{ color: '#06b6d4' }} />
          Cronograma Inteligente (Previsão de Prazos)
        </h3>
        
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Este cronograma é calculado automaticamente baseando-se na data de início prevista ({start.toLocaleDateString('pt-BR')}) e no prazo final acordado ({end.toLocaleDateString('pt-BR')}). Ele distribui o tempo ideal necessário para concluir cada fase dentro do prazo estimado.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {projectPhases.map((phase, index) => {
            const phaseDate = new Date(start);
            phaseDate.setDate(phaseDate.getDate() + Math.round(daysPerPhase * (index + 1)));
            
            const isLate = new Date() > phaseDate && phase.progress_percent < 100;
            const isCompleted = phase.progress_percent === 100;
            
            const phaseIssues = projectIssues.filter(i => i.fase_id === phase.phases?.id);
            const hasOpenIssue = phaseIssues.some(i => i.status === 'Pendente');
            const hasResolvedIssue = phaseIssues.length > 0 && !hasOpenIssue;
            
            let statusColor = '#94a3b8'; // default
            if (isCompleted) statusColor = '#10b981'; // green
            else if (isLate) statusColor = '#ef4444'; // red
            else if (phase.started) statusColor = '#3b82f6'; // blue
            
            return (
              <div key={phase.id} style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '12px 16px', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px',
                borderLeft: `4px solid ${statusColor}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: statusColor, fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0
                  }}>
                    {phase.phases.phase_number}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>{phase.phases.name}</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{phase.phases.description}</p>
                    {hasOpenIssue && (
                      <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={12} /> Ocorrência Pendente
                      </div>
                    )}
                    {hasResolvedIssue && (
                      <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <CheckCircle size={12} /> Ocorrência Resolvida
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: statusColor }}>
                    Previsto até: {phaseDate.toLocaleDateString('pt-BR')}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {isCompleted ? `Concluído (${phase.progress_percent}%)` : (phase.started ? `Em Andamento (${phase.progress_percent}%)` : 'Não Iniciado')}
                    {isLate && !isCompleted && ' (Atrasado)'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
                
                {projectForecast[activeProject.project_id] ? (
                  <div style={{ fontSize: '0.8rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '110px', overflowY: 'auto' }}>
                    {renderMarkdown(projectForecast[activeProject.project_id])}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0' }}>Nenhuma estimativa de IA gerada ainda.</p>
                )}
              </div>
            </div>

            {progress > 0 && progress < 100 && (
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
                        <button 
                          onClick={handleGenerateAIReport}
                          disabled={aiLoading}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
                          {aiAnalysis ? 'Atualizar Análise' : 'Gerar Análise'}
                        </button>
                      </div>
                    </div>

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
              {type === 'team' && 'Editar Equipe Fixa'}
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
                <label>Capacidade de Pessoas</label>
                <input type="number" value={editCapacity} onChange={e => setEditCapacity(e.target.value)} placeholder="Ex: 8" />
              </div>
              <div>
                <label>Número de Paradas</label>
                <input type="number" value={editStops} onChange={e => setEditStops(e.target.value)} placeholder="Ex: 10" />
              </div>
              <div>
                <label>Tipo de Elevador</label>
                <select value={editType} onChange={e => setEditType(e.target.value)}>
                  <option value="passageiro">Passageiro</option>
                  <option value="carga">Carga</option>
                  <option value="maca">Maca</option>
                </select>
              </div>
              <div>
                <label>Endereço</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Ex: Rua Vergueiro, 1000 - SP" style={{ width: '100%' }} />
              </div>
              <div>
                <label>Senha do Cliente (6 dígitos)</label>
                <input type="text" value={editClientPassword} onChange={e => setEditClientPassword(e.target.value.replace(/\\D/g, '').slice(0, 6))} placeholder="Ex: 123456" maxLength={6} minLength={6} style={{ width: '100%' }} />
              </div>
              <div>
                <label>Empresa Contratada Proprietária</label>
                <select 
                  value={editCompanyId} 
                  onChange={e => {
                    const compId = e.target.value;
                    setEditCompanyId(compId);
                    const comp = companies.find(c => c.id === compId);
                    if (comp && comp.fixed_team_id) {
                      setEditTeamId(comp.fixed_team_id);
                      const team = teams.find(t => t.id === comp.fixed_team_id);
                      if (team && team.assigned_manager_id) {
                        setEditManagerId(team.assigned_manager_id);
                      }
                    } else {
                      setEditTeamId('');
                    }
                  }} 
                  required
                >
                  <option value="">-- Selecione a Empresa Contratada --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Equipe Fixa Responsável</label>
                <select 
                  value={editTeamId} 
                  onChange={e => {
                    const teamId = e.target.value;
                    setEditTeamId(teamId);
                    const team = teams.find(t => t.id === teamId);
                    if (team && team.assigned_manager_id) {
                      setEditManagerId(team.assigned_manager_id);
                    }
                  }}
                >
                  <option value="">-- Sem Equipe Fixa --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
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
                <label>Nome da Equipe Fixa</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>Gestor Responsável Vinculado (Opcional)</label>
                <select value={editTeamManagerId} onChange={e => setEditTeamManagerId(e.target.value)}>
                  <option value="">-- Selecione o Gestor --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
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
              <div>
                <label>Equipe Fixa Vinculada (Opcional)</label>
                <select value={editFixedTeamId} onChange={e => setEditFixedTeamId(e.target.value)}>
                  <option value="">-- Nenhuma Equipe Fixa --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
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
              const proj = (viewOnlyProject && viewOnlyProject.id === sCurveProjId) 
                ? viewOnlyProject 
                : projects.find(p => p.project_id === sCurveProjId);
              
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
  if (viewOnlyProjectId) {
    if (viewOnlyLoading) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: '100vh', background: '#020617' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(6,182,212,0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }
    if (!viewOnlyProject) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: '100vh', background: '#020617' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#f87171' }}>Obra não encontrada.</div>
        </div>
      );
    }

    if (viewOnlyProject.senha_cliente && !clientIsAuthenticated && !isTechView) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: '100vh', background: '#020617' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ margin: '0 auto', background: 'rgba(6,182,212,0.1)', padding: '16px', borderRadius: '50%' }}>
              <Lock size={48} style={{ color: '#06b6d4' }} />
            </div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Área do Cliente</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>Digite a senha de 6 dígitos fornecida para acompanhar a obra <strong style={{ color: '#fff' }}>{viewOnlyProject.name}</strong>.</p>
            
            <input 
              type="password" 
              value={clientPasswordInput} 
              onChange={e => setClientPasswordInput(e.target.value.replace(/\\D/g, '').slice(0, 6))}
              placeholder="******"
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '12px', padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            
            <button 
              onClick={() => {
                if (clientPasswordInput === viewOnlyProject.senha_cliente) {
                  setClientIsAuthenticated(true);
                } else {
                  showToast('Senha incorreta.', 'danger');
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', marginTop: '8px' }}
            >
              Acessar Painel
            </button>
          </div>
        </div>
      );
    }

    const completedCount = viewOnlyPhases.filter(p => p.progress_percent === 100).length;
    const progressPercent = Math.round((completedCount / 20) * 100);
    const aiEstText = projectForecast[viewOnlyProject.id];

    const startDateObj = new Date(viewOnlyProject.start_date);
    const deadlineDateObj = new Date(viewOnlyProject.deadline_date);
    const today = new Date();
    
    let computedElapsedDays = Math.floor((today - startDateObj) / (1000 * 60 * 60 * 24));
    if (computedElapsedDays < 0) computedElapsedDays = 0;
    if (progressPercent === 100 && viewOnlyProject.days_elapsed) {
      computedElapsedDays = viewOnlyProject.days_elapsed;
    }

    const totalContractualDays = Math.max(1, Math.floor((deadlineDateObj - startDateObj) / (1000 * 60 * 60 * 24)));
    const expectedProgress = Math.min(100, Math.round((computedElapsedDays / totalContractualDays) * 100));

    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start', justifyContent: 'center', padding: '16px', minHeight: '100vh', background: '#020617' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <Activity style={{ color: '#06b6d4' }} size={28} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{viewOnlyProject.name}</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Relatório Restrito de Progresso <span style={{ color: '#06b6d4', fontSize: '0.7rem' }}>(V2)</span>
            </p>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => setShowMobileSchedule(!showMobileSchedule)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Calendar size={18} />
              {showMobileSchedule ? 'Ocultar Cronograma' : 'Gerar Cronograma Inteligente'}
            </button>

            {isTechView && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => { setIssuePhaseId(null); setShowIssueModal(true); }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <AlertTriangle size={20} />
                  Relatar Ocorrência de Obra
                </button>
              </div>
            )}

            {showMobileSchedule && (
              <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
                  Cronograma calculado com base no prazo final ({deadlineDateObj.toLocaleDateString('pt-BR')}).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {viewOnlyPhases.map((phase, index) => {
                    const phaseDate = new Date(startDateObj);
                    const totalDays = Math.max(1, (deadlineDateObj - startDateObj) / (1000 * 60 * 60 * 24));
                    const phaseCount = viewOnlyPhases.length || 20;
                    const daysPerPhase = totalDays / phaseCount;
                    
                    phaseDate.setDate(phaseDate.getDate() + Math.round(daysPerPhase * (index + 1)));
                    
                    const isLate = new Date() > phaseDate && phase.progress_percent < 100;
                    const isCompleted = phase.progress_percent === 100;
                    
                    let statusColor = '#94a3b8';
                    if (isCompleted) statusColor = '#10b981';
                    else if (isLate) statusColor = '#ef4444';
                    else if (phase.started) statusColor = '#3b82f6';
                    
                    const phaseIssues = viewOnlyIssues.filter(i => i.fase_id === phase.phases?.id);
                    const hasOpenIssue = phaseIssues.some(i => i.status === 'Pendente');
                    const hasResolvedIssue = phaseIssues.length > 0 && !hasOpenIssue;
                    
                    return (
                      <div key={phase.id} style={{ 
                        padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px',
                        borderLeft: `3px solid ${statusColor}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'block' }}>
                              {phase.phases?.phase_number}. {phase.phases?.name}
                            </span>
                            {hasOpenIssue && (
                              <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertTriangle size={10} /> Ocorrência Aberta
                              </div>
                            )}
                            {hasResolvedIssue && (
                              <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <CheckCircle size={10} /> Ocorrência Resolvida
                              </div>
                            )}
                          </div>
                          {isTechView && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setIssuePhaseId(phase.phases?.id); setShowIssueModal(true); }}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', marginLeft: '8px' }}
                              title="Relatar Ocorrência"
                            >
                              <AlertTriangle size={12} /> Relatar
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                          <span style={{ color: statusColor }}>Até: {phaseDate.toLocaleDateString('pt-BR')}</span>
                          <span style={{ color: '#94a3b8' }}>
                            {isCompleted ? '100%' : (phase.started ? `${phase.progress_percent}%` : 'Não Iniciado')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }} className="no-print">
                  <button
                    onClick={() => window.print()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Printer size={20} />
                    Exportar / Imprimir Cronograma
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#06b6d4', margin: '0 0 4px' }}>{progressPercent}%</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Avanço Total</p>
            </div>
            <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.1)' }}></div>
            <div>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 4px' }}>{completedCount}<span style={{ fontSize: '1rem', color: '#64748b' }}>/20</span></h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Fases Concluídas</p>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Data de Início:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{startDateObj.toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}><Flag size={14} /> Prazo Contratual:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{deadlineDateObj.toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Dias Corridos:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{computedElapsedDays} dias</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: '#94a3b8' }}>Avanço Esperado: <strong style={{ color: '#f59e0b' }}>{expectedProgress}%</strong></span>
                <span style={{ color: '#94a3b8' }}>Avanço Realizado: <strong style={{ color: '#06b6d4' }}>{progressPercent}%</strong></span>
              </div>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '16px', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${expectedProgress}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)', height: '100%', position: 'absolute', left: 0, top: 0, borderRadius: '8px' }} title={`Esperado: ${expectedProgress}%`}></div>
                <div style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #0891b2, #06b6d4)', height: '100%', position: 'absolute', left: 0, top: 0, borderRadius: '8px', boxShadow: '2px 0 8px rgba(0,0,0,0.3)' }} title={`Realizado: ${progressPercent}%`}></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <span style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '6px' }}><Brain size={14} /> Previsão Estimada (IA):</span>
              <span style={{ color: getProjectLinearEstimate({ ...viewOnlyProject, overall_progress_percent: progressPercent, days_elapsed: computedElapsedDays }).isDelayed ? '#ef4444' : '#10b981', fontWeight: 600, textAlign: 'right' }}>
                {getProjectLinearEstimate({ ...viewOnlyProject, overall_progress_percent: progressPercent, days_elapsed: computedElapsedDays }).text}
              </span>
            </div>
          </div>

          <div style={{ minHeight: sCurveData && sCurveData.length > 0 ? '220px' : 'auto', width: '100%', marginTop: '10px' }}>
            {renderSCurveSVG()}
          </div>

          {aiEstText && (
            <div style={{ background: 'rgba(6,182,212,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.1)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#06b6d4', marginBottom: '8px' }}>
                <Brain size={16} /> Análise da IA
              </strong>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto' }}>
                {renderMarkdown(aiEstText)}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Lock size={12} /> Acesso Restrito • ElevateSync
            </span>
          </div>

          {/* Modal de Nova Ocorrência para a view Restrita */}
          {showIssueModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
              <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} style={{ color: '#ef4444' }} /> Relatar Ocorrência</h3>
                  <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Fase (Opcional)</label>
                    <select 
                      value={issuePhaseId || ''} 
                      onChange={e => setIssuePhaseId(e.target.value || null)}
                      style={{ width: '100%', padding: '10px', marginTop: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                    >
                      <option value="">Selecione uma fase...</option>
                      {viewOnlyPhases.map(p => (
                        <option key={p.id} value={p.phases?.id}>Fase {p.phases?.phase_number} - {p.phases?.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Descreva o problema / pendência</label>
                    <textarea 
                      rows="3" 
                      value={issueText} 
                      onChange={e => setIssueText(e.target.value)} 
                      placeholder="Ex: Faltou material X, ferramenta Y quebrou..."
                      style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={14} /> Anexar Foto (Opcional)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setIssueFile(e.target.files[0])}
                      style={{ width: '100%', padding: '8px', marginTop: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.2)' }}
                    />
                  </div>

                  <button 
                    onClick={handleCreateIssue} 
                    disabled={uploadingIssue || (!issueText.trim() && !issueFile)} 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                  >
                    {uploadingIssue ? 'Enviando...' : 'Enviar Ocorrência'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Acompanhamento de Obras de Elevadores</p>
          </div>

          {isVerificationSent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Shield style={{ color: '#10b981' }} size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#10b981' }}>Dispositivo Não Reconhecido</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Para sua segurança, bloqueamos temporariamente o acesso.
                  Enviamos um <strong>Link de Segurança</strong> para o e-mail: <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginTop: '12px' }}>
                  Por favor, acesse seu e-mail e clique no link para validar e autorizar este dispositivo.
                </p>
              </div>
              <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }}>
                Voltar para o Início
              </button>
            </div>
          ) : isForgotPassword ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px', textAlign: 'center' }}>
                Digite o e-mail cadastrado e clique em enviar para receber as instruções de recuperação de senha.
              </p>
              <div>
                <label>E-mail do Gestor</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={handleEmailChange} 
                  required 
                  placeholder="gestor@empresa.com" 
                  style={{ borderColor: emailErrorText ? '#ef4444' : undefined }}
                />
                {emailErrorText && (
                  <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    {emailErrorText}
                  </span>
                )}
              </div>

              {authError && (
                <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                  <ShieldAlert size={20} />
                  <span>{authError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={handlePasswordReset} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
                <button type="button" onClick={() => { setIsForgotPassword(false); setAuthError(null); }} className="btn btn-secondary" style={{ width: '100%' }}>
                  Voltar para o Login
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>E-mail do Gestor</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={handleEmailChange} 
                    required 
                    placeholder="gestor@empresa.com" 
                    style={{ borderColor: emailErrorText ? '#ef4444' : undefined }}
                  />
                  {emailErrorText && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {emailErrorText}
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Senha</label>
                    {!isSignUp && (
                      <button type="button" onClick={() => setIsForgotPassword(true)} style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>

                {authError && (
                  <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                    <ShieldAlert size={20} />
                    <span>{authError}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta Master' : 'Entrar no Sistema')}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
                  {isSignUp ? 'Já possui conta? Fazer Login' : 'Criar nova conta Master'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Touch swipe handling for mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEndX(null); // Reset
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      if (activeProject) {
        // Obra aberta
        const subTabs = ['phases', 'report', 'schedule', 'history'];
        const currentIndex = subTabs.indexOf(projectSubTab);
        if (isLeftSwipe && currentIndex < subTabs.length - 1) {
          setProjectSubTab(subTabs[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
          setProjectSubTab(subTabs[currentIndex - 1]);
        }
      } else {
        // Main tabs
        const mainTabs = ['projects', 's-curve', 'ranking'];
        const currentIndex = mainTabs.indexOf(activeTab);
        if (currentIndex !== -1) {
          if (isLeftSwipe && currentIndex < mainTabs.length - 1) {
            setActiveTab(mainTabs[currentIndex + 1]);
          } else if (isRightSwipe && currentIndex > 0) {
            setActiveTab(mainTabs[currentIndex - 1]);
          }
        }
      }
    }
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setShowGlobalIssuesModal(true)} 
            className="btn" 
            style={{ padding: '8px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'transform 0.2s', width: '38px', height: '38px' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Ocorrências Pendentes"
          >
            <Bell size={18} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulseGlow 2s infinite' }}>
              {globalIssues ? globalIssues.length : 0}
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('new-registry'); setActiveProject(null); }} 
            className="btn" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#090d16', fontWeight: 700, border: 'none', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)', transition: 'transform 0.2s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={16} /> Novo Cadastro
          </button>
          {userProfile && (
            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600, display: 'block', color: '#ffffff' }}>{userProfile.full_name}</span>
              <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600 }}>
                {userProfile.role === 'master' ? '👑 Master Admin' : `Gestor (${userProfile.access_level === 'unrestricted' ? 'Irrestrito' : 'Restrito'})`}
              </span>
            </div>
          )}
          <button onClick={handleLogOut} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Detailed Project View */}
      {activeProject ? (
        <main style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
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
          {projectSubTab === 'menu' ? (
            <div className="domino-board animate-fade-in">
              <div className="domino-five-grid">
              {(() => {
                const completedPhases = projectPhases.filter(p => p.progress_percent === 100).length;
                const activePhase = projectPhases.filter(p => p.started && p.progress_percent < 100).sort((a,b) => b.progress_percent - a.progress_percent)[0] || projectPhases[0];
                const lastLogDate = projectLogs[0] ? new Date(projectLogs[0].changed_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem atualizações';
                const resolvedIssues = projectIssues.filter(i => i.status === 'Resolvido').length;
                const totalIssues = projectIssues.length;

                return (
                  <>
                    <div onClick={() => setProjectSubTab('phases')} className="cascade-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #06b6d4', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4' }}>
                        <Activity size={20} /> <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fases da Obra</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Concluídas: <strong style={{ color: '#fff' }}>{completedPhases} / {projectPhases.length || 20}</strong></p>
                    </div>
                    
                    <div onClick={() => setProjectSubTab('report')} className="cascade-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #10b981', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                        <FileText size={20} /> <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Relatório Técnico</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Emitir relatórios</p>
                    </div>

                    <div onClick={() => setProjectSubTab('schedule')} className="cascade-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #f59e0b', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                        <Calendar size={20} /> <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cronograma</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activePhase ? `Fase ${activePhase.phases?.phase_number}: ${activePhase.progress_percent}%` : 'Nenhuma fase'}
                      </p>
                    </div>

                    <div onClick={() => setProjectSubTab('history')} className="cascade-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #8b5cf6', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
                        <Clock size={20} /> <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Histórico & Logs</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Atualizado: <strong style={{ color: '#fff' }}>{lastLogDate}</strong></p>
                    </div>

                    <div onClick={() => setProjectSubTab('issues')} className="cascade-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #ef4444', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                        <AlertTriangle size={20} /> <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ocorrências</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Resolvidas: <strong style={{ color: '#fff' }}>{resolvedIssues} / {totalIssues}</strong></p>
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '24px', overflowX: 'auto' }} className="no-print">
              <button 
                onClick={() => setProjectSubTab('menu')} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <ArrowLeft size={16} /> Voltar ao Menu
              </button>
            </div>
          )}

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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button 
                            onClick={() => { setIssuePhaseId(phase.phases.id); setShowIssueModal(true); }}
                            title="Relatar Ocorrência nesta fase"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex' }}
                          >
                            <MessageCircle size={14} />
                          </button>
                          {phase.progress_percent === 100 && <CheckCircle size={16} />}
                        </div>
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

          {projectSubTab === 'issues' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                  Ocorrências e Pendências de Campo
                </h3>
                <button 
                  onClick={() => { setIssuePhaseId(null); setShowIssueModal(true); }} 
                  className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Nova Ocorrência
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {projectIssues.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma ocorrência registrada nesta obra.</p>
                ) : (
                  projectIssues
                    .filter(issue => userProfile?.role === 'technician' ? issue.status === 'Pendente' : true)
                    .map(issue => (
                    <div key={issue.id} style={{ background: 'rgba(255,255,255,0.02)', border: issue.status === 'Pendente' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(issue.created_at).toLocaleString()}</span>
                          {issue.phases && (
                            <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              Fase {issue.phases.phase_number}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: issue.status === 'Pendente' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: issue.status === 'Pendente' ? '#ef4444' : '#10b981' }}>
                          {issue.status}
                        </span>
                      </div>
                      
                      <p style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '12px' }}>{issue.texto_tecnico}</p>
                      
                      {issue.imagem_url && (
                        <div style={{ marginBottom: '12px' }}>
                          <a href={issue.imagem_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={issue.imagem_url} alt="Foto da Ocorrência" style={{ maxHeight: '120px', display: 'block' }} />
                          </a>
                        </div>
                      )}

                      {issue.status === 'Pendente' && userProfile?.role !== 'technician' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                          <input 
                            type="text" 
                            placeholder="Resposta / Resolução do problema..." 
                            value={resolveIssueText[issue.id] || ''} 
                            onChange={(e) => setResolveIssueText(prev => ({...prev, [issue.id]: e.target.value}))}
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }} 
                          />
                          <button onClick={() => handleResolveIssue(issue.id)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                            Resolver
                          </button>
                        </div>
                      )}

                      {issue.status === 'Resolvido' && issue.resposta_gestor && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(16,185,129,0.05)', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0' }}>
                            <strong style={{ color: '#10b981' }}>Resposta:</strong> {issue.resposta_gestor}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal de Nova Ocorrência */}
          {showIssueModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
              <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} style={{ color: '#ef4444' }} /> Relatar Ocorrência</h3>
                  <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Descreva o problema / pendência</label>
                    <textarea 
                      rows="3" 
                      value={issueText} 
                      onChange={e => setIssueText(e.target.value)} 
                      placeholder="Ex: Faltou material X, ferramenta Y quebrou..."
                      style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={14} /> Anexar Foto (Opcional)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setIssueFile(e.target.files[0])}
                      style={{ width: '100%', padding: '8px', marginTop: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.2)' }}
                    />
                  </div>

                  <button 
                    onClick={handleCreateIssue} 
                    disabled={uploadingIssue || (!issueText.trim() && !issueFile)} 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                  >
                    {uploadingIssue ? 'Enviando...' : 'Enviar Ocorrência'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {projectSubTab === 'report' && renderProjectReport()}
          {projectSubTab === 'schedule' && renderProjectSchedule()}
        </main>
      ) : (
        /* Standard Navigation Views */
        <main style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          
          {/* Main Navigation Menu (Dashboard) */}
          {activeTab === 'menu' ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', maxWidth: '1100px', margin: '24px auto', width: '100%' }}>
              {(() => {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const totalProjects = projects.length;
                const avgProductivity = projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + p.overall_progress_percent, 0) / projects.length) : 0;
                const endingThisMonth = projects.filter(p => {
                  if (!p.deadline_date) return false;
                  const d = new Date(p.deadline_date);
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                }).length;

                const handleOpenGoogleEarth = (e) => {
                  e.stopPropagation();
                  const projectsWithAddress = projects.filter(p => p.endereco);
                  if (projectsWithAddress.length === 0) {
                    showToast('Nenhuma obra com endereço cadastrado para exibir no mapa.', 'danger');
                    return;
                  }

                  let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>Mapa de Obras - ElevateSync</name>\n`;

                  projectsWithAddress.forEach(proj => {
                    kmlContent += `    <Placemark>\n      <name>${proj.project_name || 'Obra'}</name>\n      <description>Modelo: ${proj.elevator_model || '-'} | Empresa: ${proj.company_name || '-'}</description>\n      <address>${proj.endereco}</address>\n    </Placemark>\n`;
                  });

                  kmlContent += `  </Document>\n</kml>`;

                  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
                  const url = URL.createObjectURL(blob);
                  
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'obras_elevatesync.kml';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  showToast('Arquivo KML gerado! Abra-o no Google Earth.', 'info');
                  
                  setTimeout(() => {
                    window.open('https://earth.google.com/web/', '_blank');
                  }, 1500);
                };

                const cardStyle = { 
                  flex: '1 1 calc(33.333% - 20px)', 
                  minWidth: '280px', 
                  maxWidth: '340px',
                  padding: '24px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  backdropFilter: 'blur(8px)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                };
                
                const handleHover = e => {
                  e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                  const details = e.currentTarget.querySelector('.card-details');
                  if (details) {
                    details.style.maxHeight = '150px';
                    details.style.opacity = '1';
                    details.style.marginTop = '8px';
                  }
                };
                const handleLeave = e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                  const details = e.currentTarget.querySelector('.card-details');
                  if (details) {
                    details.style.maxHeight = '0';
                    details.style.opacity = '0';
                    details.style.marginTop = '0';
                  }
                };

                return (
                  <>
                    <div onClick={() => setActiveTab('projects')} style={{...cardStyle, borderTop: '4px solid #06b6d4'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🏗️ Elevadores em Montagem</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Total em andamento: <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{totalProjects}</strong></p>
                    </div>

                    <div onClick={() => setActiveTab('s-curve')} style={{...cardStyle, borderTop: '4px solid #8b5cf6'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📈 Curvas de Evolução</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Média de Produtividade: <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{avgProductivity}%</strong></p>
                      
                      <div className="card-details" style={{ maxHeight: 0, opacity: 0, overflow: 'hidden', transition: 'all 0.3s ease', fontSize: '0.75rem', color: '#a78bfa', marginTop: 0 }}>
                        <hr style={{ borderColor: 'rgba(139, 92, 246, 0.2)', margin: '4px 0 8px 0' }} />
                        <strong>Fórmula:</strong> (Σ % de Avanço) / (Total de Obras)<br/>
                        <strong>Comparação Ideal:</strong> <span style={{ color: '#fff' }}>100%</span> (Aderência total ao Cronograma)
                      </div>
                    </div>

                    <div onClick={() => setActiveTab('ranking')} style={{...cardStyle, borderTop: '4px solid #ef4444'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🎯 Previsões de Entrega</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Encerram neste mês: <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{endingThisMonth}</strong></p>
                    </div>

                    <div onClick={() => setActiveTab('teams')} style={{...cardStyle, borderTop: '4px solid #10b981'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>👥 Equipes Fixas & Técnicos</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Gestão de equipe e perfis</p>
                    </div>

                    <div onClick={() => setActiveTab('companies')} style={{...cardStyle, borderTop: '4px solid #f59e0b'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🏢 Empresas Contratadas</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Gerenciar parceiros comerciais</p>
                    </div>

                    <div onClick={() => setActiveTab('phases')} style={{...cardStyle, borderTop: '4px solid #3b82f6'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📋 Checklists & Fases</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Configuração das etapas da obra</p>
                    </div>

                    <div onClick={() => setActiveTab('history')} style={{...cardStyle, borderTop: '4px solid #a855f7'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🕒 Histórico & Auditoria</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Logs completos do sistema</p>
                    </div>

                    <div onClick={handleOpenGoogleEarth} style={{...cardStyle, borderTop: '4px solid #f43f5e'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🌍 Mapa de Obras</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Visualizar obras no Google Earth</p>
                    </div>

                    <div onClick={() => setActiveTab('client-links')} style={{...cardStyle, borderTop: '4px solid #14b8a6'}} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#14b8a6' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📱 Informações Cliente</h3>
                      </div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Links para visualização dos clientes</p>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '24px', overflowX: 'auto', justifyContent: 'flex-start' }} className="no-print">
              <button 
                onClick={() => setActiveTab('menu')} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <ArrowLeft size={16} /> Voltar ao Menu Principal
              </button>
            </div>
          )}

          {/* Client Links view */}
          {activeTab === 'client-links' && (
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', margin: 0 }}>📱 Links para Clientes</h2>
              </div>
              <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Obra</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Senha de Acesso</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(proj => {
                      const link = window.location.origin + window.location.pathname + '?view_report=' + proj.project_id;
                      return (
                        <tr key={proj.project_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '16px 8px', color: '#e2e8f0' }}>
                            <strong>{proj.project_name}</strong><br/>
                            <small style={{ color: '#94a3b8' }}>{proj.elevator_model}</small>
                          </td>
                          <td style={{ padding: '16px 8px', color: '#e2e8f0' }}>
                            <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', letterSpacing: '2px', fontWeight: 'bold' }}>
                              {proj.senha_cliente || 'Sem senha'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`Acompanhe o andamento da sua obra: ${link} \\nSenha: ${proj.senha_cliente || 'N/A'}`);
                                  showToast('Link e senha copiados!', 'success');
                                }}
                                className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                Copiar Link
                              </button>
                              <button 
                                onClick={() => window.open(link, '_blank')}
                                className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                Visualizar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {projects.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>Nenhuma obra cadastrada.</p>
                )}
              </div>
            </div>
          )}

          {/* Projects view */}
          {activeTab === 'projects' && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%',
              }}
              className="animate-fade-in"
            >
              {projects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', width: '100%', maxWidth: '520px' }}>
                  <AlertTriangle style={{ color: '#f59e0b', marginBottom: '12px' }} size={32} />
                  <h4 style={{ color: '#ffffff' }}>Nenhuma obra comercial cadastrada</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px' }}>Use o botão <strong style={{ color: '#06b6d4' }}>🛗 Assistente IA</strong> ou o botão <strong style={{ color: '#06b6d4' }}>+ Novo Cadastro</strong> nos cantos inferiores para começar.</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div key={proj.project_id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', border: proj.is_delayed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)', width: '340px', flexShrink: 0, flexGrow: 0 }}>
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

                      {proj.tipo_elevador && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <Settings size={14} /> Tipo: {proj.tipo_elevador.charAt(0).toUpperCase() + proj.tipo_elevador.slice(1)}
                        </p>
                      )}
                      {(proj.numero_paradas || proj.capacidade_pessoas) && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <Activity size={14} /> Paradas / Cap.: {proj.numero_paradas || '-'} {proj.numero_paradas ? 'paradas' : ''} / {proj.capacidade_pessoas || '-'} pes.
                        </p>
                      )}
                      {proj.endereco && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <Flag size={14} /> Endereço: 
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(proj.endereco)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ color: '#06b6d4', textDecoration: 'none' }}
                          >
                            Abrir Maps
                          </a>
                        </p>
                      )}
                      
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
                        onClick={() => { setActiveProject(proj); setProjectSubTab('menu'); fetchProjectPhases(proj.project_id); fetchProjectAuditLogs(proj.project_id); fetchProjectIssues(proj.project_id); }} 
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
              
              {/* Cascade Selection Breadcrumbs */}
              {(selectedCascadeTeamId || selectedCascadeCompanyId) && (
                <div 
                  className="glass-panel" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: 'rgba(6, 182, 212, 0.03)',
                    border: '1px solid rgba(6, 182, 212, 0.15)',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    animation: 'fadeIn 0.3s ease-out forwards'
                  }}
                >
                  <span style={{ color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> Caminho de Seleção:
                  </span>
                  <span>Equipes</span>
                  {selectedCascadeTeamId && (
                    <>
                      <ChevronRight size={14} style={{ opacity: 0.5 }} />
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>
                        {teams.find(t => t.id === selectedCascadeTeamId)?.name}
                      </span>
                    </>
                  )}
                  {selectedCascadeCompanyId && (
                    <>
                      <ChevronRight size={14} style={{ opacity: 0.5 }} />
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>
                        {companies.find(c => c.id === selectedCascadeCompanyId)?.name}
                      </span>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedCascadeTeamId('');
                      setSelectedCascadeCompanyId('');
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171'
                    }}
                  >
                    Limpar Filtro
                  </button>
                </div>
              )}

              {/* SECTION 1: EQUIPES CAROUSEL */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} style={{ color: '#06b6d4' }} />
                    Equipes Fixas
                  </h3>
                  {teams.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => scrollTeams('left')} 
                        className="btn btn-secondary" 
                        style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '50%' }}
                        title="Deslizar para esquerda"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => scrollTeams('right')} 
                        className="btn btn-secondary" 
                        style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '50%' }}
                        title="Deslizar para direita"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div 
                  ref={teamCarouselRef}
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '16px',
                    padding: '8px 4px 16px',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x mandatory',
                    justifyContent: 'safe center'
                  }}
                  className="no-scrollbar"
                >
                  {teams.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', width: '100%' }}>Nenhuma equipe cadastrada.</p>
                  ) : (
                    teams.map(t => {
                      const linkedCompsCount = companies.filter(c => c.fixed_team_id === t.id).length;
                      const isSelected = selectedCascadeTeamId === t.id;
                      return (
                        <div 
                          key={t.id} 
                          data-team-id={t.id}
                          onClick={() => {
                            const newTeamId = isSelected ? '' : t.id;
                            setSelectedCascadeTeamId(newTeamId);
                            if (newTeamId) {
                              scrollToTeam(t.id);
                              const linkedComps = companies.filter(c => c.fixed_team_id === newTeamId);
                              if (linkedComps.length > 0) {
                                setSelectedCascadeCompanyId(linkedComps[0].id);
                                setTimeout(() => {
                                  if (companyCarouselRef.current) {
                                    companyCarouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
                                  }
                                  centerElementInViewport('cascade-companies-section');
                                }, 150);
                              } else {
                                setSelectedCascadeCompanyId('');
                                setTimeout(() => {
                                  centerElementInViewport('cascade-companies-section');
                                }, 150);
                              }
                            } else {
                              setSelectedCascadeCompanyId('');
                            }
                          }}
                          className={`glass-panel cascade-card ${isSelected ? 'selected' : selectedCascadeTeamId ? 'inactive' : ''}`}
                          style={{ 
                            flex: '0 0 300px',
                            scrollSnapAlign: 'start',
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between', 
                            gap: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t.name}</h4>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                              {linkedCompsCount} {linkedCompsCount === 1 ? 'Empresa vinculada' : 'Empresas vinculadas'}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#06b6d4', marginTop: '2px', fontWeight: 500 }}>
                              Gestor: {t.profiles?.full_name || 'Nenhum'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEdit('team', t); }} 
                              className="btn btn-secondary" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                            >
                              Editar
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }} 
                              className="btn btn-danger" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION 2: LINKED COMPANIES */}
              <div id="cascade-companies-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                {!selectedCascadeTeamId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <Building size={32} style={{ color: '#94a3b8', marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecione uma equipe fixa acima para ver as empresas vinculadas.</p>
                  </div>
                ) : (
                  (() => {
                    const selectedTeam = teams.find(t => t.id === selectedCascadeTeamId);
                    const linkedCompanies = companies.filter(c => c.fixed_team_id === selectedCascadeTeamId);
                    return (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building size={20} style={{ color: '#06b6d4' }} />
                            Empresas Vinculadas a <span style={{ color: '#06b6d4' }}>{selectedTeam?.name}</span>
                          </h3>
                          {linkedCompanies.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => scrollCompanies('left')} 
                                className="btn btn-secondary" 
                                style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '50%' }}
                                title="Deslizar para esquerda"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button 
                                onClick={() => scrollCompanies('right')} 
                                className="btn btn-secondary" 
                                style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '50%' }}
                                title="Deslizar para direita"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {linkedCompanies.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center' }}>
                            Nenhuma empresa parceira vinculada a esta equipe fixa ainda. Vincule-a editando a empresa na aba de Empresas.
                          </p>
                        ) : (
                          <div 
                            ref={companyCarouselRef}
                            onScroll={handleCompanyScroll}
                            style={{
                              display: 'flex',
                              overflowX: 'auto',
                              gap: '16px',
                              padding: '8px 4px 16px',
                              scrollBehavior: 'smooth',
                              WebkitOverflowScrolling: 'touch',
                              scrollSnapType: 'x mandatory',
                              justifyContent: 'safe center',
                              position: 'relative'
                            }}
                            className="no-scrollbar"
                          >
                            {linkedCompanies.map(c => {
                              const linkedTechsCount = technicians.filter(tech => tech.company_id === c.id).length;
                              const isSelected = selectedCascadeCompanyId === c.id;
                              return (
                                <div 
                                  key={c.id}
                                  data-company-id={c.id}
                                  onClick={() => {
                                    setSelectedCascadeCompanyId(c.id);
                                    scrollToCompany(c.id);
                                    setTimeout(() => {
                                      centerElementInViewport('cascade-technicians-section');
                                    }, 150);
                                  }}
                                  className={`glass-panel cascade-card ${isSelected ? 'selected' : selectedCascadeCompanyId ? 'inactive' : ''}`}
                                  style={{ 
                                    flex: '0 0 300px',
                                    scrollSnapAlign: 'center',
                                    padding: '20px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'space-between', 
                                    gap: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <Building style={{ color: '#06b6d4' }} size={20} />
                                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{c.name}</h4>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>CNPJ: {c.cnpj || 'Não informado'}</p>
                                    <p style={{ fontSize: '0.8rem', color: '#06b6d4', marginTop: '4px', fontWeight: 500 }}>
                                      {linkedTechsCount} {linkedTechsCount === 1 ? 'técnico cadastrado' : 'técnicos cadastrados'}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); startEdit('company', c); }} 
                                      className="btn btn-secondary" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                                    >
                                      Editar
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCompany(c.id); }} 
                                      className="btn btn-danger" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* SECTION 3: LINKED TECHNICIANS */}
              <div id="cascade-technicians-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                {!selectedCascadeCompanyId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <UserCheck size={32} style={{ color: '#94a3b8', marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecione uma empresa contratada acima para ver os técnicos vinculados.</p>
                  </div>
                ) : (
                  (() => {
                    const selectedCompany = companies.find(c => c.id === selectedCascadeCompanyId);
                    const linkedTechs = technicians.filter(tech => tech.company_id === selectedCascadeCompanyId);
                    return (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                          <ChevronRight size={18} style={{ color: '#06b6d4' }} />
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, textAlign: 'center' }}>
                            Técnicos de <span style={{ color: '#06b6d4' }}>{selectedCompany?.name}</span>
                          </h3>
                        </div>
                        
                        {linkedTechs.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center' }}>
                            Nenhum técnico cadastrado para esta empresa contratada ainda.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
                            {linkedTechs.map(tech => (
                              <div 
                                key={tech.id} 
                                className="glass-panel cascade-card technician-card"
                                style={{ 
                                  width: '300px',
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '12px', 
                                  padding: '20px' 
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
                                    <HardHat size={18} />
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>{tech.full_name}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>Telegram Chat ID: <code>{tech.telegram_chat_id}</code></p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
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
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
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
                        {(() => {
                          const fixedTeam = teams.find(t => t.id === c.fixed_team_id);
                          return (
                            <p style={{ fontSize: '0.80rem', color: '#06b6d4', marginTop: '4px', fontWeight: 500 }}>
                              Equipe Fixa: {fixedTeam ? fixedTeam.name : 'Nenhuma'}
                            </p>
                          );
                        })()}
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
            <div style={{ width: '100%', maxWidth: '740px' }}>
              <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <BarChart2 size={20} style={{ color: '#06b6d4' }} />
                      Curvas de Evolução (Medição Semanal)
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
              <div style={{ width: '100%', maxWidth: '860px' }}>
              <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                  🎯 Previsões de Entrega
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }} className="no-print">
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Elevadores ordenados por volume de pendências, fases incompletas e previsão de conclusão.
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                  {sortedRankings.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>Nenhuma pendência encontrada para o filtro selecionado!</p>
                  ) : (
                    sortedRankings.map((rank, idx) => {
                      const proj = projects.find(p => p.project_id === rank.project_id);
                      const linearEst = proj ? getProjectLinearEstimate(proj) : null;
                      const aiEst = projectForecast[rank.project_id];

                      return (
                        <div 
                          key={rank.project_id} 
                          className="glass-panel"
                          style={{ 
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px', 
                            border: (linearEst && linearEst.isDelayed) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                            width: '340px', 
                            flexShrink: 0, 
                            flexGrow: 0 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>{idx + 1}</span>
                              <span style={{ wordBreak: 'break-word' }}>{rank.project_name}</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', textAlign: 'right' }}>
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>{rank.not_started_phases_count} Não Iniciadas</span>
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{rank.in_progress_phases_count} Em Progresso</span>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '0.8rem', background: '#020617', padding: '12px', borderRadius: '8px', color: '#94a3b8', flex: 1, overflowY: 'auto', maxHeight: expandedPhases[rank.project_id] ? '300px' : '150px', transition: 'max-height 0.3s' }}>
                            <strong style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: '#e2e8f0' }}>
                              Fases Pendentes:
                              {rank.pending_phases_list && rank.pending_phases_list.split(', ').length > 2 && (
                                <button 
                                  onClick={() => setExpandedPhases(prev => ({ ...prev, [rank.project_id]: !prev[rank.project_id] }))}
                                  style={{ background: 'rgba(6,182,212,0.1)', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}
                                >
                                  {expandedPhases[rank.project_id] ? 'Recolher' : 'Expandir'}
                                </button>
                              )}
                            </strong>
                            {rank.pending_phases_list ? (
                              <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {rank.pending_phases_list.split(', ').slice(0, expandedPhases[rank.project_id] ? undefined : 2).map((phase, i) => (
                                  <li key={i}>{phase}</li>
                                ))}
                                {!expandedPhases[rank.project_id] && rank.pending_phases_list.split(', ').length > 2 && (
                                  <li style={{ color: '#94a3b8', listStyle: 'none', marginLeft: '-16px', fontSize: '0.75rem', marginTop: '4px', fontStyle: 'italic' }}>
                                    + {rank.pending_phases_list.split(', ').length - 2} outras fases ocultas...
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <span>Nenhuma</span>
                            )}
                          </div>

                          {/* Completion Estimates Panel inside the ranking card */}
                          {proj && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                              <div>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Previsão Linear (Automática)</span>
                                <strong style={{ fontSize: '0.8rem', color: linearEst.isDelayed ? '#ef4444' : '#10b981' }}>
                                  {linearEst.text}
                                </strong>
                              </div>
                              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Brain size={12} style={{ color: '#06b6d4' }} />
                                  Previsão Refinada (IA Gemini)
                                  {aiEst && (
                                    <button
                                      onClick={() => setExpandedAiEst({ projectName: rank.project_name, text: aiEst })}
                                      title="Expandir leitura"
                                      style={{
                                        marginLeft: 'auto',
                                        background: 'rgba(6,182,212,0.1)',
                                        border: '1px solid rgba(6,182,212,0.25)',
                                        borderRadius: '4px',
                                        color: '#06b6d4',
                                        cursor: 'pointer',
                                        padding: '2px 5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.65rem',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.22)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                      <Maximize2 size={10} /> Expandir
                                    </button>
                                  )}
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

              {(() => {
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
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={chatLoading}
                      title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '8px',
                        background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                        color: isRecording ? '#ef4444' : '#e2e8f0',
                        border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {isRecording ? <Square size={16} /> : <Mic size={16} />}
                    </button>
                    <button
                      onClick={() => handleSendChatMessage()}
                      disabled={chatLoading || (!chatInput.trim() && !isRecording)}
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
                  Equipe Fixa
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
                {userProfile?.role === 'master' && (
                  <button 
                    onClick={() => setRegSubTab('manager')} 
                    style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: regSubTab === 'manager' ? '#06b6d4' : '#94a3b8', borderBottom: regSubTab === 'manager' ? '2px solid #06b6d4' : 'none' }}
                  >
                    Novo Gestor de Obra
                  </button>
                )}
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
                    <label>Capacidade de Pessoas</label>
                    <input type="number" value={newProjCapacity} onChange={e => setNewProjCapacity(e.target.value)} placeholder="Ex: 8" />
                  </div>
                  <div>
                    <label>Número de Paradas</label>
                    <input type="number" value={newProjStops} onChange={e => setNewProjStops(e.target.value)} placeholder="Ex: 10" />
                  </div>
                  <div>
                    <label>Tipo de Elevador</label>
                    <select value={newProjType} onChange={e => setNewProjType(e.target.value)}>
                      <option value="passageiro">Passageiro</option>
                      <option value="carga">Carga</option>
                      <option value="maca">Maca</option>
                    </select>
                  </div>
                  <div>
                    <label>Endereço</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={newProjAddress} onChange={e => setNewProjAddress(e.target.value)} placeholder="Ex: Rua Vergueiro, 1000 - SP" style={{ flex: 1 }} />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (newProjAddress) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newProjAddress)}`, '_blank');
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          borderRadius: '8px',
                          padding: '0 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                        title="Abrir no Google Maps"
                      >
                        📍 Maps
                      </button>
                    </div>
                  </div>
                  <div>
                    <label>Senha do Cliente (6 dígitos)</label>
                    <input type="text" value={newProjClientPassword} onChange={e => setNewProjClientPassword(e.target.value.replace(/\\D/g, '').slice(0, 6))} placeholder="Ex: 123456" maxLength={6} minLength={6} style={{ width: '100%' }} />
                    <small style={{ color: '#94a3b8' }}>Será exigida quando o cliente acessar o link público da obra.</small>
                  </div>
                  <div>
                    <label>Empresa Contratada Proprietária</label>
                    <select 
                      value={newProjCompanyId} 
                      onChange={e => {
                        const compId = e.target.value;
                        setNewProjCompanyId(compId);
                        const comp = companies.find(c => c.id === compId);
                        if (comp && comp.fixed_team_id) {
                          setNewProjTeamId(comp.fixed_team_id);
                          const team = teams.find(t => t.id === comp.fixed_team_id);
                          if (team && team.assigned_manager_id) {
                            setNewProjManagerId(team.assigned_manager_id);
                          }
                        } else {
                          setNewProjTeamId('');
                        }
                      }} 
                      required
                    >
                      <option value="">-- Selecione a Empresa Contratada --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Equipe Fixa Responsável</label>
                    <select 
                      value={newProjTeamId} 
                      onChange={e => {
                        const teamId = e.target.value;
                        setNewProjTeamId(teamId);
                        const team = teams.find(t => t.id === teamId);
                        if (team && team.assigned_manager_id) {
                          setNewProjManagerId(team.assigned_manager_id);
                        }
                      }}
                    >
                      <option value="">-- Selecione a Equipe Fixa --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Gestor Técnico Responsável (Obra)</label>
                    <select 
                      value={newProjManagerId} 
                      onChange={e => setNewProjManagerId(e.target.value)}
                      disabled={userProfile?.role === 'manager'}
                    >
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
                  <h4 style={{ marginBottom: '8px' }}>Cadastrar Equipe Fixa</h4>
                  <div>
                    <label>Nome da Equipe Fixa</label>
                    <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="Ex: Equipe Leste - Montadores" />
                  </div>
                  <div>
                    <label>Gestor Responsável Vinculado (Opcional)</label>
                    <select value={newTeamManagerId} onChange={e => setNewTeamManagerId(e.target.value)}>
                      <option value="">-- Selecione o Gestor --</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Criar Equipe Fixa</button>
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
                  <div>
                    <label>Equipe Fixa Vinculada (Opcional)</label>
                    <select value={newCompanyFixedTeamId} onChange={e => setNewCompanyFixedTeamId(e.target.value)}>
                      <option value="">-- Nenhuma Equipe Fixa --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar Empresa Contratada</button>
                </form>
              )}

              {regSubTab === 'manager' && userProfile?.role === 'master' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <form onSubmit={handleCreateManager} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <h4 style={{ marginBottom: '8px' }}>Cadastrar Novo Gestor de Obra</h4>
                    <div>
                      <label>Nome Completo do Gestor</label>
                      <input type="text" value={newManagerName} onChange={e => setNewManagerName(e.target.value)} required placeholder="Ex: Carlos Eduardo" />
                    </div>
                    <div>
                      <label>E-mail do Gestor</label>
                      <input type="email" value={newManagerEmail} onChange={e => setNewManagerEmail(e.target.value)} required placeholder="Ex: carlos@empresa.com" />
                    </div>
                    <div>
                      <label>Senha Provisória</label>
                      <input type="password" value={newManagerPassword} onChange={e => setNewManagerPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div>
                      <label>Classificação de Acesso</label>
                      <select value={newManagerAccessLevel} onChange={e => setNewManagerAccessLevel(e.target.value)} required>
                        <option value="restricted">Restrito (Acesso apenas a obras vinculadas a ele)</option>
                        <option value="unrestricted">Irrestrito (Acesso a todas as obras do sistema)</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar Gestor</button>
                  </form>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                    <h4 style={{ marginBottom: '16px' }}>Gestores de Obra Cadastrados</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                            <th style={{ padding: '12px 8px' }}>Nome Completo</th>
                            <th style={{ padding: '12px 8px' }}>E-mail</th>
                            <th style={{ padding: '12px 8px' }}>Nível de Acesso</th>
                            <th style={{ padding: '12px 8px' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managers.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ padding: '16px 8px', color: '#94a3b8', textAlign: 'center' }}>Nenhum gestor cadastrado.</td>
                            </tr>
                          ) : (
                            managers.map(mgr => (
                              <tr key={mgr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{mgr.full_name}</td>
                                <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>{mgr.email || '—'}</td>
                                <td style={{ padding: '12px 8px' }}>
                                  <span style={{ 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                    background: mgr.access_level === 'unrestricted' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: mgr.access_level === 'unrestricted' ? '#10b981' : '#f59e0b'
                                  }}>
                                    {mgr.access_level === 'unrestricted' ? 'Irrestrito' : 'Restrito'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => handleToggleManagerAccess(mgr)} 
                                    className="btn"
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', cursor: 'pointer' }}
                                  >
                                    Alternar Acesso
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteManager(mgr)} 
                                    className="btn"
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                                  >
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      )}
      {renderEditModal()}
      {renderReportModal()}

      {/* Modal: Previsão IA Expandida */}
      {expandedAiEst && (
        <div
          onClick={() => setExpandedAiEst(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={20} style={{ color: '#06b6d4' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Previsão Refinada (IA Gemini)</p>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{expandedAiEst.projectName}</h3>
                </div>
              </div>
              <button
                onClick={() => setExpandedAiEst(null)}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '8px',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                title="Fechar"
              >
                <Minimize2 size={13} /> Fechar
              </button>
            </div>

            {/* Content */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              fontSize: '0.92rem',
              lineHeight: '1.7',
              color: '#e2e8f0',
              padding: '4px 2px',
            }}>
              {renderMarkdown(expandedAiEst.text)}
            </div>
          </div>
        </div>
      )}



      {/* ===== AI FLOATING ASSISTANT BUTTON ===== */}
      {session && (
        <div
          id="ai-float-btn"
          onMouseEnter={() => setAiFloatHover(true)}
          onMouseLeave={() => setAiFloatHover(false)}
          onClick={() => {
            setActiveProject(null);
            setActiveTab('ai-chat');
          }}
          className="no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '0px',
            cursor: 'pointer',
          }}
        >
          {/* Tooltip de apresentação (hover) */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 14px)',
              left: '0',
              width: '260px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(15,23,42,0.97) 100%)',
              border: '1px solid rgba(6,182,212,0.35)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px rgba(6,182,212,0.15)',
              opacity: aiFloatHover ? 1 : 0,
              transform: aiFloatHover ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
              transition: 'opacity 0.3s cubic-bezier(0.34,1.56,0.64,1), transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              pointerEvents: 'none',
            }}
          >
            {/* Seta do tooltip */}
            <div style={{
              position: 'absolute',
              bottom: '-7px',
              left: '28px',
              width: '14px',
              height: '14px',
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(6,182,212,0.35)',
              borderTop: 'none',
              borderLeft: 'none',
              transform: 'rotate(45deg)',
              borderRadius: '0 0 3px 0',
            }} />
            
            {/* Badge IA */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(6,182,212,0.15)',
              border: '1px solid rgba(6,182,212,0.3)',
              borderRadius: '20px',
              padding: '2px 8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#06b6d4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>IA Online</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'aiPulse 2s ease-in-out infinite', display: 'inline-block' }} />
            </div>

            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', margin: '0 0 6px', lineHeight: 1.4 }}>
              Sou seu Assistente Inteligente! 🛗
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
              Posso ajudar com <strong style={{ color: '#22d3ee' }}>relatório técnico</strong>, <strong style={{ color: '#22d3ee' }}>status de obra</strong> ou qualquer dúvida — é só digitar!
            </p>
          </div>

          {/* Botão principal */}
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: aiFloatHover
                ? 'linear-gradient(135deg, #0e7490 0%, #06b6d4 60%, #22d3ee 100%)'
                : 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #06b6d4 100%)',
              border: aiFloatHover ? '2px solid rgba(6,182,212,0.9)' : '2px solid rgba(6,182,212,0.4)',
              boxShadow: aiFloatHover
                ? '0 0 0 6px rgba(6,182,212,0.15), 0 0 30px rgba(6,182,212,0.5), 0 8px 24px rgba(0,0,0,0.5)'
                : '0 0 0 4px rgba(6,182,212,0.08), 0 0 16px rgba(6,182,212,0.25), 0 6px 18px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              transform: aiFloatHover ? 'scale(1.12) translateY(-3px)' : 'scale(1) translateY(0)',
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              position: 'relative',
              overflow: 'visible',
              animation: aiFloatHover ? 'none' : 'aiFloat 3s ease-in-out infinite',
            }}
          >
            {/* Glow ring animado */}
            <div style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              border: '1.5px solid rgba(6,182,212,0.3)',
              animation: 'aiRing 2.5s ease-in-out infinite',
              opacity: aiFloatHover ? 0 : 1,
              transition: 'opacity 0.3s',
            }} />

            {/* Emoji elevador */}
            <span style={{
              fontSize: aiFloatHover ? '1.7rem' : '1.5rem',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              transform: aiFloatHover ? 'rotate(-5deg)' : 'rotate(0deg)',
            }}>🛗</span>

            {/* Indicador AI */}
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: '2px solid #090d16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.55rem',
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 0 8px rgba(16,185,129,0.6)',
              animation: 'aiPulse 2s ease-in-out infinite',
            }}>IA</div>
          </div>

          {/* Label lateral */}
          <div style={{
            marginLeft: aiFloatHover ? '10px' : '0px',
            maxWidth: aiFloatHover ? '140px' : '0px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: aiFloatHover ? 1 : 0,
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.25)',
              backdropFilter: 'blur(12px)',
              borderRadius: '8px',
              padding: '6px 12px',
            }}>
            </div>
          </div>
        </div>
      )}

      {/* Global Issues Modal */}
      {showGlobalIssuesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowGlobalIssuesModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, color: '#ef4444' }}>
              <AlertTriangle size={24} /> Ocorrências Pendentes ({globalIssues.length})
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>Estas são todas as ocorrências reportadas nas obras que ainda não foram marcadas como resolvidas.</p>
            
            {globalIssues.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={40} style={{ margin: '0 auto 10px', display: 'block' }} />
                Nenhuma ocorrência pendente no momento. Bom trabalho!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {globalIssues.map(issue => {
                  const proj = projects.find(p => p.project_id === issue.obra_id) || {};
                  return (
                    <div key={issue.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(239, 68, 68, 0.2)', borderLeft: '4px solid #ef4444', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '1rem' }}>Obra: {proj.project_name || 'Desconhecida'}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                            {format(new Date(issue.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            setShowGlobalIssuesModal(false);
                            const foundProj = projects.find(p => p.project_id === issue.obra_id);
                            if (foundProj) {
                              setActiveProject(foundProj);
                              setProjectSubTab('issues');
                              fetchProjectPhases(foundProj.project_id);
                              fetchProjectAuditLogs(foundProj.project_id);
                              fetchProjectIssues(foundProj.project_id);
                            }
                          }}
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Ver na Obra <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {issue.texto_tecnico}
                      </div>
                      {issue.imagem_url && (
                        <div style={{ marginTop: '10px' }}>
                          <a href={issue.imagem_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#06b6d4', textDecoration: 'none', background: 'rgba(6, 182, 212, 0.1)', padding: '4px 10px', borderRadius: '4px' }}>
                            <ImageIcon size={14} /> Ver Imagem Anexada
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Confirmação Master */}
      {showMasterDeleteConfirm && masterToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', width: '90%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }}>
            <button onClick={() => setShowMasterDeleteConfirm(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={24} /> Atenção Crítica
            </h3>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Você está prestes a excluir o gestor <strong>{masterToDelete.full_name}</strong> que possui nível <strong style={{ color: '#ef4444' }}>MASTER</strong>.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Esta é uma ação destrutiva irreversível. Um e-mail de alerta será enviado aos outros administradores notificando essa tentativa de exclusão.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => setShowMasterDeleteConfirm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#f8fafc' }}>
                Cancelar
              </button>
              <button className="btn" onClick={handleConfirmMasterDeleteStage1} style={{ background: '#ef4444', border: '1px solid #ef4444', color: '#fff', fontWeight: 'bold' }}>
                Sim, Enviar Alerta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirmação com PIN Aleatório */}
      {showMasterDeletePin && masterToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', width: '90%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }}>
            <button onClick={() => setShowMasterDeletePin(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={24} /> Confirmação Final
            </h3>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '8px', lineHeight: '1.5' }}>
              O e-mail de alerta foi disparado. Para confirmar a exclusão de <strong>{masterToDelete.full_name}</strong>, digite o código de segurança abaixo:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', border: '1px dashed #ef4444' }}>
              <span style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '4px', color: '#ef4444' }}>
                {masterDeleteGeneratedPin}
              </span>
            </div>
            <input
              type="text"
              value={masterDeleteInputPin}
              onChange={(e) => setMasterDeleteInputPin(e.target.value)}
              placeholder="Digite o PIN de 4 dígitos"
              style={{ width: '100%', marginBottom: '24px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
              maxLength={4}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => setShowMasterDeletePin(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#f8fafc' }}>
                Cancelar Exclusão
              </button>
              <button 
                className="btn" 
                onClick={handleConfirmMasterDeleteStage2} 
                disabled={masterDeleteInputPin !== masterDeleteGeneratedPin}
                style={{ background: masterDeleteInputPin === masterDeleteGeneratedPin ? '#ef4444' : 'rgba(239,68,68,0.3)', border: '1px solid transparent', color: '#fff', fontWeight: 'bold', cursor: masterDeleteInputPin === masterDeleteGeneratedPin ? 'pointer' : 'not-allowed' }}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
