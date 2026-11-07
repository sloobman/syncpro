-- SyncPro Database Initialization Script
-- Executed on initial database container startup

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Configure application role with env-based password
-- NOTE: The syncpro_user password should be set via ALTER ROLE after
-- container initialization using the POSTGRES_PASSWORD env variable.
-- Never hardcode passwords in SQL scripts committed to version control.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'syncpro_user') THEN
        CREATE USER syncpro_user WITH PASSWORD NULL;
        RAISE NOTICE 'Created syncpro_user — set a password with ALTER ROLE before use.';
    END IF;
END
$$;

-- 3. Users Table (Real production authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email for instant login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Default system user seed for internal commits and engine operations
INSERT INTO users (id, email, name, password_hash, role)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@syncpro.dev',
    'SyncPro System',
    '$2a$12$KIXs6.yUjY6XpD9YVw8JceYtU477jT247XQ7o2j4zQJ9L6B4n9g6y',
    'system'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(32) DEFAULT '📁',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Workspace Invitations (pending invites for users who have not registered yet)
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'editor',
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);

-- 5. Core Merkle-CRDT DAG Schema (ARCHITECTURE.md)

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commits Table (Merkle Commits identified by SHA-256 hash)
CREATE TABLE IF NOT EXISTS commits (
    id CHAR(64) PRIMARY KEY, -- SHA-256 Hash
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    crdt_delta_storage_path TEXT NOT NULL,
    snapshot_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commit Parents (DAG Edges)
CREATE TABLE IF NOT EXISTS commit_parents (
    commit_id CHAR(64) NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    parent_commit_id CHAR(64) NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    parent_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (commit_id, parent_commit_id)
);

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    head_commit_id CHAR(64) NOT NULL REFERENCES commits(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, name)
);

-- Document Comments Table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_comments_doc ON document_comments(document_id, created_at ASC);

-- 6. Notifications Table (Production-grade user activity & alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'system',
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);

-- 7. Indexes for Fast Traversal & Topological Ordering
CREATE INDEX IF NOT EXISTS idx_commits_doc ON commits(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commit_parents_parent ON commit_parents(parent_commit_id);
CREATE INDEX IF NOT EXISTS idx_branches_doc ON branches(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);

-- 8. Grant Permissions (principle of least privilege)
-- Only grant necessary permissions to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO syncpro_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO syncpro_user;
