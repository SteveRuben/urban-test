// src/types/auth.types.ts

// Types liés à l'authentification et aux utilisateurs
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isEmailVerified: boolean;
  trialUsed: number;
  jobTitle?: string;
  industry?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface UserCreateData {
  email: string;
  displayName: string;
  photoURL?: string;
  plan?: string;
  uid?: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  displayName?: string;
  confirmPassword?: string;
  agreeTerms?: boolean;
  rememberMe?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}