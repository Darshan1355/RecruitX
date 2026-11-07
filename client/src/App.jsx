import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import TalentDNA from './pages/TalentDNA';
import Shortlist from './pages/Shortlist';
import Copilot from './pages/Copilot';
import Comparison from './pages/Comparison';
import InterviewStudio from './pages/InterviewStudio';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Authenticating RecruitX Workspace...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100">
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar 
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resumes" element={<ResumeUpload />} />
            <Route path="/shortlist" element={<Shortlist />} />
            <Route path="/candidates" element={<TalentDNA />} />
            <Route path="/candidates/:id" element={<TalentDNA />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/compare" element={<Comparison />} />
            <Route path="/interviews" element={<InterviewStudio />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
