export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  html_url: string;
  labels: { name: string; color: string }[];
}

export interface GitHubComment {
  id: number;
  body: string;
  created_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  head: { ref: string };
  base: { ref: string };
  mergeable: boolean | null;
}

const GITHUB_API_BASE = 'https://api.github.com';

async function githubFetch<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.message || res.statusText;
    } catch {
      // Ignore json parse error
    }
    throw new Error(`GitHub API [${res.status}]: ${errorDetail}`);
  }

  // Handle 204 No Content (e.g. for workflow dispatch)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const githubService = {
  // Validate token and get user profile
  async getCurrentUser(token: string): Promise<GitHubUser> {
    return githubFetch<GitHubUser>('/user', token);
  },

  // List all repositories owned by user
  async listRepos(token: string): Promise<GitHubRepo[]> {
    return githubFetch<GitHubRepo[]>('/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator', token);
  },

  // List branches of a repository
  async listBranches(token: string, owner: string, repo: string): Promise<{ name: string }[]> {
    return githubFetch<{ name: string }[]>(`/repos/${owner}/${repo}/branches?per_page=30`, token);
  },

  // Fetch repo metadata (used to resolve the default branch of the runner repo)
  async getRepo(token: string, owner: string, repo: string): Promise<{ default_branch: string }> {
    return githubFetch<{ default_branch: string }>(`/repos/${owner}/${repo}`, token);
  },

  // Ensure RemoteAI labels exist on the target repo — GitHub rejects issue
  // creation with unknown labels (422), so create them up-front. Idempotent.
  async ensureTaskLabels(token: string, owner: string, repo: string): Promise<void> {
    const required = [
      { name: 'remote-agent', color: '10b981', description: 'Managed by RemoteAI agent runner' },
      { name: 'engine:agy', color: '06b6d4', description: 'RemoteAI engine: AGY (Gemini)' },
      { name: 'engine:claude', color: '6366f1', description: 'RemoteAI engine: Claude Code' },
    ];
    for (const label of required) {
      try {
        await githubFetch(`/repos/${owner}/${repo}/labels`, token, {
          method: 'POST',
          body: JSON.stringify(label),
        });
      } catch {
        // 422 = label already exists; any other failure is non-fatal here
      }
    }
  },

  // Create an Issue that represents a coding task
  async createTaskIssue(
    token: string,
    owner: string,
    repo: string,
    title: string,
    prompt: string,
    agentType: 'agy' | 'claude'
  ): Promise<GitHubIssue> {
    return githubFetch<GitHubIssue>(`/repos/${owner}/${repo}/issues`, token, {
      method: 'POST',
      body: JSON.stringify({
        title: `[RemoteAI] ${title}`,
        body: prompt,
        labels: ['remote-agent', `engine:${agentType}`],
      }),
    });
  },

  // List remote-agent issues
  async listTaskIssues(token: string, owner: string, repo: string): Promise<GitHubIssue[]> {
    return githubFetch<GitHubIssue[]>(`/repos/${owner}/${repo}/issues?labels=remote-agent&state=all&sort=created&direction=desc&per_page=20`, token);
  },

  // Get comments on an issue (acts as conversation logs)
  async getIssueComments(token: string, owner: string, repo: string, issueNumber: number): Promise<GitHubComment[]> {
    return githubFetch<GitHubComment[]>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=50`, token);
  },

  // Post a follow-up comment to an issue
  async postIssueComment(token: string, owner: string, repo: string, issueNumber: number, body: string): Promise<GitHubComment> {
    return githubFetch<GitHubComment>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  // Dispatch the GitHub Actions runner workflow
  async dispatchWorkflow(
    token: string,
    runnerRepo: string, // e.g. "ekancisme/RemoteAI" or "ekancisme/cuongplaylist"
    ref: string, // Branch containing agent-task.yml (runner repo default branch)
    inputs: {
      target_repo: string;
      prompt: string;
      issue_number?: string;
      agent_type: string;
      base_branch: string;
      branch_name?: string;
    }
  ): Promise<void> {
    const [owner, repo] = runnerRepo.split('/');
    if (!owner || !repo) throw new Error(`Invalid runner repo format: ${runnerRepo}. Expected owner/repo`);

    await githubFetch<void>(
      `/repos/${owner}/${repo}/actions/workflows/agent-task.yml/dispatches`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          ref,
          inputs,
        }),
      }
    );
  },

  // List PRs created for an issue branch
  async listPullRequests(token: string, owner: string, repo: string, head?: string): Promise<GitHubPR[]> {
    const query = head ? `?head=${encodeURIComponent(head)}&state=all` : '?state=all&per_page=10';
    return githubFetch<GitHubPR[]>(`/repos/${owner}/${repo}/pulls${query}`, token);
  },

  // 1-Tap Merge Pull Request
  async mergePullRequest(token: string, owner: string, repo: string, pullNumber: number): Promise<{ merged: boolean; message: string }> {
    return githubFetch<{ merged: boolean; message: string }>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          commit_title: `Merge RemoteAI PR #${pullNumber}`,
          merge_method: 'squash',
        }),
      }
    );
  },
};
