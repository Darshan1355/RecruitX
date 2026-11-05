import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidatesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import ResumeViewerModal from '../components/ResumeViewerModal';
import { 
  GitCompare, 
  Check, 
  X, 
  Star, 
  Sparkles, 
  Users, 
  Briefcase, 
  GraduationCap, 
  ShieldCheck,
  ChevronRight,
  FileText
} from 'lucide-react';

export default function Comparison() {
  const { showSuccess, showError, showInfo } = useToast();
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeResumeViewer, setActiveResumeViewer] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await candidatesApi.getCandidates();
      const list = res.data.candidates || [];
      setCandidatesList(list);
      // Pre-select first 2 candidates
      if (list.length >= 2) {
        const initial = [list[0].id, list[1].id];
        setSelectedIds(initial);
        runComparison(initial);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  };

  const runComparison = async (idsToCompare) => {
    if (!idsToCompare || idsToCompare.length < 2) return;
    setLoading(true);
    try {
      const res = await candidatesApi.compare(idsToCompare);
      setComparisonData(res.data);
    } catch (err) {
      console.error('Comparison error:', err);
      showError('Failed to generate candidate comparison: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidateSelection = (candId) => {
    let updated;
    if (selectedIds.includes(candId)) {
      if (selectedIds.length <= 2) {
        showInfo('Minimum 2 candidates required for comparison');
        return;
      }
      updated = selectedIds.filter(id => id !== candId);
    } else {
      if (selectedIds.length >= 4) {
        showInfo('Maximum 4 candidates can be compared simultaneously');
        return;
      }
      updated = [...selectedIds, candId];
    }
    setSelectedIds(updated);
    runComparison(updated);
  };

  const handleToggleShortlist = async (candId, candName) => {
    try {
      const res = await candidatesApi.toggleShortlist(candId);
      const isShortlisted = res.data.is_shortlisted;
      setComparisonData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          candidates: prev.candidates.map(c =>
            c.id === candId ? { ...c, is_shortlisted: isShortlisted } : c
          )
        };
      });
      if (isShortlisted) {
        showSuccess(`${candName || 'Candidate'} added to Shortlisted Talent!`);
      } else {
        showInfo(`${candName || 'Candidate'} removed from Shortlist`);
      }
    } catch (err) {
      console.error('Shortlist error:', err);
      showError('Failed to update shortlist status');
    }
  };

  const getGridColsClass = (count) => {
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase mb-2">
          Module 5: Candidate Comparison Matrix
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Multi-Candidate Side-by-Side Comparison
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Compare 2 to 4 candidates across technical competencies, documented project evidence, and skill coverage.
        </p>
      </div>

      {/* Candidate Selector Badges */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <span className="text-slate-300">Select candidates to compare (2 to 4):</span>
          <span className="text-cyan-400 font-bold">{selectedIds.length} / 4 Selected</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {candidatesList.map(cand => {
            const isSelected = selectedIds.includes(cand.id);
            return (
              <button
                key={cand.id}
                onClick={() => toggleCandidateSelection(cand.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
                <span>{cand.full_name}</span>
                <span className="text-[10px] text-slate-500">({cand.years_of_experience || 3} yrs)</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm glass-panel rounded-2xl">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Evaluating comparative matrices and RAG skill coverage...
        </div>
      ) : !comparisonData ? (
        <div className="py-16 text-center text-slate-400 text-sm glass-panel rounded-2xl">
          Select at least 2 candidates above to begin comparison.
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* AI Comparison Summary Card */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-cyan-500/30 relative overflow-hidden shadow-glow-cyan">
            <div className="flex items-center gap-2.5 text-cyan-300 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>AI Comparative Intelligence Analysis</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-4xl">
              {comparisonData.ai_summary}
            </p>
          </div>

          {/* Side-by-Side Candidate Cards Grid */}
          <div className={`grid ${getGridColsClass(comparisonData.candidates.length)} gap-5`}>
            {comparisonData.candidates.map((cand, idx) => (
              <div key={cand.id || idx} className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col justify-between border border-slate-800 hover:border-cyan-500/30 transition-all">
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-white">{cand.name}</h3>
                      <p className="text-xs text-slate-400">
                        {cand.experience_years || 3}+ Years Experience
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cand.resume_id && (
                        <button
                          onClick={() => setActiveResumeViewer({ id: cand.resume_id, name: cand.name })}
                          title="Preview Resume"
                          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleShortlist(cand.id, cand.name)}
                        title={cand.is_shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                        className={`p-2 rounded-xl transition-all ${
                          cand.is_shortlisted
                            ? 'bg-purple-600 text-white shadow-glow-purple'
                            : 'bg-slate-800 text-slate-400 hover:text-purple-400'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${cand.is_shortlisted ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Top Skills */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Key Technical Skills ({(cand.skills || []).length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(cand.skills || []).slice(0, 8).map((s, sIdx) => (
                        <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                          {s}
                        </span>
                      ))}
                      {(cand.skills || []).length > 8 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-cyan-400 border border-slate-800">
                          +{cand.skills.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recent Project */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Primary Project Artifact
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-2 italic">
                      "{cand.projects?.[0]?.description || 'Engineered production software systems and microservices.'}"
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">ID: {cand.id}</span>
                  <Link
                    to={`/candidates/${cand.id}`}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    View Full DNA <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Skill Coverage Matrix Table */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400" />
              Technical Skill Matrix Comparison
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800 bg-slate-900/50">
                  <tr>
                    <th className="py-3 px-4">Technical Competency</th>
                    {comparisonData.candidates.map((cand, idx) => (
                      <th key={idx} className="py-3 px-4 text-center">
                        {cand.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(comparisonData.comparison_matrix || []).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {row.skill}
                      </td>
                      {comparisonData.candidates.map((cand, cIdx) => {
                        const hasSkill = row[cand.name];
                        return (
                          <td key={cIdx} className="py-3 px-4 text-center">
                            {hasSkill ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-500">
                                <X className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Embedded In-App Resume Previewer */}
      {activeResumeViewer && (
        <ResumeViewerModal
          resumeId={activeResumeViewer.id}
          candidateName={activeResumeViewer.name}
          onClose={() => setActiveResumeViewer(null)}
        />
      )}
    </div>
  );
}
