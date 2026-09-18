import { FolderGit2, GitBranch, RefreshCw } from 'lucide-react';
import type { GitHubRepo } from '../services/githubApi';

interface RepoSelectorProps {
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  onSelectRepo: (repo: GitHubRepo) => void;
  branches: string[];
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  repos,
  selectedRepo,
  onSelectRepo,
  branches,
  selectedBranch,
  onSelectBranch,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="uppercase tracking-wider flex items-center gap-1.5">
          <FolderGit2 className="w-4 h-4 text-emerald-400" />
          Mục tiêu lập trình (Target Workspace)
        </span>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 text-[11px] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Repo Dropdown */}
        <div className="relative">
          <select
            value={selectedRepo?.full_name || ''}
            onChange={(e) => {
              const found = repos.find((r) => r.full_name === e.target.value);
              if (found) onSelectRepo(found);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-emerald-500 font-mono pr-8"
          >
            {repos.length === 0 ? (
              <option value="">(Chưa tải được danh sách repo)</option>
            ) : (
              repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.private ? '🔒 ' : '🌐 '} {repo.name}
                </option>
              ))
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        </div>

        {/* Branch Dropdown */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white appearance-none focus:outline-none focus:border-emerald-500 font-mono"
          >
            {branches.length === 0 ? (
              <option value={selectedRepo?.default_branch || 'main'}>
                {selectedRepo?.default_branch || 'main'}
              </option>
            ) : (
              branches.map((b) => (
                <option key={b} value={b}>
                  branch: {b}
                </option>
              ))
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        </div>
      </div>

      {selectedRepo && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
          <span className="truncate max-w-[250px]">
            {selectedRepo.description || 'Không có mô tả dự án'}
          </span>
          <a
            href={`https://github.com/${selectedRepo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400/80 hover:text-emerald-300 underline font-mono ml-2 shrink-0"
          >
            GitHub ↗
          </a>
        </div>
      )}
    </div>
  );
};
