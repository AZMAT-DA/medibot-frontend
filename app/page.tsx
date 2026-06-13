"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, User, Activity, Calendar, Clock,
  CheckCircle2, AlertCircle, Send, ArrowLeft,
  Users, Stethoscope, ClipboardList, Shield, RefreshCw, Loader2
} from 'lucide-react';

// ─── BACKEND URL ──────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'https://azmatmehmood-medibot-backend.hf.space';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Message   { text: string; sender: 'user' | 'bot'; time: string }
interface Doctor    { id: number; name: string; specialty: string; available: boolean; slots: string[] }
interface Nurse     { id: number; name: string; ward: string; shift: string; on_duty: boolean }
interface Appt      { id: number; patient: string; doctor: string; dept: string; time: string; status: string }
interface Overview  { total_appointments: number; doctors_on_duty: number; nurses_on_duty: number; bed_occupancy_percent: number }
interface Stats     { total: number; completed: number; waiting: number; scheduled: number; in_progress: number }

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    in_progress: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    waiting:     'bg-blue-500/10   text-blue-400   border-blue-500/20',
    scheduled:   'bg-slate-700     text-slate-300  border-slate-600',
    cancelled:   'bg-rose-500/10   text-rose-400   border-rose-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${map[status] ?? map.scheduled}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Spinner() {
  return <Loader2 className="w-5 h-5 animate-spin text-teal-400 mx-auto my-8" />;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [role, setRole] = useState<'patient' | 'doctor' | 'nurse' | 'admin' | null>(null);

  // ── chat state ──
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── backend data ──
  const [doctors,   setDoctors]   = useState<Doctor[]>([]);
  const [nurses,    setNurses]    = useState<Nurse[]>([]);
  const [appts,     setAppts]     = useState<Appt[]>([]);
  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // ── booking form ──
  const [selDoctor, setSelDoctor] = useState('');
  const [selDate,   setSelDate]   = useState('');
  const [selTime,   setSelTime]   = useState('');
  const [patName,   setPatName]   = useState('');
  const [patPhone,  setPatPhone]  = useState('');
  const [reason,    setReason]    = useState('');
  const [bookOk,    setBookOk]    = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

  // ── toast ──
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ─── Scroll chat to bottom ────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  // ─── Load data when role changes ──────────────────────────────────────────
  useEffect(() => {
    if (!role) return;
    loadData(role);
    const greeting: Record<string, string> = {
      patient: "Welcome to MediBot! 👋 I can help you find available doctors, book appointments, or answer health queries.",
      doctor:  "Hello Doctor! 👨‍⚕️ Your schedule and patient data are live. How can I assist you today?",
      nurse:   "Hi Nurse! 💉 Your shift and ward assignments are loaded. What do you need?",
      admin:   "Good day, Admin! 📊 Full hospital overview is live. What would you like to manage?",
    };
    setMessages([{ text: greeting[role], sender: 'bot', time: nowTime() }]);
  }, [role]);

  async function loadData(r: string) {
    setDataLoading(true);
    try {
      const [docRes, nurseRes, apptRes, ovRes, stRes] = await Promise.all([
        fetch(`${API}/doctors`),
        fetch(`${API}/nurses`),
        fetch(`${API}/appointments`),
        fetch(`${API}/admin/overview`),
        fetch(`${API}/appointments/stats`),
      ]);
      if (docRes.ok)   setDoctors((await docRes.json()).doctors);
      if (nurseRes.ok) setNurses((await nurseRes.json()).nurses);
      if (apptRes.ok)  setAppts((await apptRes.json()).appointments);
      if (ovRes.ok)    setOverview(await ovRes.json());
      if (stRes.ok)    setStats(await stRes.json());
    } catch { showToast('⚠️ Could not reach backend. Showing cached data.'); }
    finally { setDataLoading(false); }
  }

  // ─── Send chat message to backend ─────────────────────────────────────────
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
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
      setMessages(p => [...p, { text: '⚠️ Could not reach server. Please try again.', sender: 'bot', time: nowTime() }]);
    }
    setChatLoading(false);
  }

  function sendQuick(q: string) { setInput(q); setTimeout(() => sendMessage(), 50); }

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
          patient_name: patName, cnic: 'N/A', department: 'General',
          doctor: selDoctor, date: selDate, time: selTime,
          reason: reason || 'General consultation', phone: patPhone || 'N/A',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookOk(true);
        showToast(`✅ Booked! Confirmation: ${data.confirmation_id}`);
        setSelDoctor(''); setSelDate(''); setSelTime(''); setPatName(''); setPatPhone(''); setReason('');
        setTimeout(() => setBookOk(false), 5000);
        loadData(role!);
      }
    } catch { showToast('❌ Booking failed. Please try again.'); }
    setBookLoading(false);
  }

  // ─── Toggle doctor availability (admin) ───────────────────────────────────
  async function toggleDoctor(id: number, current: boolean) {
    try {
      await fetch(`${API}/doctors/${id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: id, available: !current }),
      });
      showToast(`✅ Doctor availability updated`);
      loadData(role!);
    } catch { showToast('❌ Update failed'); }
  }

  // quick replies per role
  const quickReplies: Record<string, string[]> = {
    patient: ['Find available doctor', 'Book appointment', 'Visiting hours?'],
    doctor:  ['Show my schedule', 'Pending lab results', 'Cancel appointment'],
    nurse:   ['My next shift?', 'Ward task list', 'On-call doctor?'],
    admin:   ["Today's summary", 'Mark doctor unavailable', 'Generate report'],
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LANDING PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans relative">
        <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />

        <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-tr from-teal-400 to-emerald-400 p-2.5 rounded-xl shadow-lg shadow-teal-500/20"
              style={{ background: 'linear-gradient(to bottom right, #2dd4bf, #34d399)' }}>
              <Bot className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-xl font-bold tracking-tight"
              style={{ background: 'linear-gradient(to right, #5eead4, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MediBot Pro
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 ml-2"
                style={{ WebkitTextFillColor: 'initial' }}>v2.0</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Backend Live
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 flex flex-col items-center flex-grow relative z-10 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              The AI-Powered Hub For{' '}
              <span style={{ background: 'linear-gradient(to right, #2dd4bf, #22d3ee, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Modern Hospital Management
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Real-time hospital assistant — connected to a live Python backend. Manage appointments, shifts, and staff availability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
            {[
              { r: 'patient' as const, icon: <User className="w-8 h-8"/>,         color: 'teal',   title: 'Patient Terminal',   desc: 'Book appointments & check real-time doctor availability.' },
              { r: 'doctor'  as const, icon: <Stethoscope className="w-8 h-8"/>,   color: 'cyan',   title: 'Doctor Terminal',    desc: 'View your schedule, patient queue and appointment list.' },
              { r: 'nurse'   as const, icon: <ClipboardList className="w-8 h-8"/>, color: 'emerald',title: 'Nursing Portal',     desc: 'Check shifts, ward assignments and task checklists.' },
              { r: 'admin'   as const, icon: <Shield className="w-8 h-8"/>,        color: 'purple', title: 'Admin Dashboard',    desc: 'Full hospital overview. Manage doctors, nurses & data.' },
            ].map(({ r: rVal, icon, color, title, desc }) => (
              <div key={rVal} onClick={() => setRole(rVal)}
                className={`group bg-slate-800/50 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl cursor-pointer
                  hover:border-${color}-500/80 hover:bg-slate-800/90 transition-all duration-300 shadow-xl
                  flex flex-col items-center text-center hover:-translate-y-1`}>
                <div className={`p-4 bg-${color}-500/10 text-${color}-400 rounded-xl
                  group-hover:bg-${color}-500 group-hover:text-slate-900 transition-all duration-300 mb-5`}>
                  {icon}
                </div>
                <h3 className={`text-xl font-semibold mb-2 group-hover:text-${color}-300 transition-colors`}>{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="border-t border-slate-800/80 py-6 bg-slate-950/40 text-center text-xs text-slate-500">
          MediBot — Connected to live backend at {API}
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setRole(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <Bot className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-slate-200 tracking-tight">MediBot Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadData(role)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-teal-400 transition-colors" title="Refresh data">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
            Workspace: <strong className="text-teal-400">{role}</strong>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </nav>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden" style={{ height: 'calc(100vh - 69px)' }}>

        {/* ── LEFT: Chat Panel ── */}
        <section className="lg:col-span-5 flex flex-col bg-slate-900/40 border-r border-slate-800/80 h-full">
          <div className="p-4 border-b border-slate-800/60 bg-slate-900/20 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">MediBot Assistant — Live Backend</p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-md text-sm leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-linear-to-br from-teal-600 to-teal-700 text-white rounded-br-none'
                    : 'bg-slate-800 border border-slate-700/70 text-slate-200 rounded-bl-none'
                }`} style={msg.sender === 'user' ? { background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' } : {}}>
                  {msg.text}
                  <span className="block text-[10px] text-slate-400 mt-1.5 text-right">{msg.time}</span>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {(quickReplies[role] || []).map(q => (
              <button key={q} onClick={() => sendQuick(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:border-teal-500 hover:text-teal-400 transition-all">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-slate-800 bg-slate-900/60">
            <div className="relative flex items-center">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Ask MediBot anything (${role} mode)...`}
                className="w-full bg-slate-950 text-sm rounded-xl border border-slate-700/80 pl-4 pr-12 py-3.5 focus:outline-none focus:border-teal-500 transition-all text-slate-200 placeholder-slate-500" />
              <button type="submit" disabled={chatLoading || !input.trim()}
                className="absolute right-2 p-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 rounded-lg transition-colors">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </section>

        {/* ── RIGHT: Dashboard Panel ── */}
        <section className="lg:col-span-7 p-6 overflow-y-auto h-full bg-slate-950">
          {dataLoading && <Spinner />}

          {/* ════ PATIENT ════ */}
          {!dataLoading && role === 'patient' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Patient Workspace</h2>
                <p className="text-xs text-slate-400">Live doctor availability from your hospital backend.</p>
              </div>

              {/* Doctor availability */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" /> Live Doctor Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map(doc => (
                    <div key={doc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-200">{doc.name}</h4>
                        <p className="text-xs text-slate-400">{doc.specialty}</p>
                        {doc.slots.length > 0 && (
                          <p className="text-xs text-teal-400 mt-0.5">Slots: {doc.slots.join(', ')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className={`w-2 h-2 rounded-full ${doc.available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-xs text-slate-300 font-medium">{doc.available ? 'Available' : 'Unavailable'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" /> Book Appointment
                </h3>
                {bookOk && (
                  <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    Appointment booked successfully! Check your confirmation in the toast notification.
                  </div>
                )}
                <form onSubmit={bookAppointment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Your Name *</label>
                      <input required value={patName} onChange={e => setPatName(e.target.value)} placeholder="Full name"
                        className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Phone Number</label>
                      <input value={patPhone} onChange={e => setPatPhone(e.target.value)} placeholder="+92 300 XXXXXXX"
                        className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select Doctor *</label>
                      <select required value={selDoctor} onChange={e => setSelDoctor(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300">
                        <option value="">Choose Doctor</option>
                        {doctors.filter(d => d.available).map(d => (
                          <option key={d.id} value={d.name}>{d.name} — {d.specialty}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date *</label>
                      <input required type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Time *</label>
                      <select required value={selTime} onChange={e => setSelTime(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300">
                        <option value="">Select Time</option>
                        {selDoctor && doctors.find(d => d.name === selDoctor)?.slots.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        {!selDoctor && ['9:00 AM','10:00 AM','11:00 AM','2:00 PM','3:00 PM','4:00 PM'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Reason / Symptoms</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      placeholder="Briefly describe your symptoms..."
                      className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300 resize-none" />
                  </div>
                  <button type="submit" disabled={bookLoading}
                    className="w-full text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {bookLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</> : '✅ Confirm Appointment'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════ DOCTOR ════ */}
          {!dataLoading && role === 'doctor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Doctor Dashboard</h2>
                <p className="text-xs text-slate-400">Live appointment queue and patient data from backend.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Total Today</span>
                  <span className="text-2xl font-extrabold text-teal-400">{stats?.total ?? 0}</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Completed</span>
                  <span className="text-2xl font-extrabold text-emerald-400">{stats?.completed ?? 0}</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Pending</span>
                  <span className="text-2xl font-extrabold text-amber-400">{stats?.waiting ?? 0}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">Today's Appointment Queue</h3>
                <div className="space-y-3">
                  {appts.slice(0, 6).map(a => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{a.patient}</p>
                        <p className="text-slate-400 mt-0.5">{a.dept}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-slate-300"><Clock className="w-3 h-3" />{a.time}</span>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                  {appts.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No appointments loaded</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════ NURSE ════ */}
          {!dataLoading && role === 'nurse' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Nursing Portal</h2>
                <p className="text-xs text-slate-400">Live shift and ward data from backend.</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">Active Shift Assignments</h3>
                <div className="space-y-3">
                  {nurses.map(n => (
                    <div key={n.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block mb-0.5">{n.name}</span>
                        <span className="text-slate-400">{n.ward} · {n.shift}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg font-medium border text-xs ${
                        n.on_duty
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {n.on_duty ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  ))}
                  {nurses.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No nurse data loaded</p>}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-3">Shift Checklist</h3>
                <div className="space-y-2.5">
                  {['Complete ICU vitals checklist', 'Verify medication cart stocks', 'Shift handover with Ward B team', 'Update patient chart records'].map((t, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-900/40 transition-colors">
                      <input type="checkbox" className="mt-0.5 accent-teal-500 h-4 w-4" />
                      <span className="text-xs text-slate-300 select-none leading-relaxed">{t}</span>
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
                <h2 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h2>
                <p className="text-xs text-slate-400">Live hospital data — all changes save to backend.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Appointments', val: overview?.total_appointments ?? 0, color: 'text-teal-400' },
                  { label: 'Doctors On Duty',    val: overview?.doctors_on_duty ?? 0,    color: 'text-blue-400' },
                  { label: 'Nurses Active',      val: overview?.nurses_on_duty ?? 0,     color: 'text-violet-400' },
                  { label: 'Bed Occupancy',      val: `${overview?.bed_occupancy_percent ?? 0}%`, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <span className="block text-xs text-slate-400 mb-1">{s.label}</span>
                    <span className={`text-2xl font-extrabold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>

              {/* Appointment stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Completed',    val: stats?.completed ?? 0,   color: 'text-emerald-400' },
                  { label: 'Waiting',      val: stats?.waiting ?? 0,     color: 'text-amber-400' },
                  { label: 'Scheduled',    val: stats?.scheduled ?? 0,   color: 'text-blue-400' },
                  { label: 'In Progress',  val: stats?.in_progress ?? 0, color: 'text-teal-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <span className="block text-xs text-slate-400 mb-1">{s.label}</span>
                    <span className={`text-2xl font-extrabold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>

              {/* Doctor management */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Doctor Availability Control
                  </h3>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 rounded">
                    Changes save to API
                  </span>
                </div>
                <div className="divide-y divide-slate-800">
                  {doctors.map(doc => (
                    <div key={doc.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-slate-200">{doc.name}</p>
                        <p className="text-[11px] text-slate-500">{doc.specialty} · {doc.slots.length} slots today</p>
                      </div>
                      <button onClick={() => toggleDoctor(doc.id, doc.available)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          doc.available
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950'
                        }`}>
                        {doc.available ? '✅ Available' : '❌ Unavailable'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* All appointments */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">All Appointments</h3>
                <div className="space-y-2">
                  {appts.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{a.patient}</p>
                        <p className="text-slate-400">{a.doctor} · {a.dept}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{a.time}</span>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                  {appts.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No appointments loaded</p>}
                </div>
              </div>

              {/* Nurse list */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">Nursing Staff</h3>
                <div className="divide-y divide-slate-800">
                  {nurses.map(n => (
                    <div key={n.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-slate-200">{n.name}</p>
                        <p className="text-[11px] text-slate-500">{n.ward} · {n.shift}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-semibold border text-[10px] uppercase ${
                        n.on_duty
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
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