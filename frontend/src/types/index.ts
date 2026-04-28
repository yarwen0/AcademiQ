// ============================================================
// AcademiQ — Central TypeScript Type Definitions
// ============================================================

// ---- Roles ----
// A01 Broken Access Control: roles are the single source of truth for
// all permission checks. Never infer permissions from other fields.
export type Role = 'student' | 'moderator' | 'admin';

// ---- User ----
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  university: string;
  createdAt: string; // ISO 8601
  isBanned: boolean;
}

// ---- Auth ----
// A02 Crypto: access token lives in memory only (never serialised to storage).
// Only a minimal subset of user data is kept in client context.
export interface AuthPayload {
  accessToken: string; // JWT RS256 access token — in-memory ref only
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  university: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ---- Thread ----
export type ThreadFlair = 'answered' | 'locked' | 'pinned' | null;

export interface Thread {
  id: string;
  title: string;
  content: string; // raw HTML/markdown from backend — MUST be sanitized before render
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  commentCount: number;
  flair: ThreadFlair;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadRequest {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

// ---- Comment / Post ----
export interface Comment {
  id: string;
  threadId: string;
  parentId: string | null; // null = top-level comment
  authorId: string;
  authorName: string;
  content: string; // raw — MUST be sanitized before render
  upvotes: number;
  downvotes: number;
  depth: number; // 0 = top-level, max rendered depth = 3
  children: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  threadId: string;
  parentId: string | null;
  content: string;
}

// ---- Vote ----
export type VoteValue = 1 | -1 | 0;

export interface VoteRequest {
  targetId: string;
  targetType: 'thread' | 'comment';
  value: VoteValue;
}

// ---- Admin ----
export interface FlaggedContent {
  id: string;
  type: 'thread' | 'comment';
  contentId: string;
  reportedBy: string;
  reason: string;
  createdAt: string;
}

// ---- Pagination ----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---- API Error ----
export interface ApiError {
  message: string;
  code?: string;
  field?: string; // for field-level validation errors returned by backend
}

// ---- Draft (sql.js local storage) ----
export interface Draft {
  key: string;       // e.g. "thread-new" | "reply-{commentId}"
  content: string;
  savedAt: number;   // Unix ms timestamp
}

// ---- Sort/Filter ----
export type SortOption = 'latest' | 'top' | 'unanswered';
