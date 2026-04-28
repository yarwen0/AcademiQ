CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  university TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','moderator','admin')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  upvotes INTEGER NOT NULL DEFAULT 0,
  flair TEXT NULL CHECK (flair IN ('answered','pinned') OR flair IS NULL),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_id TEXT NULL REFERENCES comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_votes (
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS flagged_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('thread','comment')),
  content_id TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
