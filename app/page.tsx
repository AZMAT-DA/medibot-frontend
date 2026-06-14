"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, User, Activity, Calendar, Clock,
  CheckCircle2, Send, ArrowLeft,
  Users, Stethoscope, ClipboardList, Shield,
  RefreshCw, Loader2, Wifi, WifiOff
} from 'lucide-react';

// ─── BACKEND URL ──────────────────────────────────────────────────────────────
const API = 'https://azmatmehmood-medibot-backend.hf.space';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Message  { text: string; sender: 'user' | 'bot'; time: string }
interface Doctor   { id: number; name: string; specialty: string; available: boolean; slots: string[] }
interface Nurse    { id: number; name: string; ward: string; shift: string; on_duty: boolean }
interface Appt     { id: number; patient: string; doctor: string; dept: string; time: string; status: string }
interface Overview { total_appointments: number; doctors_on_duty: number; nurses_on_duty: number; bed_occupancy_percent: number }
interface Stats    { total: number; completed: number; waiting: number; scheduled: number; in_progress: number }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    in_progress: 'bg-amber-500/15  text-amber-400  border-amber-500/30',
    waiting:     'bg-blue-500/15   text-blue-400   border-blue-500/30',
    scheduled:   'bg-slate-700     text-slate-300  border-slate-600',
    cancelled:   'bg-rose-500/15   text-rose-400   border-rose-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${styles[status] ?? styles.scheduled}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  type Role = 'patient' | 'doctor' | 'nurse' | 'admin';
  const [role, setRole]           = useState<Role | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null); // null=checking

  // ── Chat ──
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Data ──
  const [doctors,     setDoctors]     = useState<Doctor[]>([]);
  const [nurses,      setNurses]      = useState<Nurse[]>([]);
  const [appts,       setAppts]       = useState<Appt[]>([]);
  const [overview,    setOverview]    = useState<Overview | null>(null);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Booking ──
  const [selDoctor,    setSelDoctor]    = useState('');
  const [selDate,      setSelDate]      = useState('');
  const [selTime,      setSelTime]      = useState('');
  const [patName,      setPatName]      = useState('');
  const [patPhone,     setPatPhone]     = useState('');
  const [reason,       setReason]       = useState('');
  const [bookOk,       setBookOk]       = useState(false);
  const [bookLoading,  setBookLoading]  = useState(false);
  const [confirmId,    setConfirmId]    = useState('');

  // ── Toast ──
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // ─── Scroll chat ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // ─── Wake up backend on page load ────────────────────────────────────────
  useEffect(() => {
    wakeUpBackend();
  }, []);

  async function wakeUpBackend() {
    setBackendOk(null);
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        setBackendOk(true);
      } else {
        setBackendOk(false);
      }
    } catch {
      // Backend might be sleeping — try once more after 5 seconds
      setTimeout(async () => {
        try {
          const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(20000) });
          setBackendOk(res.ok);
        } catch {
          setBackendOk(false);
        }
      }, 5000);
    }
  }

  // ─── Load all data when role selected ────────────────────────────────────
  useEffect(() => {
    if (!role) return;

    const greetings: Record<Role, string> = {
      patient: "Welcome to MediBot! 👋 I can help you find available doctors, book appointments, or answer health queries.",
      doctor:  "Hello Doctor! 👨‍⚕️ Your appointment queue and patient data are live. How can I assist?",
      nurse:   "Hi Nurse! 💉 Your shift and ward assignments are loaded. What do you need help with?",
      admin:   "Good day, Admin! 📊 Full hospital overview is live. What would you like to manage?",
    };
    setMessages([{ text: greetings[role], sender: 'bot', time: nowTime() }]);
    loadData();
  }, [role]);

  async function loadData() {
    setDataLoading(true);
    try {
      // Ping backend first to make sure it's awake
      await fetch(`${API}/health`).catch(() => {});

      const [d, n, a, o, s] = await Promise.all([
        fetch(`${API}/doctors`).then(r => r.json()).catch(() => ({ doctors: [] })),
        fetch(`${API}/nurses`).then(r => r.json()).catch(() => ({ nurses: [] })),
        fetch(`${API}/appointments`).then(r => r.json()).catch(() => ({ appointments: [] })),
        fetch(`${API}/admin/overview`).then(r => r.json()).catch(() => null),
        fetch(`${API}/appointments/stats`).then(r => r.json()).catch(() => null),
      ]);

      setDoctors(d.doctors   ?? []);
      setNurses(n.nurses     ?? []);
      setAppts(a.appointments ?? []);
      setOverview(o);
      setStats(s);
    } catch {
      showToast('⚠️ Could not load data. Click 🔄 to retry.');
    } finally {
      setDataLoading(false);
    }
  }

  // ─── Send chat message ────────────────────────────────────────────────────
  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || chatLoading) return;
    setInput('');

    const userMsg: Message = { text, sender: 'user', time: nowTime() };
    setMessages(p => [...p, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, role }),
      });
      const data = await res.json();
      setMessages(p => [...p, { text: data.reply, sender: 'bot', time: nowTime() }]);
    } catch {
      setMessages(p => [...p, {
        text: '⚠️ Could not reach the server. Please check your connection and try again.',
        sender: 'bot', time: nowTime()
      }]);
    }
    setChatLoading(false);
  }

  // ─── Book appointment ─────────────────────────────────────────────────────
  async function bookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selDoctor || !selDate || !selTime || !patName) return;
    setBookLoading(true);
    try {
      const res = await fetch(`${API}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patName,
          cnic: 'N/A',
          department: doctors.find(d => d.name === selDoctor)?.specialty ?? 'General',
          doctor: selDoctor,
          date: selDate,
          time: selTime,
          reason: reason || 'General consultation',
          phone: patPhone || 'N/A',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmId(data.confirmation_id);
        setBookOk(true);
        showToast(`✅ Booked! Your confirmation ID: ${data.confirmation_id}`);
        setSelDoctor(''); setSelDate(''); setSelTime('');
        setPatName(''); setPatPhone(''); setReason('');
        setTimeout(() => setBookOk(false), 6000);
        loadData();
      }
    } catch {
      showToast('❌ Booking failed. Please try again.');
    }
    setBookLoading(false);
  }

  // ─── Toggle doctor availability ───────────────────────────────────────────
  async function toggleDoctor(id: number, current: boolean) {
    try {
      const res = await fetch(`${API}/doctors/${id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: id, available: !current }),
      });
      if (res.ok) {
        showToast(`✅ Doctor availability updated!`);
        loadData();
      }
    } catch {
      showToast('❌ Update failed. Please try again.');
    }
  }

  // ─── Quick reply suggestions ──────────────────────────────────────────────
  const quickReplies: Record<Role, string[]> = {
    patient: ['Find available doctor', 'Book appointment', 'Visiting hours?'],
    doctor:  ['Show my schedule', 'Pending lab results', 'Cancel appointment'],
    nurse:   ['My next shift?', 'Ward task list', 'On-call doctor?'],
    admin:   ["Today's summary", 'Mark doctor unavailable', 'Generate report'],
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  LANDING PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8"
            style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />
        </div>

        {/* Header */}
        <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg,#0d9488,#0ea5e9)' }}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">MediBot Pro</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">v2.0</span>
            </div>
          </div>

          {/* Backend status indicator */}
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium ${
            backendOk === null ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
            backendOk          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {backendOk === null ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</>
            ) : backendOk ? (
              <><Wifi className="w-3 h-3" /> Backend Live</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Backend Offline</>
            )}
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 container mx-auto px-6 flex flex-col items-center justify-center flex-grow text-center py-12">
          <div className="max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-full mb-6 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Connected to live Python FastAPI backend on Hugging Face
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">
              The AI-Powered Hub For{' '}
              <span className="block" style={{ background: 'linear-gradient(to right,#2dd4bf,#22d3ee,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Modern Hospital Management
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Real-time hospital assistant — connected to a live Python backend. Manage appointments, shifts, doctor availability and patient data all in one place.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl">
            {([
              { r: 'patient' as Role, icon: <User className="w-8 h-8" />,          color: '#0d9488', border: 'hover:border-teal-500/80',    title: 'Patient Portal',   desc: 'Book appointments & check real-time doctor availability from live backend.' },
              { r: 'doctor'  as Role, icon: <Stethoscope className="w-8 h-8" />,    color: '#2563eb', border: 'hover:border-blue-500/80',    title: 'Doctor Portal',    desc: 'View your live appointment queue, patient list and schedule.' },
              { r: 'nurse'   as Role, icon: <ClipboardList className="w-8 h-8" />,  color: '#7c3aed', border: 'hover:border-violet-500/80',  title: 'Nursing Portal',   desc: 'Check live shift assignments, ward data and task checklists.' },
              { r: 'admin'   as Role, icon: <Shield className="w-8 h-8" />,          color: '#d97706', border: 'hover:border-amber-500/80',   title: 'Admin Dashboard',  desc: 'Full hospital overview — manage doctors, nurses and appointments.' },
            ] as const).map(({ r: rVal, icon, color, border, title, desc }) => (
              <button key={rVal} onClick={() => setRole(rVal)}
                className={`group bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-7 rounded-2xl cursor-pointer
                  ${border} hover:bg-slate-800 transition-all duration-300 shadow-xl hover:-translate-y-1.5 text-left`}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
                  style={{ background: `${color}18`, color }}>
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color }}>
                  Enter portal
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </main>

        <footer className="relative z-10 border-t border-slate-800/60 py-5 text-center text-xs text-slate-600">
          MediBot v2.0 — Frontend on Vercel · Backend on Hugging Face · Built with Next.js + FastAPI
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  const roleColors: Record<Role, string> = {
    patient: '#0d9488', doctor: '#2563eb', nurse: '#7c3aed', admin: '#d97706'
  };
  const accent = roleColors[role];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-600 text-white text-sm
          px-5 py-3 rounded-2xl shadow-2xl max-w-sm">
          {toast}
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => { setRole(null); setMessages([]); }}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-5 w-px bg-slate-700 mx-1" />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0d9488,#0ea5e9)' }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-200">MediBot Dashboard</span>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={loadData} title="Refresh data"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-teal-400 transition-colors">
            <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 uppercase tracking-wider"
            style={{ color: accent }}>
            {role}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12" style={{ height: 'calc(100vh - 61px)' }}>

        {/* ══ LEFT: Chat ══ */}
        <section className="lg:col-span-5 flex flex-col border-r border-slate-800 overflow-hidden">

          {/* Chat header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">MediBot — Live Backend</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 items-end max-w-[88%] ${m.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.sender === 'bot' ? 'bg-slate-800 border border-slate-700 text-base' : 'text-white'}`}
                  style={m.sender === 'user' ? { background: accent } : {}}>
                  {m.sender === 'bot' ? '🤖' : role[0].toUpperCase()}
                </div>
                <div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                    ${m.sender === 'user' ? 'text-white rounded-br-sm' : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-bl-sm'}`}
                    style={m.sender === 'user' ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : {}}>
                    {m.text}
                  </div>
                  <div className={`text-[10px] text-slate-600 mt-1 ${m.sender === 'user' ? 'text-right' : ''}`}>{m.time}</div>
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {chatLoading && (
              <div className="flex gap-2.5 items-end self-start">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base">🤖</div>
                <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-5 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {quickReplies[role].map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-400
                  hover:text-white transition-all"
                style={{}}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex-shrink-0">
            <div className="flex gap-2 items-end bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3
              focus-within:border-teal-500/60 transition-colors">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Ask MediBot (${role} mode)…`} rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder-slate-600 resize-none leading-relaxed" />
              <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 self-end
                  disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all"
                style={{ background: accent }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ══ RIGHT: Dashboard Panel ══ */}
        <section className="lg:col-span-7 overflow-y-auto bg-slate-950 p-6">

          {/* Loading skeleton */}
          {dataLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-800/50 animate-pulse" />
              ))}
              <p className="text-center text-xs text-slate-600 mt-4">Loading live data from backend…</p>
            </div>
          )}

          {/* ════ PATIENT ════ */}
          {!dataLoading && role === 'patient' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Patient Workspace</h2>
                <p className="text-xs text-slate-500 mt-1">Live doctor availability · Powered by backend API</p>
              </div>

              {/* Doctor grid */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-teal-400" /> Live Doctor Status
                  <span className="ml-auto text-teal-400 font-normal normal-case tracking-normal">
                    {doctors.filter(d => d.available).length} available
                  </span>
                </h3>
                {doctors.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-6">No doctor data — click 🔄 to reload</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {doctors.map(doc => (
                      <div key={doc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-200 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.specialty}</p>
                          {doc.available && doc.slots.length > 0 && (
                            <p className="text-xs text-teal-400 mt-1">🕐 {doc.slots.join(' · ')}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          doc.available
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${doc.available ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {doc.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" /> Book Appointment
                </h3>

                {bookOk && (
                  <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-400 font-semibold text-sm">Appointment Booked Successfully!</p>
                      <p className="text-emerald-400/70 text-xs mt-0.5">Confirmation ID: <strong>{confirmId}</strong></p>
                    </div>
                  </div>
                )}

                <form onSubmit={bookAppointment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5 font-medium">Your Name *</label>
                      <input required value={patName} onChange={e => setPatName(e.target.value)}
                        placeholder="Full name"
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                          focus:outline-none focus:border-teal-500 text-slate-200 placeholder-slate-600 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5 font-medium">Phone</label>
                      <input value={patPhone} onChange={e => setPatPhone(e.target.value)}
                        placeholder="+92 300 XXXXXXX"
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                          focus:outline-none focus:border-teal-500 text-slate-200 placeholder-slate-600 transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5 font-medium">Doctor *</label>
                      <select required value={selDoctor} onChange={e => setSelDoctor(e.target.value)}
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                          focus:outline-none focus:border-teal-500 text-slate-200 transition-colors">
                        <option value="">Choose</option>
                        {doctors.filter(d => d.available).map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5 font-medium">Date *</label>
                      <input required type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                          focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5 font-medium">Time *</label>
                      <select required value={selTime} onChange={e => setSelTime(e.target.value)}
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                          focus:outline-none focus:border-teal-500 text-slate-200 transition-colors">
                        <option value="">Select</option>
                        {(selDoctor ? doctors.find(d => d.name === selDoctor)?.slots ?? [] : ['9:00 AM','10:00 AM','11:00 AM','2:00 PM','3:00 PM','4:00 PM']).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 font-medium">Reason / Symptoms</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      placeholder="Briefly describe your symptoms or reason for visit…"
                      className="w-full text-sm bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5
                        focus:outline-none focus:border-teal-500 text-slate-200 placeholder-slate-600 resize-none transition-colors" />
                  </div>
                  <button type="submit" disabled={bookLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2
                      hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                    {bookLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                      : '✅ Confirm Appointment'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════ DOCTOR ════ */}
          {!dataLoading && role === 'doctor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Doctor Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">Live appointment queue from backend API</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Today', val: stats?.total ?? 0,     color: '#2dd4bf' },
                  { label: 'Completed',   val: stats?.completed ?? 0, color: '#34d399' },
                  { label: 'Pending',     val: stats?.waiting ?? 0,   color: '#fbbf24' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 mb-2">{s.label}</p>
                    <p className="text-3xl font-extrabold" style={{ color: s.color }}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Appointment Queue</h3>
                {appts.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-6">No appointments — click 🔄 to reload</p>
                ) : (
                  <div className="space-y-2.5">
                    {appts.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm text-slate-200">{a.patient}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.dept}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{a.time}
                          </span>
                          <StatusBadge status={a.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ NURSE ════ */}
          {!dataLoading && role === 'nurse' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Nursing Portal</h2>
                <p className="text-xs text-slate-500 mt-1">Live shift & ward data from backend</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Active Shift Assignments</h3>
                {nurses.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-6">No nurse data — click 🔄 to reload</p>
                ) : (
                  <div className="space-y-2.5">
                    {nurses.map(n => (
                      <div key={n.id} className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm text-slate-200">{n.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.ward} · {n.shift}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                          n.on_duty
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          {n.on_duty ? '● On Duty' : '○ Off Duty'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Shift Checklist</h3>
                <div className="space-y-2.5">
                  {[
                    'Complete ICU vitals checklist and sync data',
                    'Verify medication cart stocks match quotas',
                    'Shift handover with Ward B oncoming team',
                    'Update patient chart records for all rooms',
                    'Check emergency equipment in Ward 6A',
                  ].map((t, i) => (
                    <label key={i} className="flex items-start gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                      <input type="checkbox" className="mt-0.5 accent-teal-500 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm text-slate-300 select-none leading-relaxed">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ ADMIN ════ */}
          {!dataLoading && role === 'admin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">Live hospital data — all changes save to backend instantly</p>
              </div>

              {/* Overview stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Appointments', val: overview?.total_appointments ?? 0,    color: '#2dd4bf' },
                  { label: 'Doctors On Duty',    val: overview?.doctors_on_duty ?? 0,       color: '#60a5fa' },
                  { label: 'Nurses Active',      val: overview?.nurses_on_duty ?? 0,        color: '#a78bfa' },
                  { label: 'Bed Occupancy',      val: `${overview?.bed_occupancy_percent ?? 0}%`, color: '#fbbf24' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs text-slate-500 mb-2">{s.label}</p>
                    <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Appointment breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Completed',   val: stats?.completed ?? 0,   color: '#34d399' },
                  { label: 'Waiting',     val: stats?.waiting ?? 0,     color: '#fbbf24' },
                  { label: 'Scheduled',   val: stats?.scheduled ?? 0,   color: '#60a5fa' },
                  { label: 'In Progress', val: stats?.in_progress ?? 0, color: '#a78bfa' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs text-slate-500 mb-2">{s.label}</p>
                    <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Doctor control */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-violet-400" /> Doctor Availability Control
                  </h3>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded font-semibold">
                    Saves to API
                  </span>
                </div>
                {doctors.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-4">No data — click 🔄 to reload</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {doctors.map(doc => (
                      <div key={doc.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-200 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.specialty} · {doc.slots.length} slots</p>
                        </div>
                        <button onClick={() => toggleDoctor(doc.id, doc.available)}
                          className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                            doc.available
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500'
                          }`}>
                          {doc.available ? '✅ Available' : '❌ Unavailable'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All appointments */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
                  All Appointments ({appts.length})
                </h3>
                {appts.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-4">No appointments — click 🔄 to reload</p>
                ) : (
                  <div className="space-y-2">
                    {appts.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm text-slate-200">{a.patient}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.doctor} · {a.dept}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{a.time}</span>
                          <StatusBadge status={a.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nurses */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
                  Nursing Staff ({nurses.length})
                </h3>
                <div className="divide-y divide-slate-800/60">
                  {nurses.map(n => (
                    <div key={n.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-200">{n.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.ward} · {n.shift}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        n.on_duty
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        {n.on_duty ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}