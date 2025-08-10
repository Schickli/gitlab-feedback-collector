export type AppConfig = {
  gitlabBaseUrl: string;
  gitlabToken: string;
  webhookSecret: string;
  categories: string[];
  botUsername?: string;
  botUserId?: number;
  createAckReply: boolean;
  allowedProjects?: number[];
  dbPath: string;
  port: number;
};

function parseCategories(value: string | undefined): string[] {
  if (!value || value.trim() === "") {
    return ["Clarity", "Timeliness", "CI_Quality", "Review_Helpfulness"];
  }
  const trimmed = value.trim();
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || trimmed.includes("\"")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr.map((s) => String(s));
      }
    } catch {
      // fallthrough to CSV parsing
    }
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseAllowedProjects(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function loadConfig(): AppConfig {
  const gitlabBaseUrl = Bun.env.GITLAB_BASE_URL?.trim() ?? "";
  const gitlabToken = Bun.env.GITLAB_TOKEN?.trim() ?? "";
  const webhookSecret = Bun.env.GITLAB_WEBHOOK_SECRET?.trim() ?? "";
  const categories = parseCategories(Bun.env.FEEDBACK_CATEGORIES);
  const botUsername = Bun.env.BOT_USERNAME?.trim() || undefined;
  const botUserId = parseOptionalNumber(Bun.env.BOT_USER_ID);
  const createAckReply = (Bun.env.CREATE_ACK_REPLY ?? "true").toLowerCase() === "true";
  const allowedProjects = parseAllowedProjects(Bun.env.ALLOWED_PROJECTS);
  const dbPath = Bun.env.DB_PATH?.trim() || "./data/app.db";
  const port = Number(Bun.env.PORT ?? 3000);

  if (!gitlabBaseUrl || !gitlabToken || !webhookSecret) {
    // These are required to actually handle webhooks and call GitLab
  }

  return {
    gitlabBaseUrl,
    gitlabToken,
    webhookSecret,
    categories,
    botUsername,
    botUserId,
    createAckReply,
    allowedProjects,
    dbPath,
    port,
  };
} 