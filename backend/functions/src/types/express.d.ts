// src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        emailVerified?: boolean;
      };
    }
  }
}

export {};

// src/types/index.ts
export interface RequestUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}