# AcademiQ

A modern discussion and thread management platform with a Go backend API and React TypeScript frontend. Features secure authentication with JWT, role-based access control, community discussions, and admin controls.

## Prerequisites

- **Node.js** 18+ and npm
- **Go** 1.23+
- **PostgreSQL** 12+ (for database)
- **Git** for version control

## Quick Start (Full Stack)

### 1. Backend Setup

```bash
cd backend

# Copy environment file and set JWT_SECRET
cp .env.example .env
# Edit .env and change JWT_SECRET to a secure value

# Download dependencies
go mod tidy

# Run migrations and start server (runs on :8080)
go run ./cmd/api
```

**Demo Credentials:**
- Student: `student@academiq.local` / `StudentPass123!`
- Admin: `admin@academiq.local` / `AdminPass123!`

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (runs on :5173)
npm run dev
```

Access the app at `http://localhost:5173`

---

## Build Instructions

### Frontend

```bash
cd frontend

# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm lint
```

### Backend

```bash
cd backend

# Run in development
go run ./cmd/api

# Build executable
go build -o academiq-api ./cmd/api

# Run migrations (if not automatic on startup)
# Managed by the app on initialization
```

### Build Configuration

**Frontend:**
- TypeScript with strict mode
- Vite for bundling with instant HMR
- TailwindCSS via Vite plugin
- React Router v7 for client-side routing

**Backend:**
- Go 1.23 with standard library
- JWT authentication (golang-jwt/jwt)
- bcrypt password hashing (golang.org/x/crypto)

---

## Project Architecture

### Tech Stack

**Backend:**
- Go 1.23 with standard library
- PostgreSQL 12+ for persistence
- JWT authentication (golang-jwt/jwt v5.2)
- Bcrypt password hashing (golang.org/x/crypto)
- RESTful API on port 8080

**Frontend:**
- React 19.2, TypeScript 6.0
- Vite 8.0 bundler
- TailwindCSS 4.2
- Axios 1.15 with auth interceptors
- React Router DOM 7.14
- DOMPurify 3.4 for HTML sanitization

### Directory Structure

```
AcademiQ/
├── backend/                 # Go API server
│   ├── cmd/
│   │   └── api/
│   │       └── main.go      # Entry point, server setup
│   ├── internal/
│   │   ├── auth/            # JWT token generation & validation
│   │   ├── config/          # Configuration management
│   │   ├── httpapi/         # Route handlers (threads, posts, users, auth)
│   │   ├── middleware/
│   │   │   ├── security_headers.go  # CSP, X-Frame-Options, etc.
│   │   │   └── authz.go            # Authentication & role checks
│   │   ├── security/
│   │   │   ├── password.go         # Hashing & verification
│   │   │   └── login_guard.go      # Brute-force lockout
│   │   └── store/           # Database operations
│   ├── migrations/
│   │   ├── 001_extensions_and_users.sql
│   │   ├── 002_forum_core.sql
│   │   └── 003_indexes.sql  # Schema + indexing
│   ├── .env                 # Environment variables
│   ├── go.mod               # Module definition
│   └── go.sum               # Dependency checksums
│
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── Button.tsx
│   │   │   ├── CommentTree.tsx  # Nested comments
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx # Access control
│   │   │   ├── ReplyBox.tsx
│   │   │   ├── RoleBadge.tsx
│   │   │   └── ThreadCard.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Global auth state
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useDraft.ts
│   │   │   └── useThread.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Thread list
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Thread.tsx       # Single thread view
│   │   │   ├── NewThread.tsx    # Create thread
│   │   │   ├── Profile.tsx      # User profile
│   │   │   ├── Admin.tsx        # Admin dashboard
│   │   │   ├── Forbidden.tsx    # 403 page
│   │   │   └── NotFound.tsx     # 404 page
│   │   ├── services/
│   │   │   ├── apiClient.ts     # Axios + interceptors
│   │   │   ├── auth.ts
│   │   │   ├── posts.ts
│   │   │   ├── threads.ts
│   │   │   └── users.ts
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── sanitize.ts
│   │   │   ├── storage.ts
│   │   │   ├── time.ts
│   │   │   └── validation.ts
│   │   ├── App.tsx              # Root + routing
│   │   ├── index.css
│   │   └── main.tsx
│   ├── public/              # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   └── index.html
│
├── .git/
├── .env                     # Shared env config
└── README.md

### Features

#### Authentication & Authorization
- **Login/Register**: User account management with secure token handling
- **Role-based access control**: Protected routes for authenticated and admin-only pages
- **Token persistence**: Automatic token refresh and management via Axios interceptors

#### Core Functionality
- **Discussions**: Create, read, and participate in threaded discussions
- **Comments**: Reply to threads with nested comment support
- **User Profiles**: View user information and contribution history
- **Admin Dashboard**: Moderation and system management tools
- **Draft Management**: Automatic draft saving to LocalStorage

#### Security
- **Content Sanitization**: DOMPurify protects against XSS attacks
- **CSP Headers**: Content Security Policy enforced in dev/production
- **X-Frame-Options**: Prevents clickjacking
- **Referrer Policy**: Strict referrer handling

### API Integration

The app communicates with a backend API (configurable in `services/apiClient.ts`):
- **Base URL**: Configured via `import.meta.env` or environment variables
- **Authentication**: Bearer token in Authorization header
- **Error Handling**: Centralized interceptors with automatic logout on 401

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:8080
```

### Development Workflow

1. **Modify code** in `src/` — Vite will hot-reload instantly
2. **Type checking**: TypeScript compiler validates in real-time
3. **Linting**: Run `npm lint` to check code quality
4. **Build & test**: Use `npm run build` to verify production build

### Security Best Practices

-  Role-based route protection via `ProtectedRoute`
-  HTML sanitization on user-generated content
-  Strict CSP and framing controls
-  Secure token storage and refresh logic
-  Input validation and error handling

---

## Work Distribution (Implemented)

### Kshitiz Neupane — Database Architect

Delivered PostgreSQL implementation for the backend:

- Designed and split SQL migrations into versioned files:
  - `backend/migrations/001_extensions_and_users.sql`
  - `backend/migrations/002_forum_core.sql`
  - `backend/migrations/003_indexes.sql`
- Implemented migration runner with `schema_migrations` tracking for idempotent startup migration application.
- Replaced in-memory auth lookup path with PostgreSQL-backed user store using parameterized SQL (`$1`) to prevent SQL injection.
- Added query sanitization and normalization at the store boundary (`NormalizeEmail`) before database lookup.
- Added practical indexing strategy for auth lookups, feed queries, tag/comment traversal, and text search.
- Wired backend startup to open PostgreSQL, apply migrations, and seed demo users safely.
