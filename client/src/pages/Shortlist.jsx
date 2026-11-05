import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidatesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { 
  Star, 
  Search, 
  Trash2, 
  FileText, 
  Dna, 
  GitCompare, 
  Briefcase, 
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Users
} from 'lucide-react';
import ResumeViewerModal from '../components/ResumeViewerModal';

export default function Shortlist() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Resume viewer state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [activeResume, setActiveResume] = useState(null);

  useEffect(() => {
    fetchShortlist();
  }, [sortBy]);

  const fetchShortlist = async () => {
    setLoading(true);
    try {
      const res = await candidatesApi.getCandidates({ shortlisted: 'true' });
      let list = res.data.candidates || [];
      if (sortBy === 'experience') {
        list.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0));
      }
      setCandidates(list);
    } catch (err) {
      console.error('Failed to load shortlist:', err);
      error('Failed to load shortlisted candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShortlist = async (candidateId, candidateName) => {
    try {
      await candidatesApi.toggleShortlist(candidateId);
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      success(`${candidateName} removed from shortlist.`);
    } catch (err) {
      error('Failed to remove from shortlist: ' + err.message);
    }
  };

  const openResumeViewer = (cand) => {
    setActiveResume({
      id: cand.resume_id || cand.id,
      name: cand.full_name,
      filename: cand.filename || `${cand.full_name.replace(/\s+/g, '_')}_resume.pdf`
    });
    setViewerModalOpen(true);
  };

  const filteredCandidates = candidates.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.skills?.some(s => s.toLowerCase().includes(q)) ||
      c.summary?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase mb-2">
            Module 9: Dedicated Shortlist Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Shortlisted Candidates
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              {candidates.length} saved
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Curated talent pipeline saved permanently in your SQL database for interview scheduling and team review.
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, skills..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="date">Sort: Recent</option>
            <option value="experience">Sort: Experience</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading shortlisted candidates...
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center space-y-4 max-w-lg mx-auto border border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Shortlisted Candidates Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Star candidate profile cards across the AI Dashboard or search results to build your verified shortlist.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-glow-cyan transition-all"
          >
            Discover Candidates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCandidates.map((cand) => (
            <div
              key={cand.id}
              className="glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between border border-purple-500/20 hover:border-purple-500/40 relative group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-base text-purple-300 shadow-glow-purple">
                      {cand.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm group-hover:text-purple-300 transition-colors">
                        {cand.full_name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {cand.years_of_experience}+ yrs exp · {cand.location || 'Remote'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveShortlist(cand.id, cand.full_name)}
                    title="Remove from shortlist"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {cand.summary || 'Demonstrated software development background with verified project implementations.'}
                </p>

                {/* Skills tags (All skills visible with tag wrap) */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Verified Skills ({cand.skills?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                    {(cand.skills || []).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                <button
                  onClick={() => openResumeViewer(cand)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="View complete resume PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View Resume</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/compare`)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Compare candidates"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate(`/candidates/${cand.id}`)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span>Talent DNA</span>
                    <Dna className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embedded Resume Document Viewer Modal */}
      {activeResume && (
        <ResumeViewerModal
          isOpen={viewerModalOpen}
          onClose={() => setViewerModalOpen(false)}
          resumeId={activeResume.id}
          candidateName={activeResume.name}
          filename={activeResume.filename}
          initialPage={1}
        />
      )}
    </div>
  );
}
