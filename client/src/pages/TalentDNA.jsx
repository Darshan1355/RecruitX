import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidatesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { 
  Dna, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Star, 
  FileSearch, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  BookmarkCheck,
  CheckCircle2,
  Search,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Award,
  Globe,
  FolderGit2,
  Calendar,
  Building,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import EvidenceModal from '../components/EvidenceModal';
import ResumeViewerModal from '../components/ResumeViewerModal';

export default function TalentDNA() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(id || '');
  const [candidate, setCandidate] = useState(null);
  const [dnaData, setDnaData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Skill search & category filtering
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState('All');

  // Evidence Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);

  // Resume Modal & Inline Preview States
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [showInlineResume, setShowInlineResume] = useState(false);
  const [inlineZoom, setInlineZoom] = useState(100);

  useEffect(() => {
    fetchCandidatesList();
  }, []);

  useEffect(() => {
    if (selectedCandidateId) {
      loadCandidateData(selectedCandidateId);
    }
  }, [selectedCandidateId]);

  const fetchCandidatesList = async () => {
    try {
      const res = await candidatesApi.getCandidates();
      const list = res.data.candidates || [];
      setCandidatesList(list);
      if (!selectedCandidateId && list.length > 0) {
        setSelectedCandidateId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  };

  const loadCandidateData = async (candId) => {
    setLoading(true);
    try {
      const [candRes, dnaRes] = await Promise.all([
        candidatesApi.getCandidateById(candId),
        candidatesApi.getTalentDNA(candId)
      ]);
      setCandidate(candRes.data.candidate);
      setDnaData(dnaRes.data);
    } catch (err) {
      console.error('Failed to load candidate DNA:', err);
      if (showError) showError('Failed to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortlist = async () => {
    if (!candidate) return;
    try {
      const res = await candidatesApi.toggleShortlist(candidate.id);
      const isShort = res.data.is_shortlisted;
      setCandidate(prev => ({ ...prev, is_shortlisted: isShort ? 1 : 0 }));
      if (showSuccess) {
        if (isShort) {
          showSuccess(`${candidate.full_name} added to shortlist!`);
        } else {
          showSuccess(`${candidate.full_name} removed from shortlist.`);
        }
      }
    } catch (err) {
      if (showError) showError('Failed to toggle shortlist: ' + err.message);
    }
  };

  const openResumeAtPage = (pageNum = 1) => {
    setViewerPage(pageNum);
    setViewerOpen(true);
  };

  // Structured fields
  const projects = candidate?.projects || [];
  const education = candidate?.education || [];
  const experience = candidate?.experience || [];
  const internships = candidate?.internships || [];
  const certifications = candidate?.certifications || [];
  const artifacts = candidate?.technical_artifacts || [];
  const achievements = candidate?.achievements || [];
  const skillsCategorized = candidate?.skills_categorized || dnaData?.skills_categorized || {};
  const allSkills = candidate?.skills || [];

  const token = localStorage.getItem('recruitx_token') || localStorage.getItem('talentiq_token');
  const resumeId = candidate?.resume_id || candidate?.id;
  const resumeFileUrl = resumeId ? `/api/resumes/${resumeId}/file${token ? `?token=${token}` : ''}` : null;

  // Filter skills by category & query
  const availableCategories = ['All', ...Object.keys(skillsCategorized)];
  const displayedSkillCategories = Object.entries(skillsCategorized).filter(([cat]) => {
    if (selectedSkillCategory === 'All') return true;
    return cat === selectedSkillCategory;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Bar: Module Title & Candidate Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase mb-2">
            Module 3 & 10: Complete Candidate DNA & Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Candidate Intelligence & Talent DNA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Granular candidate breakdown: independent key projects, categorized skills, verified academic credentials, and interactive resume viewer.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Select Candidate:</label>
          <select
            value={selectedCandidateId}
            onChange={(e) => {
              setSelectedCandidateId(e.target.value);
              navigate(`/candidates/${e.target.value}`);
            }}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 shadow-lg"
          >
            {candidatesList.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.years_of_experience || 0}+ yrs exp)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Synthesizing granular candidate profile, projects, and skills from database...
        </div>
      ) : !candidate ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          No candidate profile found.
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* 1. Candidate Header / Profile Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-cyan-500/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-glow-cyan flex items-center justify-center text-2xl sm:text-3xl font-black text-white flex-shrink-0">
                  {candidate.full_name.charAt(0)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                      {candidate.full_name}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      ID: {candidate.id}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                      {candidate.years_of_experience || 0}+ Years Experience
                    </span>
                    {candidate.match_score && (
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                        {candidate.match_score}% ATS Fit
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {candidate.email || 'Confidential'}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-cyan-400" />
                      {candidate.phone || 'Upon Request'}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {candidate.location || 'Remote / Unspecified'}
                    </span>
                  </div>

                  {/* Technical Artifacts Bar */}
                  {artifacts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {artifacts.map((art, idx) => (
                        <a
                          key={idx}
                          href={art.url.startsWith('http') ? art.url : `https://${art.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                        >
                          <FolderGit2 className="w-3 h-3 text-cyan-400" />
                          <span>{art.type || 'Profile'}: {art.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleToggleShortlist}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                    candidate.is_shortlisted
                      ? 'bg-purple-600 text-white shadow-glow-purple'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${candidate.is_shortlisted ? 'fill-current' : ''}`} />
                  <span>{candidate.is_shortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </button>

                <button
                  onClick={() => setShowInlineResume(prev => !prev)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  {showInlineResume ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4 text-cyan-400" />}
                  <span>{showInlineResume ? 'Hide Resume' : 'In-Profile Resume'}</span>
                </button>

                <button
                  onClick={() => openResumeAtPage(1)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-purple-400" />
                  <span>Modal Viewer</span>
                </button>

                <button
                  onClick={() => navigate('/interviews')}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-glow-cyan transition-all flex items-center gap-2"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Interview Studio</span>
                </button>
              </div>
            </div>

            {/* Executive Summary */}
            {candidate.summary && (
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Executive Profile Summary
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-4xl">
                  {candidate.summary}
                </p>
              </div>
            )}
          </div>

          {/* 2. In-Profile Interactive Resume Viewer (Collapsible) */}
          {showInlineResume && resumeFileUrl && (
            <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-cyan-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Original Uploaded Resume: <span className="font-mono text-cyan-300 font-normal">{candidate.filename || `${candidate.full_name}.pdf`}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={() => setInlineZoom(prev => Math.max(60, prev - 15))}
                      className="p-1.5 text-slate-400 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono px-2 text-slate-300">{inlineZoom}%</span>
                    <button
                      onClick={() => setInlineZoom(prev => Math.min(180, prev + 15))}
                      className="p-1.5 text-slate-400 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setInlineZoom(100)}
                      className="p-1.5 text-slate-400 hover:text-white"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <a
                    href={resumeFileUrl}
                    download={candidate.filename || `${candidate.full_name}_resume.pdf`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    Download
                  </a>

                  <button
                    onClick={() => openResumeAtPage(1)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    Full Screen
                  </button>
                </div>
              </div>

              {/* Embedded Frame */}
              <div className="w-full h-[650px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
                <div 
                  className="w-full h-full transition-transform origin-top-left"
                  style={{
                    transform: inlineZoom !== 100 ? `scale(${inlineZoom / 100})` : 'none',
                    transformOrigin: 'top center',
                    width: inlineZoom !== 100 ? `${100 / (inlineZoom / 100)}%` : '100%',
                    height: inlineZoom !== 100 ? `${100 / (inlineZoom / 100)}%` : '100%'
                  }}
                >
                  <iframe
                    src={resumeFileUrl}
                    title="Original Candidate Resume"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Key Projects Section (CRITICAL: Every project has its own independent card) */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  Key Projects & Technical Artifacts ({projects.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Independent project cards with extracted tech stacks, core descriptions, contributions, and links.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 self-start sm:self-auto">
                No Combined Paragraphs
              </span>
            </div>

            {projects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No specific projects extracted or candidate has not listed discrete project sections in resume.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
                  >
                    <div className="space-y-3">
                      {/* Project Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                            Project {idx + 1}
                          </span>
                          <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {proj.name || proj.title || `Project #${idx + 1}`}
                          </h4>
                        </div>
                        {proj.link && (
                          <a
                            href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors"
                            title="Open Project Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Project Description */}
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-400 block text-[11px] mb-0.5">Project Description:</span>
                        <p>{proj.description || 'Not provided'}</p>
                      </div>

                      {/* Key Contributions */}
                      {proj.contributions && (
                        <div className="text-xs text-slate-300 leading-relaxed p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <span className="font-bold text-purple-300 block text-[11px] mb-1">Key Contributions:</span>
                          <p>{proj.contributions}</p>
                        </div>
                      )}
                    </div>

                    {/* Technologies Used */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Technologies Used:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0 ? (
                          proj.tech_stack.map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                            >
                              {tech}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Not specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Categorized Technical Skills (10 Dynamic Categories & Search) */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Technical Skills & Competencies ({allSkills.length} Total Extracted)
                </h3>
                <p className="text-xs text-slate-400">
                  Dynamically parsed into 10 key technical domains. Filter by category or search in real time.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  placeholder="Filter skills..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedSkillCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedSkillCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Categorized Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSkillCategories.map(([category, skillsList]) => {
                const filtered = skillsList.filter(s =>
                  s.toLowerCase().includes(skillSearchQuery.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={category} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        {category}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {filtered.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {filtered.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Academic Credentials & Qualifications (CRITICAL: Every qualification in separate card) */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  Academic Credentials & Education ({education.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Independently extracted degrees, specializations, universities, passing years, and GPAs.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 self-start sm:self-auto">
                Verified Qualifications
              </span>
            </div>

            {education.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No formal education entries extracted from resume.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-slate-100">
                        {edu.degree || edu.qualification || 'Degree / Diploma'}
                      </h4>
                      {edu.year && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {edu.year}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      {edu.specialization && (
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <span className="text-slate-400">Stream:</span>
                          <span className="font-semibold">{edu.specialization}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-1.5 text-slate-300">
                        <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{edu.institution || edu.college || 'Institution Not Specified'}</span>
                      </div>

                      {(edu.cgpa || edu.grade || edu.percentage) && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Score / Grade:</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {edu.cgpa ? `CGPA: ${edu.cgpa}` : (edu.percentage ? `${edu.percentage}%` : edu.grade)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Professional Experience & Internships */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Work Experience */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                Professional Work Experience ({experience.length})
              </h3>

              {experience.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No formal full-time experience recorded.</p>
              ) : (
                <div className="space-y-3">
                  {experience.map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">{exp.title}</h4>
                          <p className="text-[11px] text-cyan-300">{exp.company}</p>
                        </div>
                        {exp.duration && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {exp.duration}
                          </span>
                        )}
                      </div>

                      {Array.isArray(exp.highlights) && exp.highlights.length > 0 && (
                        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                          {exp.highlights.map((h, hIdx) => (
                            <li key={hIdx}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internships & Certifications */}
            <div className="space-y-6">
              {/* Internships */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  Internships ({internships.length})
                </h3>

                {internships.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No internships recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {internships.map((intern, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-xs text-slate-200">{intern.title}</h4>
                          {intern.duration && (
                            <span className="text-[10px] text-slate-400">{intern.duration}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-purple-300">{intern.company}</p>
                        {intern.description && (
                          <p className="text-xs text-slate-300 mt-1">{intern.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Certifications ({certifications.length})
                </h3>

                {certifications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No specific certifications listed.</p>
                ) : (
                  <div className="space-y-2">
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-100">{cert.title || cert.name}</p>
                          <p className="text-[11px] text-slate-400">{cert.issuer}</p>
                        </div>
                        {cert.year && (
                          <span className="text-[10px] text-amber-300 font-mono">{cert.year}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. Talent DNA Visualizations & Evidence Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technical Competency Radar Chart */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Dna className="w-4 h-4 text-cyan-400" />
                    Technical Competency Radar
                  </h3>
                  <p className="text-xs text-slate-400">Multi-dimensional capability scoring</p>
                </div>
                <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                  AI Evaluated
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={dnaData?.competencies || []}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis stroke="#64748b" angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evidence-Based AI Verification Trail (Jump to Exact Page) */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-cyan-400" />
                    Evidence-Based AI Verification Trail
                  </h3>
                  <p className="text-xs text-slate-400">
                    Skill claims backed by extracted resume citations & page coordinates
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Grounded
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(candidate.evidence_citations || []).slice(0, 6).map((citation, idx) => (
                  <div
                    key={idx}
                    onClick={() => openResumeAtPage(citation.page_number || 1)}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-cyan-500/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        {citation.skill_or_claim}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-mono border border-cyan-500/30">
                        Page {citation.page_number || 1}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic font-mono line-clamp-2">
                      "{citation.evidence_quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Evidence Citation Modal */}
      <EvidenceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        candidate={candidate}
        citation={activeCitation}
      />

      {/* Modal 2: Full Screen In-App Resume Document Viewer Modal */}
      {candidate && (
        <ResumeViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          resumeId={candidate.resume_id || candidate.id}
          candidateName={candidate.full_name}
          filename={candidate.filename || `${candidate.full_name.replace(/\s+/g, '_')}_resume.pdf`}
          initialPage={viewerPage}
        />
      )}
    </div>
  );
}