import { apiClient } from './client';
import type { User } from '@/types';

interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface MessageResponse {
  message: string;
}

interface RefreshTokenResponse {
  accessToken: string;
}

export function login(email: string, password: string): Promise<Session> {
  const payload: LoginPayload = { email, password };
  return apiClient.post<Session>('/auth/login', payload);
}

export function register(data: RegisterPayload): Promise<Session> {
  return apiClient.post<Session>('/auth/register', data);
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/auth/forgot-password', { email });
}

export function resetPassword(
  token: string,
  password: string,
): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/auth/reset-password', {
    token,
    password,
  });
}

export function getMe(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

export function logout(): Promise<void> {
  return apiClient.post<void>('/auth/logout');
}

export function refreshToken(token: string): Promise<RefreshTokenResponse> {
  return apiClient.post<RefreshTokenResponse>('/auth/refresh', {
    refreshToken: token,
  });
}
