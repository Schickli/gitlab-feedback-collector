import { loadConfig } from "./config";
import { initDb } from "./db";
import { logger } from "./logger";
import { GitLabClient } from "./gitlabClient";
import { handleMergeRequestApproval } from "./handlers/approvalHandler";
import { handleNote } from "./handlers/noteHandler";

const config = loadConfig();
const db = initDb(config);
const gitlab = new GitLabClient(config);

if (!config.gitlabBaseUrl || !config.gitlabToken || !config.webhookSecret) {
  logger.warn("Missing required env (GITLAB_BASE_URL, GITLAB_TOKEN, GITLAB_WEBHOOK_SECRET). Webhook handling may fail.");
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return json(401, { error: "unauthorized" });
}

function methodNotAllowed() {
  return json(405, { error: "method not allowed" });
}

function tooLarge() {
  return json(413, { error: "payload too large" });
}

function isProjectAllowed(payload: any): boolean {
  if (!config.allowedProjects || config.allowedProjects.length === 0) return true;
  const projectId: number | undefined = Number(payload?.project?.id ?? payload?.project_id ?? NaN);
  if (!Number.isFinite(projectId)) return false;
  return config.allowedProjects.includes(projectId);
}

const MAX_BODY_BYTES = 512 * 1024; // 512KB

Bun.serve({
  port: config.port,
  fetch: async (req: Request) => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(200, { ok: true });
    }

    if (url.pathname === "/webhooks/gitlab") {
      if (req.method !== "POST") return methodNotAllowed();

      const token = req.headers.get("X-Gitlab-Token");
      if (!token || token !== config.webhookSecret) {
        return unauthorized();
      }

      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > MAX_BODY_BYTES) return tooLarge();

      let payload: any;
      try {
        payload = await req.json();
      } catch {
        return json(400, { error: "invalid json" });
      }

      if (!isProjectAllowed(payload)) {
        logger.info("Ignoring webhook from non-allowed project", { project_id: payload?.project?.id ?? payload?.project_id });
        return json(200, { ok: true });
      }

      const event = req.headers.get("X-Gitlab-Event") || payload.object_kind;
      try {
        // Route to handlers
        if (event?.toLowerCase().includes("merge") && payload.object_kind === "merge_request") {
          await handleMergeRequestApproval(payload, config, db, gitlab);
        } else if (payload.object_kind === "note") {
          await handleNote(payload, config, db, gitlab);
        }
        return json(200, { ok: true });
      } catch (err) {
        logger.error("Webhook handler error", { error: (err as Error).message });
        // Return 500 to allow GitLab to retry
        return json(500, { error: "internal error" });
      }
    }

    return json(404, { error: "not found" });
  },
});

logger.info(`Server listening on :${config.port}`); 