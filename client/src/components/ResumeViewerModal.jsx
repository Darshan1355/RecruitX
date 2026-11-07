import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  ExternalLink,
  RotateCcw,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function ResumeViewerModal({ 
  isOpen = true, 
  onClose, 
  resumeId, 
  candidateName, 
  filename, 
  initialPage = 1 
}) {
  if (isOpen === false || !resumeId) return null;

  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const token = localStorage.getItem('recruitx_token') || localStorage.getItem('talentiq_token') || '';
  const isDocx = filename && (filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc'));

  useEffect(() => {
    setCurrentPage(initialPage || 1);
    setZoomLevel(100);
    setLoading(true);
    setLoadError(null);
  }, [resumeId, initialPage]);

  // Construct authenticated file streaming URL
  const fileUrl = `/api/resumes/${resumeId}/file?token=${encodeURIComponent(token)}${isDocx ? '' : `#page=${currentPage}`}`;
  const downloadUrl = `/api/resumes/${resumeId}/download?token=${encodeURIComponent(token)}`;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(180, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(60, prev - 15));
  const handleResetZoom = () => setZoomLevel(100);
  const handleFitToWidth = () => setZoomLevel(120);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200 ${isFullScreen ? 'p-0' : ''}`}>
      <div className={`relative w-full ${isFullScreen ? 'h-full max-w-none rounded-none' : 'max-w-5xl h-[88vh] rounded-3xl'} glass-panel border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}>
        
        {/* Top Control Bar */}
        <div className="h-14 border-b border-slate-800 bg-navy-900/90 px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {candidateName || 'Original Resume Document'}
              </h4>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {filename || (isDocx ? 'document.docx' : 'document.pdf')} {isDocx ? '(Converted DOCX View)' : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Page Navigation (for PDFs) */}
            {!isDocx && (
              <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-800 text-xs text-slate-300">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-semibold px-1 whitespace-nowrap">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-800 text-xs text-slate-300">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-semibold px-1 w-10 text-center">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-0.5 text-[10px] font-semibold px-1.5"
                title="Reset Zoom to 100%"
              >
                100%
              </button>
              <button
                onClick={handleFitToWidth}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-[10px] font-semibold px-1.5"
                title="Fit to Width"
              >
                Fit
              </button>
            </div>

            {/* Download Button */}
            <a
              href={downloadUrl}
              download
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Download Original Resume File"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullScreen(prev => !prev)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors ml-1"
              title="Close Resume Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Display Canvas */}
        <div className="flex-1 bg-slate-950/70 p-2 sm:p-4 overflow-auto flex items-center justify-center relative">
          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-950/75 z-10">
              <div className="flex items-center gap-3 text-xs text-cyan-300 font-semibold bg-slate-900/90 px-5 py-3 rounded-2xl border border-cyan-500/30 shadow-2xl">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Rendering verified document stream...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {loadError ? (
            <div className="max-w-md p-6 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-center space-y-3 z-10 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Document Viewing Error</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{loadError}</p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setLoading(true);
                    setLoadError(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <a
                  href={downloadUrl}
                  download
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full flex justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <iframe
                src={fileUrl}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setLoadError("Failed to render resume document stream. Please verify network or download the file.");
                }}
                className="w-full h-full rounded-xl border border-slate-800 bg-white shadow-2xl"
                title="Candidate Resume Preview"
              />
            </div>
          )}
        </div>

        {/* Footer Info Strip */}
        <div className="h-8 border-t border-slate-800/80 bg-navy-900/80 px-4 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Document Source: {filename || 'resume.pdf'}</span>
            {!isDocx && <span className="text-slate-500">· Page {currentPage}</span>}
          </div>
          <span className="text-cyan-400 font-medium">Protected by JWT User-Scoped Authorization</span>
        </div>
      </div>
    </div>
  );
}
