import { apiClient } from './client';
import type { Workspace, WorkspaceMember } from '@/types';

interface CreateWorkspacePayload {
  name: string;
  slug?: string;
}

interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
}

export function getWorkspaces(): Promise<Workspace[]> {
  return apiClient.get<Workspace[]>('/workspaces');
}

export function getWorkspace(id: string): Promise<Workspace> {
  return apiClient.get<Workspace>(`/workspaces/${id}`);
}

export function createWorkspace(
  data: CreateWorkspacePayload,
): Promise<Workspace> {
  return apiClient.post<Workspace>('/workspaces', data);
}

export function updateWorkspace(
  id: string,
  data: UpdateWorkspacePayload,
): Promise<Workspace> {
  return apiClient.patch<Workspace>(`/workspaces/${id}`, data);
}

export function deleteWorkspace(id: string): Promise<void> {
  return apiClient.delete<void>(`/workspaces/${id}`);
}

export function getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return apiClient.get<WorkspaceMember[]>(
    `/workspaces/${workspaceId}/members`,
  );
}

export function inviteMember(
  workspaceId: string,
  email: string,
  role: string,
): Promise<void> {
  return apiClient.post<void>(`/workspaces/${workspaceId}/members`, {
    email,
    role,
  });
}

export function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/workspaces/${workspaceId}/members/${userId}`,
  );
}
