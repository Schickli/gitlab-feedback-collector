import type { AppConfig } from "./config";
import { retry } from "./retry";

export class GitLabClient {
  private readonly baseApi: string;
  private readonly token: string;

  constructor(config: AppConfig) {
    this.baseApi = `${config.gitlabBaseUrl.replace(/\/$/, "")}/api/v4`;
    this.token = config.gitlabToken;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseApi}${path}`;
    return retry(async () => {
      const res = await fetch(url, {
        ...init,
        headers: {
          "PRIVATE-TOKEN": this.token,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      if (!res.ok) {
        // Retry on 5xx
        if (res.status >= 500) {
          throw new Error(`GitLab API ${res.status}`);
        }
      }
      return res;
    });
  }

  async createMergeRequestDiscussion(projectId: number, mrIid: number, body: string): Promise<{ discussion_id: string }> {
    const res = await this.request(`/projects/${projectId}/merge_requests/${mrIid}/discussions`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create discussion: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { id: string };
    // API returns an object with id (discussion id)
    return { discussion_id: String((json as any).id) };
  }

  async postDiscussionNote(projectId: number, mrIid: number, discussionId: string, body: string): Promise<void> {
    const res = await this.request(
      `/projects/${projectId}/merge_requests/${mrIid}/discussions/${encodeURIComponent(discussionId)}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to post discussion note: ${res.status} ${text}`);
    }
  }
} 