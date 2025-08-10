import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AppConfig } from "./config";

export type MergeRequestRow = {
  mr_id: number; // GitLab MR internal id
  project_id: number;
  iid: number; // MR IID (per-project)
  title?: string;
  web_url?: string;
  discussion_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FeedbackRow = {
  id?: number;
  mr_id: number;
  comment_id: number;
  author_id?: number | null;
  author_username?: string | null;
  submitted_at?: string | null;
  ratings_json: string; // JSON string
  comment_html?: string | null;
  comment_text?: string | null;
};

export class Db {
  private db: Database;

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS merge_requests (
        mr_id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL,
        iid INTEGER NOT NULL,
        title TEXT,
        web_url TEXT,
        discussion_id TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mr_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL,
        author_id INTEGER,
        author_username TEXT,
        submitted_at TEXT,
        ratings_json TEXT,
        comment_html TEXT,
        comment_text TEXT,
        FOREIGN KEY (mr_id) REFERENCES merge_requests(mr_id)
      );
    `);

    // Ensure deduplication by mr_id + comment_id
    this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_mr_comment
      ON feedback(mr_id, comment_id);
    `);
  }

  upsertMergeRequest(row: MergeRequestRow) {
    this.db.run(
      `INSERT INTO merge_requests (mr_id, project_id, iid, title, web_url, discussion_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, (SELECT discussion_id FROM merge_requests WHERE mr_id = ?)), ?, ?)
       ON CONFLICT(mr_id) DO UPDATE SET
         project_id = excluded.project_id,
         iid = excluded.iid,
         title = excluded.title,
         web_url = excluded.web_url,
         -- preserve existing discussion_id if already present
         discussion_id = COALESCE(merge_requests.discussion_id, excluded.discussion_id),
         created_at = COALESCE(merge_requests.created_at, excluded.created_at),
         updated_at = excluded.updated_at
      `,
      [
        row.mr_id,
        row.project_id,
        row.iid,
        row.title ?? null,
        row.web_url ?? null,
        row.discussion_id ?? null,
        row.mr_id,
        row.created_at ?? null,
        row.updated_at ?? null,
      ]
    );
  }

  setDiscussionId(mrId: number, discussionId: string) {
    this.db.run(
      `UPDATE merge_requests SET discussion_id = ? WHERE mr_id = ? AND (discussion_id IS NULL OR discussion_id = '')`,
      [discussionId, mrId]
    );
  }

  getMergeRequestById(mrId: number): MergeRequestRow | undefined {
    const row = this.db.query(
      `SELECT mr_id, project_id, iid, title, web_url, discussion_id, created_at, updated_at FROM merge_requests WHERE mr_id = ?`
    ).get(mrId) as MergeRequestRow | undefined;
    return row;
  }

  insertFeedbackIfNotExists(row: FeedbackRow) {
    this.db.run(
      `INSERT OR IGNORE INTO feedback (mr_id, comment_id, author_id, author_username, submitted_at, ratings_json, comment_html, comment_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.mr_id,
        row.comment_id,
        row.author_id ?? null,
        row.author_username ?? null,
        row.submitted_at ?? null,
        row.ratings_json,
        row.comment_html ?? null,
        row.comment_text ?? null,
      ]
    );
  }
}

export function initDb(config: AppConfig): Db {
  return new Db(config.dbPath);
} 