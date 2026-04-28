-- Authentication and account-security lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Thread feeds and retrieval
CREATE INDEX IF NOT EXISTS idx_threads_created_at_desc ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_category_created_at_desc ON threads(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author_created_at_desc ON threads(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_flair_created_at_desc ON threads(flair, created_at DESC) WHERE flair IS NOT NULL;

-- Full-text search index for title + content
CREATE INDEX IF NOT EXISTS idx_threads_search_tsv ON threads
USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Tags and comments
CREATE INDEX IF NOT EXISTS idx_thread_tags_tag ON thread_tags(tag);
CREATE INDEX IF NOT EXISTS idx_comments_thread_created_at ON comments(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author_created_at_desc ON comments(author_id, created_at DESC);

-- Vote aggregations and anti-abuse checks
CREATE INDEX IF NOT EXISTS idx_thread_votes_user_id ON thread_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);
