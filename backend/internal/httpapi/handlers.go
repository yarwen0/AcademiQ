package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"academiq/backend/internal/auth"
	"academiq/backend/internal/middleware"
	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

const refreshCookieName = "academiq_refresh_token"

type apiError struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
	Field   string `json:"field,omitempty"`
}

type authPayload struct {
	AccessToken string       `json:"accessToken"`
	User        frontendUser `json:"user"`
}

type frontendUser struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	University  string    `json:"university"`
	Role        string    `json:"role"`
	IsBanned    bool      `json:"isBanned"`
	CreatedAt   time.Time `json:"createdAt"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	DisplayName     string `json:"displayName"`
	University      string `json:"university"`
}

type createThreadRequest struct {
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
}

type flairRequest struct {
	Flair *string `json:"flair"`
}

type voteRequest struct {
	Value int `json:"value"`
}

type createCommentRequest struct {
	ThreadID string  `json:"threadId"`
	ParentID *string `json:"parentId"`
	Content  string  `json:"content"`
}

type updateProfileRequest struct {
	DisplayName string `json:"displayName"`
}

type setRoleRequest struct {
	Role string `json:"role"`
}

type paginatedResponse[T any] struct {
	Data  []T `json:"data"`
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

type threadResponse struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	AuthorID     string    `json:"authorId"`
	AuthorName   string    `json:"authorName"`
	Category     string    `json:"category"`
	Tags         []string  `json:"tags"`
	Upvotes      int       `json:"upvotes"`
	CommentCount int       `json:"commentCount"`
	Flair        *string   `json:"flair"`
	IsLocked     bool      `json:"isLocked"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type commentResponse struct {
	ID         string            `json:"id"`
	ThreadID   string            `json:"threadId"`
	ParentID   *string           `json:"parentId"`
	AuthorID   string            `json:"authorId"`
	AuthorName string            `json:"authorName"`
	Content    string            `json:"content"`
	Upvotes    int               `json:"upvotes"`
	Downvotes  int               `json:"downvotes"`
	Depth      int               `json:"depth"`
	Children   []commentResponse `json:"children"`
	CreatedAt  time.Time         `json:"createdAt"`
	UpdatedAt  time.Time         `json:"updatedAt"`
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" || strings.TrimSpace(req.DisplayName) == "" || strings.TrimSpace(req.University) == "" {
		writeError(w, http.StatusBadRequest, "All fields are required.", "VALIDATION_ERROR")
		return
	}
	if req.Password != req.ConfirmPassword {
		writeError(w, http.StatusBadRequest, "Passwords do not match.", "VALIDATION_ERROR")
		return
	}

	passwordHash, err := security.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create account.", "SERVER_ERROR")
		return
	}

	user, err := s.store.CreateUser(r.Context(), req.Email, passwordHash, req.DisplayName, req.University)
	if err != nil {
		writeError(w, http.StatusConflict, "An account with that email already exists.", "EMAIL_TAKEN")
		return
	}
	s.issueSession(w, user)
	writeJSON(w, http.StatusCreated, authPayload{
		AccessToken: s.mustAccessToken(user),
		User:        toFrontendUser(user),
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Email and password are required.", "VALIDATION_ERROR")
		return
	}

	user, err := s.store.FindUserByEmail(r.Context(), req.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Incorrect email or password.", "INVALID_CREDENTIALS")
		return
	}
	if user.IsBanned {
		writeError(w, http.StatusForbidden, "This account has been banned.", "BANNED")
		return
	}
	if err := security.ComparePassword(user.PasswordHash, req.Password); err != nil {
		writeError(w, http.StatusUnauthorized, "Incorrect email or password.", "INVALID_CREDENTIALS")
		return
	}

	s.issueSession(w, user)
	writeJSON(w, http.StatusOK, authPayload{
		AccessToken: s.mustAccessToken(user),
		User:        toFrontendUser(user),
	})
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Refresh token missing.", "UNAUTHORIZED")
		return
	}
	claims, err := s.tokens.ParseRefreshToken(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Refresh token invalid.", "UNAUTHORIZED")
		return
	}
	user, err := s.store.FindUserByID(r.Context(), claims.UserID)
	if err != nil || user.IsBanned {
		writeError(w, http.StatusUnauthorized, "Refresh token invalid.", "UNAUTHORIZED")
		return
	}

	s.issueSession(w, user)
	writeJSON(w, http.StatusOK, authPayload{
		AccessToken: s.mustAccessToken(user),
		User:        toFrontendUser(user),
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, _ *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	writeJSON(w, http.StatusOK, toFrontendUser(user))
}

func (s *Server) handleListThreads(w http.ResponseWriter, r *http.Request) {
	page := intParam(r, "page", 1)
	limit := intParam(r, "limit", 20)
	sort := r.URL.Query().Get("sort")
	search := r.URL.Query().Get("search")
	category := r.URL.Query().Get("category")

	threads, total, err := s.store.ListThreads(r.Context(), sort, search, category, page, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load threads.", "SERVER_ERROR")
		return
	}

	items := make([]threadResponse, 0, len(threads))
	for _, thread := range threads {
		items = append(items, toThreadResponse(thread))
	}
	writeJSON(w, http.StatusOK, paginatedResponse[threadResponse]{Data: items, Total: total, Page: page, Limit: limit})
}

func (s *Server) handleGetThread(w http.ResponseWriter, r *http.Request) {
	thread, err := s.store.GetThreadByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Thread not found.", "NOT_FOUND")
		return
	}
	writeJSON(w, http.StatusOK, toThreadResponse(thread))
}

