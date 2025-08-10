# GitLab Feedback Collector

Backend service that:

- Receives GitLab webhooks
- On MR approval, posts a discussion requesting quick 1–10 ratings per category
- Parses replies and stores feedback in SQLite (no raw webhook payloads)

## Quick start

1. Copy env

```bash
cp .env.example .env
# Fill in GITLAB_BASE_URL, GITLAB_TOKEN, GITLAB_WEBHOOK_SECRET
```

2. Run

```bash
bun run dev
```

Health check: GET /health
Webhook endpoint: POST /webhooks/gitlab

## Configure GitLab Webhook

- URL: https://your-domain/webhooks/gitlab
- Secret Token: set to `GITLAB_WEBHOOK_SECRET`
- Events: Merge request events, Comments (note) events

## Development

- Tests: `bun test`
- DB: SQLite file at `DB_PATH` (default `./data/app.db`)
- Use ngrok or the `ports` extension from vscode to expose the server to the internet (you have to update the webhook URL in GitLab)

## Notes

- Stores only parsed fields + original comment HTML/text
- Ratings scale 1–10, categories configurable via `FEEDBACK_CATEGORIES` 