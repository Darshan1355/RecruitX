import React, { useState, useEffect } from 'react';
import { candidatesApi, interviewApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { 
  Mic, 
  Sparkles, 
  Save, 
  Printer, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  User, 
  Briefcase, 
  BookOpen,
  Award,
  ChevronDown,
  Copy,
  Check,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Code
} from 'lucide-react';

export default function InterviewStudio() {
  const { showSuccess, showError, showInfo } = useToast();
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedCandId, setSelectedCandId] = useState('');
  const [jobRole, setJobRole] = useState('Senior Full-Stack Engineer');
  const [interviewType, setInterviewType] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [questionCount, setQuestionCount] = useState(6);

  const [generatedInterview, setGeneratedInterview] = useState(null);
  const [savedInterviews, setSavedInterviews] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTierFilter, setActiveTierFilter] = useState('All');

  // Edit question state
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editedText, setEditedText] = useState('');

  // Delete modal state
  const [interviewToDelete, setInterviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [candRes, intRes] = await Promise.all([
        candidatesApi.getCandidates(),
        interviewApi.getInterviews()
      ]);
      const cList = candRes.data.candidates || [];
      setCandidatesList(cList);
      if (cList.length > 0) {
        setSelectedCandId(cList[0].id);
      }
      setSavedInterviews(intRes.data.interviews || []);
    } catch (err) {
      console.error('Failed to load initial studio data:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCandId || !jobRole.trim()) {
      showError('Please select a candidate and enter a target job role');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await interviewApi.generate({
        candidate_id: selectedCandId,
        job_role: jobRole.trim(),
        interview_type: interviewType,
        difficulty: difficulty,
        count: questionCount
      });
      setGeneratedInterview(res.data);
      showSuccess(`Generated ${res.data.questions?.length || 0} questions tailored to ${res.data.candidate_name}!`);
      
      // Refresh saved interviews list
      const intRes = await interviewApi.getInterviews();
      setSavedInterviews(intRes.data.interviews || []);
    } catch (err) {
      console.error('Failed to generate interview:', err);
      showError('Failed to generate interview questions: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditedQuestion = async (qId) => {
    if (!generatedInterview) return;
    const updatedQuestions = generatedInterview.questions.map(q =>
      q.id === qId ? { ...q, question: editedText } : q
    );
    setGeneratedInterview({ ...generatedInterview, questions: updatedQuestions });
    setEditingQuestionId(null);

    if (generatedInterview.id) {
      try {
        await interviewApi.update(generatedInterview.id, updatedQuestions);
        showSuccess('Question updated successfully');
      } catch (err) {
        console.error('Failed to persist edit:', err);
        showError('Failed to save question edit');
      }
    }
  };

  const handleCopyQuestion = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showInfo('Question copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectPastInterview = (session) => {
    setGeneratedInterview({
      id: session.id,
      candidate_id: session.candidate_id,
      candidate_name: session.candidate_name,
      job_role: session.job_role,
      interview_type: session.interview_type,
      difficulty: session.difficulty,
      questions: session.questions
    });
    showInfo(`Loaded interview guide for ${session.candidate_name}`);
  };

  const confirmDeleteInterview = async () => {
    if (!interviewToDelete) return;
    setIsDeleting(true);
    try {
      await interviewApi.delete(interviewToDelete.id);
      showSuccess(`Interview guide for ${interviewToDelete.candidate_name} deleted successfully.`);
      
      // Immediately remove from UI list
      setSavedInterviews(prev => prev.filter(item => item.id !== interviewToDelete.id));
      
      // If currently displaying this interview, reset it
      if (generatedInterview && generatedInterview.id === interviewToDelete.id) {
        setGeneratedInterview(null);
      }
      setInterviewToDelete(null);
    } catch (err) {
      console.error('Failed to delete interview:', err);
      showError('Failed to delete interview guide: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedInterview?.id) {
      showError('Please generate or select an interview guide first.');
      return;
    }
    const pdfUrl = interviewApi.getPdfUrl(generatedInterview.id);
    // Open or trigger download
    window.open(pdfUrl, '_blank');
  };

  // Filter questions based on difficulty tier tabs
  const allQuestions = generatedInterview?.questions || [];
  const tierFilters = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Project-based'];

  const displayedQuestions = allQuestions.filter(q => {
    if (activeTierFilter === 'All') return true;
    if (activeTierFilter === 'Beginner') return (q.difficulty || '').toLowerCase() === 'beginner';
    if (activeTierFilter === 'Intermediate') return (q.difficulty || '').toLowerCase() === 'intermediate';
    if (activeTierFilter === 'Advanced') return (q.difficulty || '').toLowerCase() === 'advanced';
    if (activeTierFilter === 'Project-based') {
      return (q.category && q.category.toLowerCase().includes('project')) ||
             (q.skill_tested && q.skill_tested.toLowerCase().includes('project')) ||
             (q.question && q.question.toLowerCase().includes('project'));
    }
    return true;
  });

  const getDifficultyBadge = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'beginner') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (d === 'advanced') {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase mb-2">
          Module 6: Intelligent AI Interview Studio & Guide Generator
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          AI Interview Question Studio & Rubric
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Craft personalized technical, architectural, and behavioral interview guides grounded in candidate projects, with 3 difficulty tiers (Beginner, Intermediate, Advanced) and official ReportLab PDF export.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Controls & Past Guides List */}
        <div className="space-y-6">
          {/* Interview Configuration Panel */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 border border-cyan-500/20 shadow-glow-cyan">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Interview Configuration
            </h3>

            {/* Candidate Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Target Candidate:
              </label>
              <select
                value={selectedCandId}
                onChange={(e) => setSelectedCandId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
              >
                {candidatesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.years_of_experience || 0}+ yrs)
                  </option>
                ))}
              </select>
            </div>

            {/* Job Role Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" /> Target Job Role:
              </label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Senior Java Backend Developer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Interview Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Primary Focus:
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
              >
                <option value="Technical">Technical Deep Dive</option>
                <option value="Project-based">Project Architecture & Hands-on</option>
                <option value="HR">HR & Cultural Alignment</option>
                <option value="System Design">System Design & Scalability</option>
              </select>
            </div>

            {/* Target Difficulty Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Default Tier Level:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      difficulty === lvl
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Number of Questions:</span>
                <span className="text-cyan-400 font-mono">{questionCount}</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Synthesizing Multi-Tier Rubric...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Multi-Tier Interview</span>
                </>
              )}
            </button>
          </div>

          {/* Saved Past Interview Guides List (With Delete Option) */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Previous Guides ({savedInterviews.length})
              </h4>
              <span className="text-[10px] text-slate-500">Persistent PDF Storage</span>
            </div>

            {savedInterviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No previous guides generated.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {savedInterviews.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 group ${
                      generatedInterview?.id === item.id
                        ? 'bg-cyan-500/10 border-cyan-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => handleSelectPastInterview(item)}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <p className="font-bold text-slate-200 truncate">{item.candidate_name}</p>
                      <p className="text-[11px] text-cyan-400 truncate">{item.job_role}</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {new Date(item.created_at).toLocaleDateString()} · {item.questions?.length || 0} Qs
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Delete Guide Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInterviewToDelete(item);
                        }}
                        title="Delete this interview guide"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Generated Questions & Multi-Tier Rubric */}
        <div className="lg:col-span-2 space-y-6">
          {!generatedInterview ? (
            <div className="glass-panel rounded-2xl p-12 sm:p-16 text-center text-slate-400 space-y-3 border border-slate-800">
              <Mic className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-slate-300">No Interview Guide Selected</h3>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Configure candidate and target role on the left, then click <strong>Generate Multi-Tier Interview</strong> to receive profile-grounded questions across Beginner, Intermediate, and Advanced tiers.
              </p>
            </div>
          ) : (
            <div className="space-y-5 print:p-0">
              {/* Studio Header Bar */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-cyan-500/20">
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {generatedInterview.candidate_name} — {generatedInterview.job_role}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="text-cyan-400 font-semibold">{generatedInterview.interview_type}</span>
                    <span>·</span>
                    <span className="text-purple-400 font-semibold">{generatedInterview.difficulty} Tier</span>
                    <span>·</span>
                    <span>{allQuestions.length} Questions</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Official PDF Download Button */}
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-glow-cyan transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Difficulty Tier Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 flex items-center gap-1 pl-1">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" /> Tier:
                </span>
                {tierFilters.map(tier => {
                  const count = tier === 'All' 
                    ? allQuestions.length 
                    : allQuestions.filter(q => (q.difficulty || '').toLowerCase() === tier.toLowerCase()).length;

                  return (
                    <button
                      key={tier}
                      onClick={() => setActiveTierFilter(tier)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        activeTierFilter === tier
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span>{tier}</span>
                      {tier !== 'Project-based' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {displayedQuestions.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-800">
                    No questions in the "{activeTierFilter}" category. Switch to "All" to view all generated questions.
                  </div>
                ) : (
                  displayedQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-800 hover:border-cyan-500/30 transition-all"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>

                          {/* Difficulty Tier Badge */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono ${getDifficultyBadge(q.difficulty)}`}>
                            {q.difficulty || 'Intermediate'} Tier
                          </span>

                          {/* Skill / Project Tested */}
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            Tested: {q.skill_tested || 'Core Engineering'}
                          </span>

                          {q.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {q.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyQuestion(q.question, q.id || idx)}
                            title="Copy question text"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                          >
                            {copiedId === (q.id || idx) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingQuestionId(q.id);
                              setEditedText(q.question);
                            }}
                            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      {editingQuestionId === q.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-xs text-white focus:outline-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingQuestionId(null)}
                              className="px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditedQuestion(q.id)}
                              className="px-3 py-1 rounded-lg text-xs bg-cyan-600 text-white font-bold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                          {q.question}
                        </p>
                      )}

                      {/* Reason for asking (candidate relevance callout) */}
                      {q.reason_for_asking && (
                        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-cyan-300 block text-[11px] mb-0.5">Rationale:</span>
                            <span>{q.reason_for_asking}</span>
                          </div>
                        </div>
                      )}

                      {/* Expected Key Answer Points */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Expected Key Answer Points:
                        </span>
                        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                          {(q.expected_answer_points || []).map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Evaluation Rubric */}
                      <div className="p-3 rounded-xl bg-navy-950/60 border-l-2 border-purple-500 text-xs text-slate-300">
                        <span className="font-bold text-purple-300 block mb-0.5">Evaluation Rubric:</span>
                        {q.evaluation_rubric}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Delete Interview Guide */}
      {interviewToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-2xl max-w-md w-full p-6 space-y-4 border border-rose-500/30 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Interview Guide</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the interview guide for{' '}
              <strong className="text-white">{interviewToDelete.candidate_name}</strong> ({interviewToDelete.job_role})?
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <p className="text-slate-300 font-semibold">Important:</p>
              <p className="text-emerald-400">• Candidate profile and resume will NOT be deleted.</p>
              <p className="text-emerald-400">• Candidate vector embeddings remain intact.</p>
              <p className="text-rose-400">• Only this interview question guide & PDF file will be removed.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setInterviewToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteInterview}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}