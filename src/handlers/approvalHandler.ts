import type { AppConfig } from "../config";
import type { Db } from "../db";
import { logger } from "../logger";
import { GitLabClient } from "../gitlabClient";

function buildDiscussionBody(categories: string[]): string {
  const header = [
    "### Feedback request 💬 — quick ratings 1–10 + optional comment",
    "",
    "Please reply to this thread with short ratings for these categories (1 = poor, 10 = excellent), followed by any optional text.",
    `[More info about the feedback request](${process.env.WHY_FEEDBACK_REQUEST})`,
  ].join("\n");

  const exampleLines = categories.map((c, i) => {
    const suggested = i === categories.length - 1 ? 10 : Math.min(i + 8, 10);
    return `${c}: ${suggested}`;
  });

  const exampleBlock = [
    "Example reply:",
    "",
    "```text",
    ...exampleLines,
    "",
    "Optional comment:",
    "The PR description could be clearer about the breaking change.",
    "```",
  ].join("\n");

  return [header, "", exampleBlock].join("\n");
}

export async function handleMergeRequestApproval(payload: any, config: AppConfig, db: Db, gitlab: GitLabClient) {
  if (!payload || payload.object_kind !== "merge_request") return;

  const attributes = payload.object_attributes || {};
  const action: string | undefined = attributes.action;

  const isApprovedAction = action === "approved";
  if (!isApprovedAction) {
    return;
  }

  const mrId: number = Number(payload.object_attributes.id);
  const projectId: number = Number(payload.project?.id ?? payload.project_id);
  const iid: number = Number(payload.object_attributes.iid);
  const title: string | undefined = payload.object_attributes.title;
  const webUrl: string | undefined = payload.object_attributes.url ?? payload.object_attributes.web_url ?? payload.object_attributes.http_url;
  const createdAt: string | undefined = payload.object_attributes.created_at;
  const updatedAt: string | undefined = payload.object_attributes.updated_at;

  db.upsertMergeRequest({
    mr_id: mrId,
    project_id: projectId,
    iid,
    title,
    web_url: webUrl,
    created_at: createdAt,
    updated_at: updatedAt,
  });

  const existing = db.getMergeRequestById(mrId);
  if (existing?.discussion_id) {
    logger.info("Discussion already exists for MR; skipping create", { mrId, discussion_id: existing.discussion_id });
    return;
  }

  const body = buildDiscussionBody(config.categories);
  const { discussion_id } = await gitlab.createMergeRequestDiscussion(projectId, iid, body);
  db.setDiscussionId(mrId, discussion_id);
  logger.info("Created discussion for MR", { mrId, projectId, iid, discussion_id });
} 