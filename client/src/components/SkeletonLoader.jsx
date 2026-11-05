import React from 'react';

export function SkeletonCard() {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-3 bg-slate-800/60 rounded w-1/3"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-800/80 rounded"></div>
        <div className="h-3 bg-slate-800/60 rounded w-5/6"></div>
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-5 bg-slate-800 rounded w-14"></div>
        <div className="h-5 bg-slate-800 rounded w-16"></div>
        <div className="h-5 bg-slate-800 rounded w-12"></div>
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-slate-800/50 rounded-xl w-full"></div>
      ))}
    </div>
  );
}
