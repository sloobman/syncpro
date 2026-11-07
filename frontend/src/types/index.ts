// User & Auth
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  locale: "ru" | "en";
  createdAt: string;
  updatedAt?: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Workspace
export type MemberRole = "owner" | "editor" | "commenter" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
  ownerId?: string;
  currentUserRole?: MemberRole;
  plan?: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  user: User;
  role: MemberRole;
  joinedAt: string;
}

// Document
export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  defaultBranch: string;
  createdBy: string;
  currentUserRole?: MemberRole;
  canEdit?: boolean;
  wordCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  documentId: string;
  name: string;
  headCommitId: string;
  createdAt: string;
}

export interface Commit {
  id: string;
  documentId: string;
  authorId: string;
  author: { name: string; avatarUrl: string | null };
  message: string;
  parentIds: string[];
  branch: string;
  createdAt: string;
}

export interface DiffHunk {
  type: "added" | "removed" | "unchanged";
  text: string;
  author?: string;
}

// API
export interface ApiResponse<T> {
  data: T;
  meta?: { total: number; page: number; perPage: number };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
