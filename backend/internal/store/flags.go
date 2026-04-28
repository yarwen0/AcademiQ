package store

import (
	"context"
	"strings"
)

func (s *Store) CreateFlag(ctx context.Context, flagType, contentID, reportedBy, reason string) error {
	usesTargetColumns, err := s.flaggedContentUsesTargetColumns(ctx)
	if err != nil {
		return err
	}

	if usesTargetColumns {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO flagged_content (target_type, target_id, reported_by, reason)
			VALUES ($1, $2::uuid, $3::uuid, $4)
		`, flagType, contentID, reportedBy, reason)
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO flagged_content (id, type, content_id, reported_by, reason)
		VALUES ($1, $2, $3, $4, $5)
	`, newID(), flagType, contentID, reportedBy, reason)
	return err
}

func (s *Store) flaggedContentUsesTargetColumns(ctx context.Context) (bool, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'flagged_content'
	`)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	var hasTargetType bool
	for rows.Next() {
		var column string
		if err := rows.Scan(&column); err != nil {
			return false, err
		}
		if strings.EqualFold(column, "target_type") {
			hasTargetType = true
		}
	}
	if err := rows.Err(); err != nil {
		return false, err
	}

	return hasTargetType, nil
}
