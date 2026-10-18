-- SyncPro Database Initialization Script
-- Executed on initial database container startup

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Configure Secondary Dev Role if specified in task spec
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'syncpro_user') THEN
        CREATE USER syncpro_user WITH PASSWORD 'syncpro_secret';
    END IF;
END
$$;

-- 3. Core Merkle-CRDT DAG Schema (antigravity.md & task-3.2)

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commits Table (Merkle Commits identified by SHA-256 hash)
CREATE TABLE IF NOT EXISTS commits (
    id CHAR(64) PRIMARY KEY, -- SHA-256 Hash
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
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

-- 4. Indexes for Fast Traversal & Topological Ordering
CREATE INDEX IF NOT EXISTS idx_commits_doc ON commits(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commit_parents_parent ON commit_parents(parent_commit_id);
CREATE INDEX IF NOT EXISTS idx_branches_doc ON branches(document_id);

-- 5. Grant Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;
