import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { RepoSelector } from './components/RepoSelector';
import { AgentPicker } from './components/AgentPicker';
import { VoicePromptBar } from './components/VoicePromptBar';
import { TaskFeed } from './components/TaskFeed';
import { githubService, type GitHubUser, type GitHubRepo, type GitHubIssue } from './services/githubApi';
import { AlertCircle, CheckCircle } from 'lucide-react';

const DEFAULT_RUNNER_REPO = 'ekancisme/RemoteAI';

export function App() {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('remoteai_gh_token') || '';
  });

  const [runnerRepo, setRunnerRepo] = useState<string>(() => {
    return localStorage.getItem('remoteai_runner_repo') || DEFAULT_RUNNER_REPO;
  });

  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [selectedAgent, setSelectedAgent] = useState<'agy' | 'claude'>('agy');
  const [issues, setIssues] = useState<GitHubIssue[]>([]);

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load user profile & repos
  const loadUserAndRepos = useCallback(async () => {
    if (!token) {
      setUser(null);
      setRepos([]);
      return;
    }

    setIsLoadingRepos(true);
    try {
      const userData = await githubService.getCurrentUser(token);
      setUser(userData);

      const repoList = await githubService.listRepos(token);
      setRepos(repoList);

      if (repoList.length > 0 && !selectedRepo) {
        // Default to cuongplaylist if exists, or first repo
        const defaultRepo = repoList.find((r) => r.name === 'cuongplaylist') || repoList[0];
        setSelectedRepo(defaultRepo);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Lỗi kết nối GitHub: ${errMsg}`, 'error');
    } finally {
      setIsLoadingRepos(false);
    }
  }, [token, selectedRepo]);

  // Load branches when selectedRepo changes
  const loadBranches = useCallback(async () => {
    if (!token || !selectedRepo) return;
    const [owner, repo] = selectedRepo.full_name.split('/');
    try {
      const branchList = await githubService.listBranches(token, owner, repo);
      const branchNames = branchList.map((b) => b.name);
      setBranches(branchNames);
      if (branchNames.includes(selectedRepo.default_branch)) {
        setSelectedBranch(selectedRepo.default_branch);
      } else if (branchNames.length > 0) {
        setSelectedBranch(branchNames[0]);
      }
    } catch (err) {
      console.warn('Could not fetch branches:', err);
      setBranches([selectedRepo.default_branch || 'main']);
      setSelectedBranch(selectedRepo.default_branch || 'main');
    }
  }, [token, selectedRepo]);

  // Load task issues when selectedRepo changes
  const loadIssues = useCallback(async () => {
    if (!token || !selectedRepo) return;
    const [owner, repo] = selectedRepo.full_name.split('/');
    setIsLoadingIssues(true);
    try {
      const issueList = await githubService.listTaskIssues(token, owner, repo);
      setIssues(issueList);
    } catch (err) {
      console.warn('Could not fetch issues:', err);
    } finally {
      setIsLoadingIssues(false);
    }
  }, [token, selectedRepo]);

  useEffect(() => {
    loadUserAndRepos();
  }, [loadUserAndRepos]);

  useEffect(() => {
    if (selectedRepo) {
      loadBranches();
      loadIssues();
    }
  }, [selectedRepo, loadBranches, loadIssues]);

  // Handle task submission from voice or text
  const handleCreateTask = async (prompt: string) => {
    if (!token) {
      setIsSettingsOpen(true);
      showNotification('Vui lòng cấu hình GitHub Personal Access Token trước!', 'error');
      return;
    }

    if (!selectedRepo) {
      showNotification('Vui lòng chọn repository mục tiêu!', 'error');
      return;
    }

    setIsSubmittingTask(true);
    const [owner, repo] = selectedRepo.full_name.split('/');

    try {
      // 0. Ensure RemoteAI labels exist (GitHub rejects unknown labels with 422)
      await githubService.ensureTaskLabels(token, owner, repo);

      // 1. Create tracking issue in the target repository
      const titleSummary = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt;
      const issue = await githubService.createTaskIssue(
        token,
        owner,
        repo,
        titleSummary,
        prompt,
        selectedAgent
      );

      showNotification(`Đã tạo Task #${issue.number}! Đang khởi động GitHub Actions Runner...`);

      // 2. Dispatch GitHub Actions workflow on the runner repo's default branch
      const [runnerOwner, runnerRepoName] = runnerRepo.split('/');
      const runnerInfo = await githubService.getRepo(token, runnerOwner, runnerRepoName);

      await githubService.dispatchWorkflow(token, runnerRepo, runnerInfo.default_branch, {
        target_repo: selectedRepo.full_name,
        prompt,
        issue_number: issue.number.toString(),
        agent_type: selectedAgent,
        base_branch: selectedBranch,
        branch_name: `agent/task-${issue.number}`,
      });

      showNotification(`🚀 Runner đã được cấp phát! AGY/Claude đang bắt đầu code...`);
      // Refresh issues list
      setTimeout(loadIssues, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Lỗi khởi tạo tác vụ: ${errMsg}`, 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleSaveSettings = (newToken: string, newRunnerRepo: string) => {
    setToken(newToken);
    setRunnerRepo(newRunnerRepo);
    localStorage.setItem('remoteai_gh_token', newToken);
    localStorage.setItem('remoteai_runner_repo', newRunnerRepo);
    showNotification('Đã cập nhật cài đặt thành công!');
    setTimeout(loadUserAndRepos, 300);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        runnerRepo={runnerRepo}
      />

      {/* Main Mobile App Canvas */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4 pb-20 safe-bottom">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border animate-in fade-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
          </div>
        )}

        {/* Step 1: Target Workspace Picker */}
        <RepoSelector
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={setSelectedRepo}
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          isLoading={isLoadingRepos}
          onRefresh={loadUserAndRepos}
        />

        {/* Step 2: Agent Engine Selection */}
        <AgentPicker
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />

        {/* Step 3: Voice & Prompt Command Deck */}
        <VoicePromptBar
          onSubmit={handleCreateTask}
          isSubmitting={isSubmittingTask}
          disabled={!selectedRepo}
        />

        {/* Step 4: Active Task Feed, Live Comments & 1-Tap PR Merge */}
        {selectedRepo && (
          <TaskFeed
            issues={issues}
            token={token}
            targetRepo={selectedRepo.full_name}
            onRefreshIssues={loadIssues}
            isLoadingIssues={isLoadingIssues}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        token={token}
        runnerRepo={runnerRepo}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
