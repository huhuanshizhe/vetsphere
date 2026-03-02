'use client';

import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  loading: boolean;
  error: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5 backdrop-blur-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            管理员邮箱
          </label>
          <input
            type="email"
            required
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            密码
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
            autoComplete="current-password"
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        {loading ? '验证中...' : '安全登录'}
      </button>
    </form>
  );
};

export default LoginForm;
