// This file provides auth utility functions that complement the auth context
import { User } from '@shared/schema';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  class: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

// Auth API functions
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  logout: async (): Promise<void> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return response.json();
  },
};

// Utility functions
export const isAuthenticated = (user: AuthUser | null): boolean => {
  return user !== null;
};

export const isCR = (user: AuthUser | null): boolean => {
  return user?.role === 'cr';
};

export const isStudent = (user: AuthUser | null): boolean => {
  return user?.role === 'student';
};

export const getUserInitials = (user: AuthUser | null): string => {
  if (!user) return '';
  return user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export const getUserDisplayRole = (user: AuthUser | null): string => {
  if (!user) return '';
  return user.role === 'cr' ? 'Class Representative' : 'Student';
};

// Local storage helpers for auth state persistence
export const storage = {
  setAuthData: (user: AuthUser): void => {
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to save auth data to localStorage:', error);
    }
  },

  getAuthData: (): AuthUser | null => {
    try {
      const data = localStorage.getItem('auth_user');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to retrieve auth data from localStorage:', error);
      return null;
    }
  },

  clearAuthData: (): void => {
    try {
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.warn('Failed to clear auth data from localStorage:', error);
    }
  },
};

// Auth guards for route protection
export const requireAuth = (user: AuthUser | null): boolean => {
  return isAuthenticated(user);
};

export const requireCR = (user: AuthUser | null): boolean => {
  return isAuthenticated(user) && isCR(user);
};

export const requireStudent = (user: AuthUser | null): boolean => {
  return isAuthenticated(user) && isStudent(user);
};

// Error handling helpers
export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const handleAuthError = (error: unknown): string => {
  if (error instanceof AuthError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected authentication error occurred';
};

// Session management
export const sessionManager = {
  isSessionExpired: (user: AuthUser | null): boolean => {
    // In a real app, you might check token expiration
    // For now, we assume session is valid if user exists
    return !user;
  },

  refreshSession: async (): Promise<AuthUser | null> => {
    try {
      const response = await authApi.getCurrentUser();
      return response.user;
    } catch (error) {
      console.warn('Session refresh failed:', error);
      return null;
    }
  },
};

export default {
  authApi,
  isAuthenticated,
  isCR,
  isStudent,
  getUserInitials,
  getUserDisplayRole,
  storage,
  requireAuth,
  requireCR,
  requireStudent,
  AuthError,
  handleAuthError,
  sessionManager,
};
