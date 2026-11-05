import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { 
  Search, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  CheckCheck, 
  Trash2, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  User
} from 'lucide-react';

export default function Navbar({ onSearchClick, onToggleMobileSidebar, isMobileSidebarOpen }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      // Quiet fail if network interrupted
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/all/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-navy-900/75 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Hamburger button (mobile) + Search input */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors"
          title={isMobileSidebarOpen ? "Close Navigation" : "Open Navigation"}
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Search Bar pill */}
        <div 
          onClick={onSearchClick}
          className="w-full sm:w-80 md:w-96 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-cyan-500/40 cursor-pointer transition-all duration-150 text-xs sm:text-sm shadow-inner"
        >
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="flex-1 truncate">Search candidates, skills, roles...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-800 rounded border border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Status Pill (desktop) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>ChromaDB Vector Core Active</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsNotifOpen(prev => !prev)}
            title="Notification Center"
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[9px] font-extrabold text-white flex items-center justify-center shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl border border-cyan-500/30 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Notification Center
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read all</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Notification Items List */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    No recent notifications.
                  </p>
                ) : (
                  notifications.map((n) => {
                    const isSuccess = n.type === 'success';
                    const isWarning = n.type === 'warning';

                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                          n.is_read
                            ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                            : 'bg-slate-900/90 border-cyan-500/30 text-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isSuccess && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                          {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                          {!isSuccess && !isWarning && <Info className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[11px] text-slate-100">{n.title}</p>
                          <p className="text-[11px] leading-relaxed text-slate-300 mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-glow-cyan flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
              {user?.name || 'Recruiter'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
              {user?.email || 'Lead Recruiter'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
