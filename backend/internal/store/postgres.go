package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var ErrNotFound = errors.New("not found")

type UserRecord struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
	University   string
	Role         string
	IsBanned     bool
	CreatedAt    time.Time
}

type ThreadRecord struct {
	ID           string
	Title        string
	Content      string
	AuthorID     string
	AuthorName   string
	Category     string
	Tags         []string
	Upvotes      int
	Downvotes    int
	CommentCount int
	Flair        *string
	IsLocked     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CommentRecord struct {
	ID         string
	ThreadID   string
	ParentID   *string
	AuthorID   string
	AuthorName string
	Content    string
	Upvotes    int
	Downvotes  int
	Depth      int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Store struct {
	db *sql.DB
}

func OpenPostgres(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('student','moderator','admin')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
		ALTER TABLE users ADD COLUMN IF NOT EXISTS university TEXT NOT NULL DEFAULT '';
		ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

		CREATE TABLE IF NOT EXISTS threads (
			id TEXT PRIMARY KEY,
			author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			category TEXT NOT NULL,
			tags JSONB NOT NULL DEFAULT '[]'::jsonb,
			upvotes INTEGER NOT NULL DEFAULT 0,
			downvotes INTEGER NOT NULL DEFAULT 0,
			flair TEXT NULL CHECK (flair IN ('answered','pinned') OR flair IS NULL),
			is_locked BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE threads ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS downvotes INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS flair TEXT NULL;
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
		ALTER TABLE threads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

		CREATE TABLE IF NOT EXISTS comments (
			id TEXT PRIMARY KEY,
			thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
			parent_id TEXT NULL REFERENCES comments(id) ON DELETE CASCADE,
			author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			content TEXT NOT NULL,
			upvotes INTEGER NOT NULL DEFAULT 0,
			downvotes INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE comments ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE comments ADD COLUMN IF NOT EXISTS downvotes INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

		ALTER TABLE flagged_content ADD COLUMN IF NOT EXISTS content_id TEXT NOT NULL DEFAULT '';
		ALTER TABLE flagged_content ADD COLUMN IF NOT EXISTS reported_by TEXT NOT NULL DEFAULT '';
		ALTER TABLE flagged_content ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
		ALTER TABLE flagged_content ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
	`)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		UPDATE threads t
		SET
			upvotes = COALESCE(v.upvotes, 0),
			downvotes = COALESCE(v.downvotes, 0),
			updated_at = NOW()
		FROM (
			SELECT
				thread_id,
				COUNT(*) FILTER (WHERE value = 1) AS upvotes,
				COUNT(*) FILTER (WHERE value = -1) AS downvotes
			FROM thread_votes
			GROUP BY thread_id
		) AS v
		WHERE t.id = v.thread_id
	`)
	return err
}

func (s *Store) SeedDemoUsers(ctx context.Context, studentPasswordHash, adminPasswordHash string) error {
	rows := []struct {
		email        string
		passwordHash string
		displayName  string
		university   string
		role         string
	}{
		{"student@academiq.local", studentPasswordHash, "Student Demo", "AcademiQ University", "student"},
		{"admin@academiq.local", adminPasswordHash, "Admin Demo", "AcademiQ University", "admin"},
	}

	for _, row := range rows {
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO users (id, email, password_hash, display_name, university, role)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (email) DO NOTHING
		`, newID(), row.email, row.passwordHash, row.displayName, row.university, row.role)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) CreateUser(ctx context.Context, email, passwordHash, displayName, university string) (UserRecord, error) {
	user := UserRecord{}
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO users (id, email, password_hash, display_name, university, role)
		VALUES ($1, $2, $3, $4, $5, 'student')
		RETURNING id, email, password_hash, display_name, university, role, is_banned, created_at
	`, newID(), strings.ToLower(strings.TrimSpace(email)), passwordHash, strings.TrimSpace(displayName), strings.TrimSpace(university)).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.University, &user.Role, &user.IsBanned, &user.CreatedAt)
	return user, err
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (UserRecord, error) {
	return s.getUser(ctx, `SELECT id, email, password_hash, display_name, university, role, is_banned, created_at FROM users WHERE email = $1`, strings.ToLower(strings.TrimSpace(email)))
}

func (s *Store) FindUserByID(ctx context.Context, id string) (UserRecord, error) {
	return s.getUser(ctx, `SELECT id, email, password_hash, display_name, university, role, is_banned, created_at FROM users WHERE id = $1`, id)
}

func (s *Store) UpdateDisplayName(ctx context.Context, userID, displayName string) (UserRecord, error) {
	user := UserRecord{}
	err := s.db.QueryRowContext(ctx, `
		UPDATE users
		SET display_name = $2
		WHERE id = $1
		RETURNING id, email, password_hash, display_name, university, role, is_banned, created_at
	`, userID, strings.TrimSpace(displayName)).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.University, &user.Role, &user.IsBanned, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return UserRecord{}, ErrNotFound
	}
	return user, err
}

func (s *Store) ListUsers(ctx context.Context, page, limit int) ([]UserRecord, int, error) {
	total, err := s.count(ctx, `SELECT COUNT(*) FROM users`)
	if err != nil {
		return nil, 0, err
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, email, password_hash, display_name, university, role, is_banned, created_at
		FROM users
		ORDER BY created_at ASC
		OFFSET $1 LIMIT $2
	`, offset(page, limit), limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []UserRecord
	for rows.Next() {
		var u UserRecord
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.University, &u.Role, &u.IsBanned, &u.CreatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (s *Store) SetUserRole(ctx context.Context, userID, role string) (UserRecord, error) {
	user := UserRecord{}
	err := s.db.QueryRowContext(ctx, `
		UPDATE users
		SET role = $2
		WHERE id = $1
		RETURNING id, email, password_hash, display_name, university, role, is_banned, created_at
	`, userID, role).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.University, &user.Role, &user.IsBanned, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return UserRecord{}, ErrNotFound
	}
	return user, err
}

func (s *Store) SetUserBanned(ctx context.Context, userID string, banned bool) (UserRecord, error) {
	user := UserRecord{}
	err := s.db.QueryRowContext(ctx, `
		UPDATE users
		SET is_banned = $2
		WHERE id = $1
		RETURNING id, email, password_hash, display_name, university, role, is_banned, created_at
	`, userID, banned).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.University, &user.Role, &user.IsBanned, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return UserRecord{}, ErrNotFound
	}
	return user, err
}

func (s *Store) ListThreads(ctx context.Context, sort, search, category string, page, limit int) ([]ThreadRecord, int, error) {
	where := []string{"1=1"}
	args := []any{}
	nextArg := 1

	if search != "" {
		where = append(where, fmt.Sprintf("(t.title ILIKE $%d OR t.content ILIKE $%d)", nextArg, nextArg))
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		nextArg++
	}
	if category != "" {
		where = append(where, fmt.Sprintf("t.category = $%d", nextArg))
		args = append(args, category)
		nextArg++
	}

	whereSQL := strings.Join(where, " AND ")
	total, err := s.count(ctx, "SELECT COUNT(*) FROM threads t WHERE "+whereSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "t.created_at DESC"
	switch sort {
	case "top":
		orderBy = "(t.upvotes - t.downvotes) DESC, t.created_at DESC"
	case "unanswered":
		orderBy = "comment_count ASC, t.created_at DESC"
	}

	args = append(args, offset(page, limit), limit)
	query := fmt.Sprintf(`
		SELECT
			t.id, t.title, t.content, t.author_id, u.display_name, t.category, t.tags,
			t.upvotes, t.downvotes,
			COALESCE(comment_counts.comment_count, 0) AS comment_count,
			t.flair, t.is_locked, t.created_at, t.updated_at
		FROM threads t
		JOIN users u ON u.id = t.author_id
		LEFT JOIN (
			SELECT thread_id, COUNT(*) AS comment_count
			FROM comments
			GROUP BY thread_id
		) AS comment_counts ON comment_counts.thread_id = t.id
		WHERE %s
		ORDER BY %s
		OFFSET $%d LIMIT $%d
	`, whereSQL, orderBy, nextArg, nextArg+1)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var threads []ThreadRecord
	for rows.Next() {
		thread, err := scanThread(rows)
		if err != nil {
			return nil, 0, err
		}
		threads = append(threads, thread)
	}
	return threads, total, rows.Err()
}

func (s *Store) GetThreadByID(ctx context.Context, id string) (ThreadRecord, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT
			t.id, t.title, t.content, t.author_id, u.display_name, t.category, t.tags,
			t.upvotes, t.downvotes,
			(SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.id) AS comment_count,
			t.flair, t.is_locked, t.created_at, t.updated_at
		FROM threads t
		JOIN users u ON u.id = t.author_id
		WHERE t.id = $1
	`, id)
	thread, err := scanThread(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ThreadRecord{}, ErrNotFound
	}
	return thread, err
}

func (s *Store) CreateThread(ctx context.Context, authorID, title, content, category string, tags []string) (ThreadRecord, error) {
	tagJSON, err := json.Marshal(tags)
	if err != nil {
		return ThreadRecord{}, err
	}

	threadID := newID()
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO threads (id, author_id, title, content, category, tags)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)
	`, threadID, authorID, strings.TrimSpace(title), content, category, string(tagJSON))
	if err != nil {
		return ThreadRecord{}, err
	}
	return s.GetThreadByID(ctx, threadID)
}

func (s *Store) DeleteThread(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM threads WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetThreadLock(ctx context.Context, id string, locked bool) (ThreadRecord, error) {
	res, err := s.db.ExecContext(ctx, `
		UPDATE threads SET is_locked = $2, updated_at = NOW() WHERE id = $1
	`, id, locked)
	if err != nil {
		return ThreadRecord{}, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return ThreadRecord{}, err
	}
	if affected == 0 {
		return ThreadRecord{}, ErrNotFound
	}
	return s.GetThreadByID(ctx, id)
}

func (s *Store) SetThreadFlair(ctx context.Context, id string, flair *string) (ThreadRecord, error) {
	res, err := s.db.ExecContext(ctx, `
		UPDATE threads SET flair = $2, updated_at = NOW() WHERE id = $1
	`, id, flair)
	if err != nil {
		return ThreadRecord{}, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return ThreadRecord{}, err
	}
	if affected == 0 {
		return ThreadRecord{}, ErrNotFound
	}
	return s.GetThreadByID(ctx, id)
}

func (s *Store) VoteThread(ctx context.Context, threadID, userID string, value int) (int, int, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	if value == 0 {
		if _, err := tx.ExecContext(ctx, `DELETE FROM thread_votes WHERE thread_id = $1 AND user_id = $2`, threadID, userID); err != nil {
			return 0, 0, err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO thread_votes (thread_id, user_id, value)
			VALUES ($1, $2, $3)
			ON CONFLICT (thread_id, user_id) DO UPDATE SET value = EXCLUDED.value
		`, threadID, userID, value); err != nil {
			return 0, 0, err
		}
	}

	var upvotes, downvotes int
	if err := tx.QueryRowContext(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE value = 1),
			COUNT(*) FILTER (WHERE value = -1)
		FROM thread_votes
		WHERE thread_id = $1
	`, threadID).Scan(&upvotes, &downvotes); err != nil {
		return 0, 0, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE threads SET upvotes = $2, downvotes = $3, updated_at = NOW() WHERE id = $1
	`, threadID, upvotes, downvotes); err != nil {
		return 0, 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	return upvotes, downvotes, nil
}

