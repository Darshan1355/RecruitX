import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Sparkles, Mail, Lock, LogIn, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign in. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoRecruiter = () => {
    setEmail('admin@recruitx.ai');
    setPassword('Admin@1234');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-navy-950">
      {/* Background neon glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-cyan-500/20 shadow-2xl relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-glow-cyan flex items-center justify-center">
            <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">RecruitX</h1>
          <p className="text-xs text-slate-400">Recruit Smarter. Hire Better.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Recruiter Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@enterprise.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Authenticating...' : 'Sign In to RecruitX'}
            <LogIn className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Login Quick Button */}
        <button
          type="button"
          onClick={fillDemoRecruiter}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-semibold border border-cyan-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span>Use Demo Lead Recruiter Account</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Don't have an enterprise account? </span>
          <Link to="/register" className="text-cyan-400 font-semibold hover:underline">
            Register Recruiter
          </Link>
        </div>
      </div>
    </div>
  );
}