func (s *Server) handleCreateThread(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}

	var req createThreadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "Title and content are required.", "VALIDATION_ERROR")
		return
	}

	thread, err := s.store.CreateThread(r.Context(), user.ID, req.Title, req.Content, defaultString(req.Category, "General"), normalizeTags(req.Tags))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create post.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, toThreadResponse(thread))
}

func (s *Server) handleDeleteThread(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	if !canModerate(user.Role) {
		writeError(w, http.StatusForbidden, "Forbidden.", "FORBIDDEN")
		return
	}
	if err := s.store.DeleteThread(r.Context(), r.PathValue("id")); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, store.ErrNotFound) {
			status = http.StatusNotFound
		}
		writeError(w, status, "Failed to delete post.", "SERVER_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleToggleThreadLock(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	if !canModerate(user.Role) {
		writeError(w, http.StatusForbidden, "Forbidden.", "FORBIDDEN")
		return
	}
	id := r.PathValue("id")
	thread, err := s.store.GetThreadByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Thread not found.", "NOT_FOUND")
		return
	}
	updated, err := s.store.SetThreadLock(r.Context(), id, !thread.IsLocked)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update thread.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, toThreadResponse(updated))
}

func (s *Server) handleSetThreadFlair(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	if !canModerate(user.Role) {
		writeError(w, http.StatusForbidden, "Forbidden.", "FORBIDDEN")
		return
	}

	var req flairRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}

	updated, err := s.store.SetThreadFlair(r.Context(), r.PathValue("id"), req.Flair)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update thread.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, toThreadResponse(updated))
}

func (s *Server) handleVoteThread(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	var req voteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	upvotes, err := s.store.VoteThread(r.Context(), r.PathValue("id"), user.ID, req.Value)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to vote.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"upvotes": upvotes})
}

func (s *Server) handleListComments(w http.ResponseWriter, r *http.Request) {
	comments, err := s.store.ListCommentsByThread(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load comments.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, buildCommentTree(comments))
}

func (s *Server) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	var req createCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	if strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "Comment content is required.", "VALIDATION_ERROR")
		return
	}
	thread, err := s.store.GetThreadByID(r.Context(), req.ThreadID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Thread not found.", "NOT_FOUND")
		return
	}
	if thread.IsLocked {
		writeError(w, http.StatusForbidden, "This thread is locked.", "THREAD_LOCKED")
		return
	}

	comment, err := s.store.CreateComment(r.Context(), req.ThreadID, req.ParentID, user.ID, req.Content)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to post comment.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusCreated, toCommentResponse(comment))
}

func (s *Server) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	if !canModerate(user.Role) {
		writeError(w, http.StatusForbidden, "Forbidden.", "FORBIDDEN")
		return
	}
	if err := s.store.DeleteComment(r.Context(), r.PathValue("id")); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete comment.", "SERVER_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleVoteComment(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	var req voteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	upvotes, downvotes, err := s.store.VoteComment(r.Context(), r.PathValue("id"), user.ID, req.Value)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to vote.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"upvotes": upvotes, "downvotes": downvotes})
}

func (s *Server) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	user, err := s.store.FindUserByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Profile not found.", "NOT_FOUND")
		return
	}
	writeJSON(w, http.StatusOK, toFrontendUser(user))
}

func (s *Server) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	current, err := s.currentUser(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized.", "UNAUTHORIZED")
		return
	}
	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	updated, err := s.store.UpdateDisplayName(r.Context(), current.ID, req.DisplayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update profile.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, toFrontendUser(updated))
}

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	page := intParam(r, "page", 1)
	limit := intParam(r, "limit", 50)
	users, total, err := s.store.ListUsers(r.Context(), page, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load users.", "SERVER_ERROR")
		return
	}
	items := make([]frontendUser, 0, len(users))
	for _, user := range users {
		items = append(items, toFrontendUser(user))
	}
	writeJSON(w, http.StatusOK, paginatedResponse[frontendUser]{Data: items, Total: total, Page: page, Limit: limit})
}

func (s *Server) handleSetUserRole(w http.ResponseWriter, r *http.Request) {
	var req setRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body.", "BAD_REQUEST")
		return
	}
	updated, err := s.store.SetUserRole(r.Context(), r.PathValue("id"), req.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update role.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, toFrontendUser(updated))
}

