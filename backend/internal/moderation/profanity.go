package moderation

import (
	"regexp"
	"strings"
)

var profanityPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\bfuck(?:ing|ed|er|ers)?\b`),
	regexp.MustCompile(`\bshit(?:ty|ting|ted|s)?\b`),
	regexp.MustCompile(`\bbitch(?:es|y)?\b`),
	regexp.MustCompile(`\basshole(?:s)?\b`),
	regexp.MustCompile(`\bdamn\b`),
}

func DetectFlagReason(parts ...string) string {
	normalized := normalize(parts...)
	if normalized == "" {
		return ""
	}

	for _, pattern := range profanityPatterns {
		if pattern.MatchString(normalized) {
			return "Auto-flagged for possible abusive language."
		}
	}

	return ""
}

func normalize(parts ...string) string {
	var merged strings.Builder
	for _, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}
		if merged.Len() > 0 {
			merged.WriteByte(' ')
		}
		merged.WriteString(strings.ToLower(part))
	}

	if merged.Len() == 0 {
		return ""
	}

	var cleaned strings.Builder
	cleaned.Grow(merged.Len())
	lastWasSpace := false

	for _, r := range merged.String() {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			cleaned.WriteRune(r)
			lastWasSpace = false
			continue
		}
		if !lastWasSpace {
			cleaned.WriteByte(' ')
			lastWasSpace = true
		}
	}

	return strings.TrimSpace(cleaned.String())
}
