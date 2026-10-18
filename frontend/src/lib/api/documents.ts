import { apiClient } from './client';
import type { Document } from '@/types';

interface GetDocumentsParams {
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface CreateDocumentPayload {
  title: string;
  parentId?: string;
}

interface UpdateDocumentPayload {
  title?: string;
  content?: string;
  parentId?: string | null;
}

export function getDocuments(
  workspaceId: string,
  params?: GetDocumentsParams,
): Promise<Document[]> {
  return apiClient.get<Document[]>(`/workspaces/${workspaceId}/documents`, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export function getDocument(id: string): Promise<Document> {
  return apiClient.get<Document>(`/documents/${id}`);
}

export function createDocument(
  workspaceId: string,
  data: CreateDocumentPayload,
): Promise<Document> {
  return apiClient.post<Document>(
    `/workspaces/${workspaceId}/documents`,
    data,
  );
}

export function updateDocument(
  id: string,
  data: UpdateDocumentPayload,
): Promise<Document> {
  return apiClient.patch<Document>(`/documents/${id}`, data);
}

export function deleteDocument(id: string): Promise<void> {
  return apiClient.delete<void>(`/documents/${id}`);
}
