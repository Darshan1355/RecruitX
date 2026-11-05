import React, { useState, useEffect, useRef } from 'react';
import { resumesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import ResumeViewerModal from '../components/ResumeViewerModal';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  ShieldAlert,
  ArrowRight,
  Eye
} from 'lucide-react';

export default function ResumeUpload() {
  const { showSuccess, showError, showInfo } = useToast();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressList, setUploadProgressList] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeResumeViewer, setActiveResumeViewer] = useState(null);

  // Deletion modal state
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await resumesApi.getResumes();
      setResumes(res.data.resumes || []);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    showInfo(`Initiated processing for ${files.length} resume(s)...`);
    const progressItems = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      status: 'Extracting information & embeddings...'
    }));
    setUploadProgressList(progressItems);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('resumes', file);
    });

    try {
      const res = await resumesApi.uploadResumes(formData);
      showSuccess(`Successfully processed and indexed ${res.data.results?.length || files.length} resume(s)!`);
      fetchResumes();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to upload resumes.');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgressList([]);
      }, 3500);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const confirmDelete = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    try {
      await resumesApi.deleteResume(resumeToDelete.id);
      showSuccess(`Permanently deleted resume "${resumeToDelete.filename}" and its vector embeddings.`);
      setResumes(prev => prev.filter(r => r.id !== resumeToDelete.id));
      setResumeToDelete(null);
    } catch (err) {
      showError('Failed to delete resume: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredResumes = resumes.filter(r => {
    const q = searchFilter.toLowerCase();
    return (
      r.filename?.toLowerCase().includes(q) ||
      r.candidate_name?.toLowerCase().includes(q) ||
      r.skills?.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase mb-2">
          Module 2: Bulk Resume Intelligence
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Resume Intelligence & Ingestion Hub
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload multi-page PDF or DOCX resumes. TalentIQ automatically extracts candidate DNA, builds semantic embeddings, and syncs vector databases.
        </p>
      </div>

      {/* Drag and Drop Upload Card */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="glass-panel-interactive rounded-3xl p-6 sm:p-10 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 cursor-pointer text-center relative overflow-hidden group shadow-glow-cyan"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4 pointer-events-none">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Drag & Drop Resumes Here, or <span className="text-cyan-400 underline">Browse Files</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports bulk PDF and DOCX files up to 15MB each
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] text-slate-400 pt-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700">✓ SHA-256 Deduplication</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700">✓ 768-dim Embeddings</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700">✓ Page-level Citations</span>
          </div>
        </div>
      </div>

      {/* Active Processing Pipeline Tracker */}
      {uploadProgressList.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              Processing Pipeline Active
            </span>
            <span className="text-cyan-400 font-bold">{uploadProgressList.length} Files</span>
          </div>

          <div className="space-y-2">
            {uploadProgressList.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">{item.name}</span>
                  <span className="text-[11px] text-slate-400">({item.size})</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resume Records Table */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Indexed Resumes Repository
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredResumes.length} total
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Manage documents, inspect parsed candidate data, or permanently remove records.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name, filename, skills..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading repository records...
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No matching resume records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800 bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Candidate & File</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Extracted Skills</th>
                  <th className="py-3 px-4">Size & Pages</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">
                            {resume.candidate_name || 'Candidate'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                            {resume.filename}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {resume.years_of_experience || 3}+ years
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(resume.skills || []).slice(0, 4).map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700/60"
                          >
                            {s}
                          </span>
                        ))}
                        {(resume.skills || []).length > 4 && (
                          <span className="text-[10px] text-slate-500 font-semibold self-center">
                            +{(resume.skills || []).length - 4}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {resume.file_size_kb || 130} KB · {resume.page_count || 2} pgs
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Indexed
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveResumeViewer({ id: resume.id, name: resume.candidate_name || resume.filename })}
                          title="Preview Document"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={`/api/resumes/${resume.id}/download`}
                          download
                          title="Download PDF"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => setResumeToDelete(resume)}
                          title="Permanently Delete"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permanent Deletion Confirmation Modal */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanent Deletion</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white font-mono">"{resumeToDelete.filename}"</span>?
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="text-rose-400 font-semibold mb-1">Permanently deletes:</p>
              <p>• Original PDF/DOCX file from persistent storage</p>
              <p>• SQL candidate and profile records</p>
              <p>• Evidence citations and page mappings</p>
              <p>• 768-dimensional ChromaDB vector embeddings</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
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