func (s *Store) ListCommentsByThread(ctx context.Context, threadID string) ([]CommentRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
		WITH RECURSIVE tree AS (
			SELECT c.id, c.thread_id, c.parent_id, c.author_id, u.display_name, c.content, c.upvotes, c.downvotes,
				   0 AS depth, c.created_at, c.updated_at
			FROM comments c
			JOIN users u ON u.id = c.author_id
			WHERE c.thread_id = $1 AND c.parent_id IS NULL
			UNION ALL
			SELECT c.id, c.thread_id, c.parent_id, c.author_id, u.display_name, c.content, c.upvotes, c.downvotes,
				   tree.depth + 1, c.created_at, c.updated_at
			FROM comments c
			JOIN users u ON u.id = c.author_id
			JOIN tree ON tree.id = c.parent_id
		)
		SELECT id, thread_id, parent_id, author_id, display_name, content, upvotes, downvotes, depth, created_at, updated_at
		FROM tree
		ORDER BY created_at ASC
	`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []CommentRecord
	for rows.Next() {
		var c CommentRecord
		var parentID sql.NullString
		if err := rows.Scan(&c.ID, &c.ThreadID, &parentID, &c.AuthorID, &c.AuthorName, &c.Content, &c.Upvotes, &c.Downvotes, &c.Depth, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		if parentID.Valid {
			c.ParentID = &parentID.String
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (s *Store) CreateComment(ctx context.Context, threadID string, parentID *string, authorID, content string) (CommentRecord, error) {
	commentID := newID()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO comments (id, thread_id, parent_id, author_id, content)
		VALUES ($1, $2, $3, $4, $5)
	`, commentID, threadID, parentID, authorID, content)
	if err != nil {
		return CommentRecord{}, err
	}
	return s.GetCommentByID(ctx, commentID)
}

