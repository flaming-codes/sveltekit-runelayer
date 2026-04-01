/** Roles available in the CMS. Extensible via string literal union. */
export type Role = "admin" | "editor" | "user";

/** Core user representation surfaced by Runelayer auth. */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Session returned by Better Auth, narrowed for Runelayer. */
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface EmailVerificationPayload {
  user: {
    email: string;
    [key: string]: unknown;
  };
  url: string;
  token: string;
}

export interface EmailVerificationConfig {
  /**
   * Sends an email verification link/token to the user.
   * Required when `requireEmailVerification` is enabled.
   */
  sendVerificationEmail?: (payload: EmailVerificationPayload, request?: Request) => Promise<void>;
  /** Send verification emails on credential sign-in attempts. */
  sendOnSignIn?: boolean;
  /** Send verification emails on sign-up. */
  sendOnSignUp?: boolean;
  /** Automatically sign users in after email verification. */
  autoSignInAfterVerification?: boolean;
  /** Email verification token lifetime in seconds. */
  expiresIn?: number;
}

/** Configuration accepted by `createAuth`. */
export interface AuthConfig {
  /** Auth secret used for signing tokens / cookies. */
  secret: string;
  /** Public base URL of the app (e.g. "http://localhost:5173"). */
  baseURL: string;
  /** Path prefix for auth API routes. @default "/api/auth" */
  basePath?: string;
  /** Session duration in seconds. @default 604800 (7 days) */
  sessionMaxAge?: number;
  /** Whether to require email verification. @default false */
  requireEmailVerification?: boolean;
  /** Better Auth email verification options. */
  emailVerification?: EmailVerificationConfig;
}

/** Context passed to access-control functions (matches schema AccessFn). */
export interface AccessContext {
  req: Request;
  id?: string;
  data?: unknown;
}

/** The object returned by `createAuth`. */
export interface RunelayerAuth {
  /** The underlying Better Auth instance. */
  auth: {
    handler: (request: Request) => Response | Promise<Response>;
    options: Record<string, unknown>;
  };
  /** SvelteKit handle hook for auth middleware. */
  handle: (input: {
    event: any;
    resolve: (event: any) => Response | Promise<Response>;
  }) => Promise<Response>;
}
