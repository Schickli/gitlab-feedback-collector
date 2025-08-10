import type { AppConfig } from "../config";
import type { Db } from "../db";
import { logger } from "../logger";
import { parseFeedback } from "../parser";
import { GitLabClient } from "../gitlabClient";

const ACK_TEXT = "Thanks for the feedback! ✅";

function isBotAuthor(config: AppConfig, authorId?: number, authorUsername?: string): boolean {
  if (config.botUserId && authorId && config.botUserId === authorId) return true;
  if (config.botUsername && authorUsername && config.botUsername.toLowerCase() === authorUsername.toLowerCase()) return true;
  return false;
}

export async function handleNote(payload: any, config: AppConfig, db: Db, gitlab: GitLabClient) {
  if (!payload || payload.object_kind !== "note") return;
  const attrs = payload.object_attributes || {};
  if (attrs.noteable_type !== "MergeRequest") return;

  const mr = payload.merge_request || {};
  const mrId: number = Number(mr.id);
  const projectId: number = Number(payload.project?.id ?? payload.project_id);
  const iid: number = Number(mr.iid);
  const discussionId: string | undefined = attrs.discussion_id ? String(attrs.discussion_id) : undefined;

  const mrRow = db.getMergeRequestById(mrId);
  if (!mrRow || !mrRow.discussion_id) {
    return;
  }
  if (!discussionId || discussionId !== mrRow.discussion_id) {
    return;
  }

  const commentId: number = Number(attrs.id);
  const authorId: number | undefined = payload.user?.id ? Number(payload.user.id) : undefined;
  const authorUsername: string | undefined = payload.user?.username;
  const noteBody: string = String(attrs.note ?? "");

  // Ignore bot-authored notes and our own acknowledgements
  if (isBotAuthor(config, authorId, authorUsername)) {
    logger.info("Ignoring bot-authored note", { mrId, commentId, authorId, authorUsername });
    return;
  }

  if (noteBody.trim() === ACK_TEXT) {
    logger.info("Ignoring ack note", { mrId, commentId });
    return;
  }

  if(noteBody.trim().includes("Feedback request 💬")){
    logger.info("Ignoring feedback request note", { mrId, commentId });
    return;
  }

  const submittedAt: string | undefined = attrs.created_at || new Date().toISOString();

  const result = parseFeedback(noteBody, config.categories);
  if (!result.hasAny) {
    logger.info("Ignoring note without ratings or text", { mrId, commentId });
    return;
  }

  const ratingsJson = JSON.stringify(result.ratings);
  db.insertFeedbackIfNotExists({
    mr_id: mrId,
    comment_id: commentId,
    author_id: authorId ?? null,
    author_username: authorUsername ?? null,
    submitted_at: submittedAt,
    ratings_json: ratingsJson,
    comment_html: noteBody,
    comment_text: result.commentText,
  });

  logger.info("Stored feedback", { mrId, commentId });

  if (config.createAckReply) {
    try {
      await gitlab.postDiscussionNote(projectId, iid, mrRow.discussion_id!, ACK_TEXT);
    } catch (err) {
      logger.warn("Failed to post ack reply", { error: (err as Error).message });
    }
  }
} 