func (s *Store) GetCommentByID(ctx context.Context, commentID string) (CommentRecord, error) {
	row := s.db.QueryRowContext(ctx, `
		WITH RECURSIVE parent_walk AS (
			SELECT id, thread_id, parent_id, author_id, content, upvotes, downvotes, created_at, updated_at, 0 AS depth
			FROM comments WHERE id = $1
			UNION ALL
			SELECT c.id, c.thread_id, c.parent_id, c.author_id, c.content, c.upvotes, c.downvotes, c.created_at, c.updated_at, parent_walk.depth + 1
			FROM comments c
			JOIN parent_walk ON parent_walk.parent_id = c.id
		)
		SELECT pw.id, pw.thread_id, pw.parent_id, pw.author_id, u.display_name, pw.content, pw.upvotes, pw.downvotes,
		       (SELECT MAX(depth) FROM parent_walk) AS depth, pw.created_at, pw.updated_at
		FROM parent_walk pw
		JOIN users u ON u.id = pw.author_id
		WHERE pw.id = $1
	`, commentID)

	var c CommentRecord
	var parentID sql.NullString
	err := row.Scan(&c.ID, &c.ThreadID, &parentID, &c.AuthorID, &c.AuthorName, &c.Content, &c.Upvotes, &c.Downvotes, &c.Depth, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return CommentRecord{}, ErrNotFound
	}
	if parentID.Valid {
		c.ParentID = &parentID.String
	}
	return c, err
}

