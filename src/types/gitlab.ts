export type GitLabMergeRequestEvent = {
  object_kind: "merge_request";
  object_attributes: {
    id: number;
    iid: number;
    action?: string;
    title?: string;
    url?: string;
    web_url?: string;
    created_at?: string;
    updated_at?: string;
  };
  project?: { id: number };
  project_id?: number;
};

export type GitLabNoteEvent = {
  object_kind: "note";
  object_attributes: {
    id: number;
    note: string;
    noteable_type: string;
    discussion_id?: string;
    created_at?: string;
  };
  merge_request?: {
    id: number;
    iid: number;
  };
  project?: { id: number };
  project_id?: number;
  user?: { id?: number; username?: string };
}; 