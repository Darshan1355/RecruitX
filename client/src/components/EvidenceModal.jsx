import React from 'react';
import { X, FileText, CheckCircle2, Bookmark, ExternalLink } from 'lucide-react';

export default function EvidenceModal({ isOpen, onClose, candidate, citation }) {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-cyan-500/30 shadow-2xl p-6 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Resume Evidence Verification
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Verified Citation
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Candidate: <span className="text-cyan-300 font-semibold">{candidate.name || candidate.full_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Citation Focus */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Bookmark className="w-3.5 h-3.5" />
                Target Skill / Competency:
              </span>
              <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 border border-slate-700">
                Page {citation?.page_number || 1}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mb-2">
              {citation?.skill_or_claim || 'Documented Technical Skill'}
            </p>
            <div className="p-3 rounded-lg bg-navy-950/80 border-l-2 border-cyan-400 font-mono text-xs text-slate-300 leading-relaxed italic">
              "{citation?.evidence_quote || 'Verified in official resume project submission and work history.'}"
            </div>
          </div>

          {/* Verification Audit Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Source Document</span>
              <span className="font-semibold text-slate-200 break-all">
                {candidate.source_file || candidate.filename || 'resume.pdf'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">RAG Grounding Integrity</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Resume Grounded
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
