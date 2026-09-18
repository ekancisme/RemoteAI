import { Settings, Terminal, Zap } from 'lucide-react';
import type { GitHubUser } from '../services/githubApi';

interface HeaderProps {
  user: GitHubUser | null;
  onOpenSettings: () => void;
  runnerRepo: string;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenSettings, runnerRepo }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 safe-top">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: App Brand & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-base">RemoteAI</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                COMPUTE ON-DEMAND
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">
              Runner: <span className="text-slate-300 font-mono">{runnerRepo || 'Chưa chọn'}</span>
            </p>
          </div>
        </div>

        {/* Right: User Avatar & Settings Trigger */}
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-full py-1 px-2.5">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-5 h-5 rounded-full ring-1 ring-emerald-400/50"
              />
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user.login}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Chưa kết nối</span>
            </div>
          )}

          <button
            onClick={onOpenSettings}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Cài đặt GitHub Token & Runner"
            aria-label="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
