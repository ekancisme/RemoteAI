import { useState, useEffect } from 'react';
import {
  MessageSquare,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  GitMerge,
  RefreshCw,
} from 'lucide-react';
import { githubService, type GitHubIssue, type GitHubComment } from '../services/githubApi';

interface TaskFeedProps {
  issues: GitHubIssue[];
  token: string;
  targetRepo: string;
  onRefreshIssues: () => void;
  isLoadingIssues: boolean;
}

export const TaskFeed: React.FC<TaskFeedProps> = ({
  issues,
  token,
  targetRepo,
  onRefreshIssues,
  isLoadingIssues,
}) => {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, GitHubComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<number, boolean>>({});
  const [mergingPR, setMergingPR] = useState<Record<number, boolean>>({});
  const [mergeStatus, setMergeStatus] = useState<Record<number, string>>({});

  const [owner, repo] = targetRepo.split('/');

  // Toggle expand and fetch comments
  const handleToggleExpand = async (issueNumber: number) => {
    if (expandedIssue === issueNumber) {
      setExpandedIssue(null);
      return;
    }
    setExpandedIssue(issueNumber);
    fetchCommentsForIssue(issueNumber);
  };

  const fetchCommentsForIssue = async (issueNumber: number) => {
    if (!token || !owner || !repo) return;
    setLoadingComments((prev) => ({ ...prev, [issueNumber]: true }));
    try {
      const data = await githubService.getIssueComments(token, owner, repo, issueNumber);
      setComments((prev) => ({ ...prev, [issueNumber]: data }));
    } catch (err) {
      console.error(`Failed to load comments for issue #${issueNumber}:`, err);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [issueNumber]: false }));
    }
  };

  // Auto-refresh comments for the currently open issue if active
  useEffect(() => {
    if (!expandedIssue || !token || !owner || !repo) return;
    const interval = setInterval(() => {
      fetchCommentsForIssue(expandedIssue);
    }, 4000);
    return () => clearInterval(interval);
  }, [expandedIssue, token, owner, repo]);

  const handleSendReply = async (issueNumber: number) => {
    const text = replyText[issueNumber]?.trim();
    if (!text || !token || !owner || !repo) return;

    setSubmittingReply((prev) => ({ ...prev, [issueNumber]: true }));
    try {
      await githubService.postIssueComment(token, owner, repo, issueNumber, text);
      setReplyText((prev) => ({ ...prev, [issueNumber]: '' }));
      await fetchCommentsForIssue(issueNumber);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi khi gửi phản hồi: ${errMsg}`);
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [issueNumber]: false }));
    }
  };

  // Helper to extract PR URL and PR number from comment bodies
  const extractPRInfo = (commentList: GitHubComment[] = []) => {
    for (const c of commentList) {
      const match = c.body.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/i);
      if (match) {
        return {
          url: match[0].startsWith('http') ? match[0] : `https://${match[0]}`,
          number: parseInt(match[1], 10),
        };
      }
    }
    return null;
  };

  const handleMergePR = async (issueNumber: number, prNumber: number) => {
    if (!token || !owner || !repo) return;
    if (!confirm(`Bạn có chắc chắn muốn Squash & Merge Pull Request #${prNumber} không?`)) return;

    setMergingPR((prev) => ({ ...prev, [issueNumber]: true }));
    try {
      await githubService.mergePullRequest(token, owner, repo, prNumber);
      setMergeStatus((prev) => ({ ...prev, [issueNumber]: `✅ Đã Merge thành công PR #${prNumber}!` }));
      onRefreshIssues();
      fetchCommentsForIssue(issueNumber);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMergeStatus((prev) => ({ ...prev, [issueNumber]: `❌ Lỗi khi merge: ${errMsg}` }));
    } finally {
      setMergingPR((prev) => ({ ...prev, [issueNumber]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          Tiến Độ Tác Vụ & Hội Thoại (Live Feed)
        </h3>
        <button
          onClick={onRefreshIssues}
          disabled={isLoadingIssues}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingIssues ? 'animate-spin' : ''}`} />
          <span>Cập nhật</span>
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-300 font-medium">Chưa có tác vụ nào</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Hãy nhập yêu cầu hoặc bấm nút Mic ở trên để bắt đầu giao việc cho AGY Runner.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {issues.map((issue) => {
            const isExpanded = expandedIssue === issue.number;
            const issueComments = comments[issue.number] || [];
            const isLoadingThis = loadingComments[issue.number];
            const prInfo = extractPRInfo(issueComments);
            const isMerged = mergeStatus[issue.number]?.includes('thành công') || issue.state === 'closed';

            return (
              <div
                key={issue.number}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md hover:border-slate-700"
              >
                {/* Issue Header / Summary Bar */}
                <div
                  onClick={() => handleToggleExpand(issue.number)}
                  className="p-3.5 cursor-pointer flex items-start justify-between gap-2 select-none"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        #{issue.number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        issue.state === 'closed'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : prInfo
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {issue.state === 'closed' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> ĐÃ HOÀN THÀNH
                          </>
                        ) : prInfo ? (
                          <>
                            <GitPullRequest className="w-3 h-3" /> PR SẴN SÀNG
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 animate-spin" /> ĐANG THỰC HIỆN
                          </>
                        )}
                      </span>
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>

                    <h4 className="text-xs font-semibold text-white truncate pt-0.5">
                      {issue.title.replace('[RemoteAI] ', '')}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                      {issue.body}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 text-slate-400">
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:text-white transition"
                      title="Mở trên GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details: Comments & Actions */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3">
                    {/* PR Delivery Card if created */}
                    {prInfo && (
                      <div className="p-3 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <GitPullRequest className="w-4 h-4" />
                            <span>Pull Request #{prInfo.number} đã sẵn sàng</span>
                          </div>
                          <a
                            href={prInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-400 underline font-mono flex items-center gap-1 hover:text-emerald-300"
                          >
                            Xem Diff ↗
                          </a>
                        </div>

                        {isMerged ? (
                          <div className="text-xs font-semibold p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{mergeStatus[issue.number] || `PR #${prInfo.number} đã được hợp nhất thành công!`}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMergePR(issue.number, prInfo.number)}
                            disabled={mergingPR[issue.number]}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-98 disabled:opacity-50"
                          >
                            {mergingPR[issue.number] ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang Merge PR...</span>
                              </>
                            ) : (
                              <>
                                <GitMerge className="w-3.5 h-3.5" />
                                <span>1-Tap Squash & Merge PR Trực Tiếp Từ Điện Thoại</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Comments Timeline */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Nhật ký thực thi & Phản hồi ({issueComments.length})</span>
                        {isLoadingThis && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
                      </div>

                      {issueComments.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl">
                          Đang chờ runner kết nối và gửi cập nhật...
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {issueComments.map((comment) => (
                            <div
                              key={comment.id}
                              className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <img
                                    src={comment.user.avatar_url}
                                    alt={comment.user.login}
                                    className="w-3.5 h-3.5 rounded-full"
                                  />
                                  <span className="text-slate-300 font-mono">{comment.user.login}</span>
                                </div>
                                <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="text-slate-300 text-xs whitespace-pre-wrap font-sans break-words pt-1">
                                {comment.body}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Follow-up reply box */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyText[issue.number] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [issue.number]: e.target.value }))
                          }
                          placeholder="Nhập yêu cầu bổ sung cho task này..."
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendReply(issue.number);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(issue.number)}
                          disabled={submittingReply[issue.number] || !replyText[issue.number]?.trim()}
                          className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 rounded-xl transition shrink-0"
                          title="Gửi phản hồi"
                        >
                          {submittingReply[issue.number] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
