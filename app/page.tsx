"use client";
import React, { useState } from 'react';
import { 
  Bot, User, Activity, ShieldAlert, Calendar, Clock, 
  CheckCircle2, AlertCircle, Send, ArrowLeft,
  Users, Stethoscope, ClipboardList, Shield
} from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  status: string;
  color: string;
}

interface Shift {
  name: string;
  shift: string;
  nurse: string;
}

export default function Home() {
  const [currentRole, setCurrentRole] = useState<'patient' | 'doctor' | 'nurse' | 'admin' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const doctorsList: Doctor[] = [
    { id: 1, name: 'Dr. Sarah Jenkins', specialty: 'Cardiologist', status: 'Available', color: 'bg-emerald-500' },
    { id: 2, name: 'Dr. Michael Chang', specialty: 'Pediatrician', status: 'In Meeting', color: 'bg-amber-500' },
    { id: 3, name: 'Dr. Lisa Rosenberg', specialty: 'Neurologist', status: 'On Leave', color: 'bg-rose-500' },
    { id: 4, name: 'Dr. David Kim', specialty: 'General Surgeon', status: 'Available', color: 'bg-emerald-500' },
  ];

  const nurseShifts: Shift[] = [
    { name: 'Ward A - Emergency', shift: 'Morning (07:00 - 15:00)', nurse: 'Emily Watson' },
    { name: 'Ward B - ICU', shift: 'Night (23:00 - 07:00)', nurse: 'Jessica Taylor' },
    { name: 'Pediatrics Wing', shift: 'Evening (15:00 - 23:00)', nurse: 'Ryan Reynolds' },
  ];

  // CONNECTED TO PYTHON BACKEND ENGINE
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = { 
      text: inputValue, 
      sender: 'user', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          role: currentRole,
        }),
      });

      if (!response.ok) {
        throw new Error("Server responded with an error status");
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        text: data.response,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error("Backend connection failure:", error);
      setMessages(prev => [...prev, {
        text: "⚠️ Core connection failure. Please confirm that your Python backend server is running in your terminal on port 8000.",
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !appointmentTime) return;
    setBookingSuccess(true);
    setTimeout(() => setBookingSuccess(false), 4000);
    setSelectedDoctor('');
    setAppointmentDate('');
    setAppointmentTime('');
  };

  // --- PORTAL SELECTION PAGE ---
  if (!currentRole) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans relative">
        <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />
        
        <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-400 to-emerald-400 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
              <Bot className="w-6 h-6 text-slate-900 font-bold" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
              MediBot Pro <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 ml-1">v2.0 Enterprise</span>
            </span>
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 flex flex-col items-center justify-center flex-grow relative z-10 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              The AI-Powered Hub For <br />
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Modern Hospital Management
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              An all-in-one smart conversational application deployed to safely link patients, doctors, nursing staff, and hospital system administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
            {/* Patient Workspace */}
            <div onClick={() => { setCurrentRole('patient'); setMessages([{ text: "Welcome to MediBot Portal. How can I assist you with your health services or appointments today?", sender: 'bot', time: 'Now' }]) }}
                 className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl cursor-pointer hover:border-teal-500/80 hover:bg-slate-800/90 transition-all duration-300 shadow-xl flex flex-col items-center text-center transform hover:-translate-y-1">
              <div className="p-4 bg-teal-500/10 text-teal-400 rounded-xl group-hover:bg-teal-500 group-hover:text-slate-900 transition-all duration-300 mb-5">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-teal-300 transition-colors">Patient Terminal</h3>
              <p className="text-sm text-slate-400">Check availability metrics, chat with triage help, and instantly book open doctor consultations.</p>
            </div>

            {/* Doctor Workspace */}
            <div onClick={() => { setCurrentRole('doctor'); setMessages([{ text: "Hello Doctor. Integrated records system live. I can surface appointment rosters and update schedule anomalies.", sender: 'bot', time: 'Now' }]) }}
                 className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl cursor-pointer hover:border-cyan-500/80 hover:bg-slate-800/90 transition-all duration-300 shadow-xl flex flex-col items-center text-center transform hover:-translate-y-1">
              <div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all duration-300 mb-5">
                <Stethoscope className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-cyan-300 transition-colors">Doctor Terminal</h3>
              <p className="text-sm text-slate-400">Track dynamic daily patient rotations, log consultation updates, and check schedule buffers natively.</p>
            </div>

            {/* Nurse Workspace */}
            <div onClick={() => { setCurrentRole('nurse'); setMessages([{ text: "Shift Terminal Active. Floor handoffs, assigned clinical wards, and custom item checklist monitors loaded.", sender: 'bot', time: 'Now' }]) }}
                 className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl cursor-pointer hover:border-emerald-500/80 hover:bg-slate-800/90 transition-all duration-300 shadow-xl flex flex-col items-center text-center transform hover:-translate-y-1">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-900 transition-all duration-300 mb-5">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-300 transition-colors">Nursing Portal</h3>
              <p className="text-sm text-slate-400">View real-time ward shifts, monitor active bed assignments, and log direct item check workflows.</p>
            </div>

            {/* Admin Workspace */}
            <div onClick={() => { setCurrentRole('admin'); setMessages([{ text: "Root access accepted. Full hospital structural system components available for remote administrative bypass.", sender: 'bot', time: 'Now' }]) }}
                 className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/60 p-8 rounded-2xl cursor-pointer hover:border-purple-500/80 hover:bg-slate-800/90 transition-all duration-300 shadow-xl flex flex-col items-center text-center transform hover:-translate-y-1">
              <div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-slate-900 transition-all duration-300 mb-5">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-300 transition-colors">Admin Overlord</h3>
              <p className="text-sm text-slate-400">Global control array. Dynamically toggle physician system availability and view infrastructure charts.</p>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-800/80 py-6 bg-slate-950/40 text-center text-xs text-slate-500 relative z-10">
          Ready-to-Deploy Smart Hospital Solutions Framework — Fully Customizable Dashboard Pack.
        </footer>
      </div>
    );
  }

  // --- CORE SYSTEM DASHBOARD LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRole(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-400" />
            <span className="font-bold text-slate-200 tracking-tight">MediBot Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
            Active Workspace: <strong className="text-teal-400">{currentRole}</strong>
          </span>
        </div>
      </nav>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-69px)]">
        
        {/* Chat Terminal Section */}
        <section className="lg:col-span-5 flex flex-col bg-slate-900/40 border-r border-slate-800/80 h-full">
          <div className="p-4 border-b border-slate-800/60 bg-slate-900/20 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Dedicated Assistant Stream</p>
          </div>

          <div className="flex-grow p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-210px)]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-br-none' 
                    : 'bg-slate-800 border border-slate-700/70 text-slate-200 rounded-bl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                  <span className="block text-[10px] text-slate-400 mt-1.5 text-right">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask anything specific to your ${currentRole} workspace...`}
                className="w-full bg-slate-950 text-sm rounded-xl border border-slate-700/80 pl-4 pr-12 py-3.5 focus:outline-none focus:border-teal-500 transition-all text-slate-200 placeholder-slate-500"
              />
              <button type="submit" className="absolute right-2 p-2 bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </section>

        {/* Workspace Management Panels */}
        <section className="lg:col-span-7 p-6 overflow-y-auto h-full bg-slate-950">
          
          {/* Patient Subview */}
          {currentRole === 'patient' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Patient Control Workspace</h2>
                <p className="text-xs text-slate-400">Assess modern specialized physical health scheduling profiles.</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" /> Physician Status Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctorsList.map((doc) => (
                    <div key={doc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-200">{doc.name}</h4>
                        <p className="text-xs text-slate-400">{doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className={`w-2 h-2 rounded-full ${doc.color}`} />
                        <span className="text-xs text-slate-300 font-medium">{doc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" /> Quick Appointment Booking
                </h3>
                
                {bookingSuccess && (
                  <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>Appointment query submitted successfully! Your validation schedule is processing.</span>
                  </div>
                )}

                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select Specialist</label>
                      <select required value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
                              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300">
                        <option value="">Choose Physician</option>
                        {doctorsList.map(d => <option key={d.id} value={d.name}>{d.name} ({d.specialty})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Desired Date</label>
                      <input required type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)}
                             className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Desired Time</label>
                      <input required type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)}
                             className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 text-slate-300" />
                    </div>
                  </div>
                  <button type="submit" className="w-full text-xs bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-3 px-4 rounded-lg transition-colors tracking-wide uppercase">
                    Confirm Target Booking Slot
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Doctor Subview */}
          {currentRole === 'doctor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Physician Roster Control</h2>
                <p className="text-xs text-slate-400">Active medical case review tracker and workflow data pipelines.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Assigned Cases</span>
                  <span className="text-2xl font-extrabold text-teal-400">14</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Completed Tech Logs</span>
                  <span className="text-2xl font-extrabold text-cyan-400">9</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 mb-1">Critical Fast Tracks</span>
                  <span className="text-2xl font-extrabold text-rose-400">2</span>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">Today's Appointment Queue</h3>
                <div className="space-y-3">
                  {[
                    { patient: "Marcus Aurelius", time: "09:30 AM", reason: "Post-op Followup", state: "Completed" },
                    { patient: "Eleanor Vance", time: "11:15 AM", reason: "Chronic Arrhythmia", state: "In Progress" },
                    { patient: "Amir Khan", time: "02:00 PM", reason: "Diagnostic Screening", state: "Pending" }
                  ].map((appt, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{appt.patient}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{appt.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-medium text-slate-300 mb-1 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {appt.time}</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                          appt.state === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          appt.state === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>{appt.state}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nurse Subview */}
          {currentRole === 'nurse' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Clinical Nursing Matrix</h2>
                <p className="text-xs text-slate-400">Live operational assignment sheets, checklists, and active ward rosters.</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-4">Active Shift Allocation Array</h3>
                <div className="space-y-3">
                  {nurseShifts.map((shift, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block mb-0.5">{shift.name}</span>
                        <span className="text-slate-400">{shift.shift}</span>
                      </div>
                      <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg font-medium">{shift.nurse}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-3">Critical Station Verification Items</h3>
                <div className="space-y-2.5">
                  {[
                    "Complete ICU specialized vitals checklist and sync data arrays",
                    "Verify ER emergency support medication cart stocks match target quotas",
                    "Acknowledge shift handover reporting protocols with Ward B oncoming team"
                  ].map((task, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-900/40 transition-colors">
                      <input type="checkbox" className="mt-0.5 accent-teal-500 h-4 w-4 rounded bg-slate-900 border-slate-700 text-teal-500" />
                      <span className="text-xs text-slate-300 select-none leading-relaxed">{task}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Admin Subview */}
          {currentRole === 'admin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Global System Infrastructure Administration</h2>
                <p className="text-xs text-slate-400">Complete architectural data metrics control array override panels.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div><span className="block text-xs text-slate-400 mb-0.5">Global System Health</span><span className="text-lg font-bold text-emerald-400">Nominal (100%)</span></div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div><span className="block text-xs text-slate-400 mb-0.5">Database Sync Nodes</span><span className="text-lg font-bold text-cyan-400">Active (4/4)</span></div>
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div><span className="block text-xs text-slate-400 mb-0.5">Incident Reports</span><span className="text-lg font-bold text-slate-400">0 Alerts</span></div>
                  <AlertCircle className="w-5 h-5 text-slate-500" />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Live Resource Controls
                  </h3>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 rounded">Bypass Root Enabled</span>
                </div>

                <div className="divide-y divide-slate-800">
                  <div className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-slate-200">Dr. Sarah Jenkins (Cardiology)</p>
                      <p className="text-[11px] text-slate-500">System Availability State Override</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold rounded text-[10px] uppercase cursor-pointer hover:bg-emerald-500 hover:text-slate-950 transition-colors">
                      Active
                    </span>
                  </div>

                  <div className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-slate-200">Dr. Lisa Rosenberg (Neurology)</p>
                      <p className="text-[11px] text-slate-500">System Availability State Override</p>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold rounded text-[10px] uppercase cursor-pointer hover:bg-rose-500 hover:text-slate-950 transition-colors">
                      On Leave
                    </span>
                  </div>

                  <div className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-slate-200">Emergency Care Room Gateway</p>
                      <p className="text-[11px] text-slate-500">Security Access Lock State</p>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 font-semibold rounded text-[10px] uppercase cursor-pointer hover:bg-slate-700 transition-colors">
                      Secured
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}