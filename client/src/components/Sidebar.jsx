import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Dna, 
  Bot, 
  GitCompare, 
  Mic, 
  Star, 
  ShieldCheck, 
  Sparkles,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'AI Dashboard', icon: LayoutDashboard },
    { to: '/resumes', label: 'Resume Intelligence', icon: UploadCloud },
    { to: '/shortlist', label: 'Shortlisted Talent', icon: Star },
    { to: '/candidates', label: 'Talent DNA Profiles', icon: Dna },
    { to: '/copilot', label: 'Recruitment Copilot', icon: Bot },
    { to: '/compare', label: 'Candidate Comparison', icon: GitCompare },
    { to: '/interviews', label: 'Interview Studio', icon: Mic },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-40
        w-64 bg-navy-900/95 lg:bg-navy-900/80 backdrop-blur-xl border-r border-slate-800/80 
        flex flex-col justify-between p-4 select-none
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-glow-cyan flex items-center justify-center">
                <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                    TalentIQ
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Find. Understand. Hire.</p>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Intelligence Modules
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent text-cyan-400 border-l-2 border-cyan-400 shadow-glow-cyan'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* System Health / Status Card */}
        <div className="mt-6 space-y-3">
          <div className="glass-panel rounded-2xl p-3.5 border border-cyan-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-300 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">System Health</span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                98.6%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Hybrid Vector RAG Active
            </p>
          </div>

          <div className="px-3 py-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>TalentIQ v2.2 Enterprise</span>
            <span>Node + PyRAG</span>
          </div>
        </div>
      </aside>
    </>
  );
}
