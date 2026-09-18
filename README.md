# RemoteAI — Serverless Mobile Coding Platform

Biến điện thoại của bạn thành trạm điều khiển cho các AI coding agent. Ra lệnh bằng
giọng nói hoặc văn bản → GitHub Actions cấp phát runner → AGY (Gemini) hoặc Claude
Code tự viết code → tạo Pull Request → bạn merge ngay trên điện thoại.

## Kiến trúc

```
┌─────────────────┐  dispatch   ┌──────────────────────┐   clone    ┌─────────────┐
│  RemoteAI Web   │ ──────────▶ │ GitHub Actions       │ ─────────▶ │ Target repo │
│  (GitHub Pages) │  workflow   │ runner (ubuntu-latest)│            │ workspace   │
└─────────────────┘             │  • agy (Gemini CLI)  │            └──────┬──────┘
        ▲                       │  • claude (CC CLI)   │   push + PR       │
        │ issue comments        └──────────┬───────────┘ ◀─────────────────┘
        └──────────────────────────────────┘
```

- **Frontend**: React + Vite + Tailwind, deploy GitHub Pages (`deploy.yml`).
- **Runner**: `.github/workflows/agent-task.yml` — nhận `workflow_dispatch`, cài agent,
  clone repo mục tiêu, chạy prompt, commit + tạo PR, báo tiến độ qua issue comment.
- **Hội thoại**: issue đóng vai trò "task", comments là live feed (poll 4s trong app).
  Comment follow-up trên issue có label `remote-agent` sẽ chạy tiếp agent trên cùng branch.

## Setup (một lần)

### 1. GitHub Secrets trên runner repo (Settings → Secrets and variables → Actions)

| Secret | Bắt buộc | Dùng cho |
|---|---|---|
| `GH_PAT` | ✅ | Token quyền `repo` + `workflow` để clone/push/tạo PR repo khác |
| `GEMINI_API_KEY` | ✅ cho engine AGY | https://aistudio.google.com/apikey (free tier ~1000 req/ngày) |
| `ANTHROPIC_API_KEY` | ✅ cho engine Claude | https://console.anthropic.com/settings/keys |

### 2. Labels

App tự tạo labels khi gửi task (`ensureTaskLabels`). Nếu muốn tạo tay trên repo mục tiêu:
`remote-agent`, `engine:agy`, `engine:claude`.

### 3. GitHub Token trong app

Mở app → icon ⚙️ → dán PAT (quyền `repo`, `workflow`). Token chỉ lưu trong
`localStorage` trên thiết bị của bạn, không gửi đi đâu ngoài GitHub API.

### 4. Deploy frontend

```bash
npm install
npm run dev        # dev tại http://localhost:3000
npm run build      # build production vào dist/
git push origin main   # deploy.yml tự build + deploy GitHub Pages
```

> ⚠️ Web Speech API (mic) chỉ hoạt động trên **HTTPS** — dùng URL GitHub Pages, không dùng HTTP LAN.

## Luồng sử dụng

1. Mở app, chọn repo mục tiêu + branch, chọn engine (AGY/Claude).
2. Nói hoặc gõ yêu cầu → **Gửi Tác Vụ**.
3. App tạo issue `[RemoteAI] ...` và dispatch workflow.
4. Runner post tiến độ vào issue (xem live trong app).
5. Agent xong → PR link xuất hiện → bấm **1-Tap Squash & Merge**.

## Bảo mật

- Prompt được truyền qua biến môi trường trong workflow, không nội suy trực tiếp
  vào shell (chống command injection).
- Comment-trigger chỉ nhận từ `OWNER/MEMBER/COLLABORATOR` — repo public nhưng
  người lạ comment không chạy được agent (mỗi lần chạy tốn API credit của bạn).
- `concurrency` group theo issue number chống chạy trùng task.

## Ghi chú kỹ thuật

- Engine **agy**: cài từ `https://antigravity.google/cli/install.sh`, chạy
  `agy -p "<prompt>" --yolo --skip-trust`; nếu fail tự fallback sang
  `@google/gemini-cli` (`gemini -p ... --yolo --skip-trust`).
- Engine **claude**: `npm i -g @anthropic-ai/claude-code`, chạy
  `claude -p "<prompt>" --dangerously-skip-permissions`.
- Runner cài dependencies của repo mục tiêu (`npm ci`) trước khi verify build/test.