func (s *Store) DeleteComment(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM comments WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) VoteComment(ctx context.Context, commentID, userID string, value int) (int, int, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	if value == 0 {
		if _, err := tx.ExecContext(ctx, `DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2`, commentID, userID); err != nil {
			return 0, 0, err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO comment_votes (comment_id, user_id, value)
			VALUES ($1, $2, $3)
			ON CONFLICT (comment_id, user_id) DO UPDATE SET value = EXCLUDED.value
		`, commentID, userID, value); err != nil {
			return 0, 0, err
		}
	}

	var upvotes, downvotes int
	if err := tx.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
		FROM comment_votes
		WHERE comment_id = $1
	`, commentID).Scan(&upvotes, &downvotes); err != nil {
		return 0, 0, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE comments
		SET upvotes = $2, downvotes = $3, updated_at = NOW()
		WHERE id = $1
	`, commentID, upvotes, downvotes); err != nil {
		return 0, 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	return upvotes, downvotes, nil
}

func (s *Store) ListFlags(ctx context.Context) ([]map[string]any, error) {
	usesTargetColumns, err := s.flaggedContentUsesTargetColumns(ctx)
	if err != nil {
		return nil, err
	}
	query := `
		SELECT id, type, content_id, reported_by, reason, created_at
		FROM flagged_content
		ORDER BY created_at DESC
	`
	if usesTargetColumns {
		query = `
			SELECT
				id::text,
				target_type,
				target_id::text,
				reported_by::text,
				reason,
				created_at
			FROM flagged_content
			ORDER BY created_at DESC
		`
	}

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flags []map[string]any
	for rows.Next() {
		var (
			id, flagType, contentID, reportedBy, reason string
			createdAt                                   time.Time
		)
		if err := rows.Scan(&id, &flagType, &contentID, &reportedBy, &reason, &createdAt); err != nil {
			return nil, err
		}
		flags = append(flags, map[string]any{
			"id":         id,
			"type":       flagType,
			"contentId":  contentID,
			"reportedBy": reportedBy,
			"reason":     reason,
			"createdAt":  createdAt,
		})
	}
	return flags, rows.Err()
}

func (s *Store) DeleteFlag(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM flagged_content WHERE id = $1`, id)
	return err
}

func (s *Store) getUser(ctx context.Context, query string, arg any) (UserRecord, error) {
	var user UserRecord
	err := s.db.QueryRowContext(ctx, query, arg).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.University, &user.Role, &user.IsBanned, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return UserRecord{}, ErrNotFound
	}
	return user, err
}

func (s *Store) count(ctx context.Context, query string, args ...any) (int, error) {
	var total int
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&total)
	return total, err
}

type threadScanner interface {
	Scan(dest ...any) error
}

func scanThread(scanner threadScanner) (ThreadRecord, error) {
	var (
		thread  ThreadRecord
		tagJSON []byte
		flair   sql.NullString
	)
	err := scanner.Scan(
		&thread.ID,
		&thread.Title,
		&thread.Content,
		&thread.AuthorID,
		&thread.AuthorName,
		&thread.Category,
		&tagJSON,
		&thread.Upvotes,
		&thread.Downvotes,
		&thread.CommentCount,
		&flair,
		&thread.IsLocked,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	if err != nil {
		return ThreadRecord{}, err
	}
	if flair.Valid {
		thread.Flair = &flair.String
	}
	if len(tagJSON) > 0 {
		if err := json.Unmarshal(tagJSON, &thread.Tags); err != nil {
			return ThreadRecord{}, err
		}
	}
	if thread.Tags == nil {
		thread.Tags = []string{}
	}
	return thread, nil
}

func offset(page, limit int) int {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	return (page - 1) * limit
}

func newID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}
