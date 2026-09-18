import { useState } from 'react';
import { X, Key, Save, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  runnerRepo: string;
  onSave: (token: string, runnerRepo: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  token: initialToken,
  runnerRepo: initialRunnerRepo,
  onSave,
}) => {
  const [token, setToken] = useState(initialToken);
  const [runnerRepo, setRunnerRepo] = useState(initialRunnerRepo);
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(token.trim(), runnerRepo.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Cài Đặt Hệ Thống</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* GitHub Personal Access Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              GitHub Personal Access Token (PAT)
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Yêu cầu quyền: <code className="text-emerald-400">repo</code>, <code className="text-emerald-400">workflow</code>. Lưu an toàn trực tiếp trên điện thoại của bạn.
            </p>
          </div>

          {/* Central Runner Repository */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Repository Chứa Workflow (Runner Repo)
            </label>
            <div className="relative">
              <input
                type="text"
                value={runnerRepo}
                onChange={(e) => setRunnerRepo(e.target.value)}
                placeholder="owner/repo (vd: ekancisme/RemoteAI)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Repo này chứa file <code className="text-slate-300">.github/workflows/agent-task.yml</code> để chạy GitHub Actions.
            </p>
          </div>

          {/* Setup Guide Info Card */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1.5 text-slate-400">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>GitHub Secrets cần cấu hình trên Runner Repo:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-300">
              <li><strong className="text-emerald-400">GH_PAT:</strong> Token GitHub có quyền push</li>
              <li><strong className="text-emerald-400">GEMINI_API_KEY:</strong> API Key cho Antigravity CLI (AGY)</li>
              <li><strong className="text-indigo-400">ANTHROPIC_API_KEY:</strong> API Key cho Claude Code (tùy chọn)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