func (s *Server) handleBanUser(w http.ResponseWriter, r *http.Request) {
	s.handleSetBanned(w, r, true)
}

func (s *Server) handleUnbanUser(w http.ResponseWriter, r *http.Request) {
	s.handleSetBanned(w, r, false)
}

func (s *Server) handleSetBanned(w http.ResponseWriter, r *http.Request, banned bool) {
	updated, err := s.store.SetUserBanned(r.Context(), r.PathValue("id"), banned)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update user.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, toFrontendUser(updated))
}

func (s *Server) handleListFlagged(w http.ResponseWriter, r *http.Request) {
	flags, err := s.store.ListFlags(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load flagged content.", "SERVER_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, flags)
}

func (s *Server) handleDismissFlag(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteFlag(r.Context(), r.PathValue("id")); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to dismiss flag.", "SERVER_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) currentUser(ctx context.Context) (store.UserRecord, error) {
	claims, ok := ctx.Value(middleware.ClaimsKey).(*auth.Claims)
	if !ok || claims == nil {
		return store.UserRecord{}, errors.New("missing claims")
	}
	return s.store.FindUserByID(ctx, claims.UserID)
}

func (s *Server) mustAccessToken(user store.UserRecord) string {
	token, err := s.tokens.NewAccessToken(user.ID, user.Role)
	if err != nil {
		panic(err)
	}
	return token
}

func (s *Server) issueSession(w http.ResponseWriter, user store.UserRecord) {
	refreshToken, err := s.tokens.NewRefreshToken(user.ID, user.Role)
	if err != nil {
		panic(err)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   s.cfg.RefreshTTLHours * 3600,
	})
}

func toFrontendUser(user store.UserRecord) frontendUser {
	return frontendUser{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		University:  user.University,
		Role:        user.Role,
		IsBanned:    user.IsBanned,
		CreatedAt:   user.CreatedAt,
	}
}

func toThreadResponse(thread store.ThreadRecord) threadResponse {
	return threadResponse{
		ID:           thread.ID,
		Title:        thread.Title,
		Content:      thread.Content,
		AuthorID:     thread.AuthorID,
		AuthorName:   thread.AuthorName,
		Category:     thread.Category,
		Tags:         thread.Tags,
		Upvotes:      thread.Upvotes,
		CommentCount: thread.CommentCount,
		Flair:        thread.Flair,
		IsLocked:     thread.IsLocked,
		CreatedAt:    thread.CreatedAt,
		UpdatedAt:    thread.UpdatedAt,
	}
}

func toCommentResponse(comment store.CommentRecord) commentResponse {
	return commentResponse{
		ID:         comment.ID,
		ThreadID:   comment.ThreadID,
		ParentID:   comment.ParentID,
		AuthorID:   comment.AuthorID,
		AuthorName: comment.AuthorName,
		Content:    comment.Content,
		Upvotes:    comment.Upvotes,
		Downvotes:  comment.Downvotes,
		Depth:      comment.Depth,
		Children:   []commentResponse{},
		CreatedAt:  comment.CreatedAt,
		UpdatedAt:  comment.UpdatedAt,
	}
}

func buildCommentTree(flat []store.CommentRecord) []commentResponse {
	nodes := make(map[string]*commentResponse, len(flat))
	rootIDs := []string{}

	for _, comment := range flat {
		node := toCommentResponse(comment)
		nodes[node.ID] = &node
	}

	for _, comment := range flat {
		node := nodes[comment.ID]
		if comment.ParentID != nil {
			parent := nodes[*comment.ParentID]
			if parent != nil {
				parent.Children = append(parent.Children, commentResponse{ID: node.ID})
				continue
			}
		}
		rootIDs = append(rootIDs, comment.ID)
	}

	roots := make([]commentResponse, 0, len(rootIDs))
	for _, id := range rootIDs {
		roots = append(roots, materializeCommentTree(nodes, id))
	}
	return roots
}

func materializeCommentTree(nodes map[string]*commentResponse, id string) commentResponse {
	node := nodes[id]
	if node == nil {
		return commentResponse{}
	}
	children := make([]commentResponse, 0, len(node.Children))
	for _, child := range node.Children {
		children = append(children, materializeCommentTree(nodes, child.ID))
	}
	copy := *node
	copy.Children = children
	return copy
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message, code string) {
	writeJSON(w, status, apiError{Message: message, Code: code})
}

func intParam(r *http.Request, key string, fallback int) int {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func normalizeTags(tags []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(strings.ToLower(tag))
		if tag == "" {
			continue
		}
		if _, exists := seen[tag]; exists {
			continue
		}
		seen[tag] = struct{}{}
		result = append(result, tag)
	}
	return result
}

func canModerate(role string) bool {
	return role == "moderator" || role == "admin"
}
