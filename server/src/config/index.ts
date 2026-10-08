import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// Resolve paths to handle running from both repository root, server folder, and user directory
const serverDir = path.resolve(__dirname, '../..');
const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(serverDir, '.env'),
  path.resolve(serverDir, '../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(userHome, 'Downloads/env'),
  path.resolve(userHome, 'Downloads/.env')
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

// Safe environment diagnostic (Never logs key values)
console.log("[Gemini Config]", {
  configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
  keyLength: process.env.GEMINI_API_KEY?.trim().length ?? 0,
  backendEnvironment: process.env.NODE_ENV || 'development',
  backendProcess: process.pid
});

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '5000', 10);
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get appUrl(): string {
    return process.env.APP_URL || 'http://localhost:5173';
  },
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  },
  google: {
    get clientId(): string {
      return (process.env.GOOGLE_CLIENT_ID || '').trim();
    },
    get clientSecret(): string {
      return (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    },
    get redirectUri(): string {
      return (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback').trim();
    },
    get isConfigured(): boolean {
      return Boolean(this.clientId && this.clientSecret);
    },
  },
  gemini: {
    get apiKey(): string {
      return (process.env.GEMINI_API_KEY || '').trim();
    },
    get model(): string {
      return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    },
    get isConfigured(): boolean {
      return Boolean(this.apiKey);
    },
  },
  jira: {
    get clientId(): string {
      return (process.env.JIRA_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID || '').trim();
    },
    get clientSecret(): string {
      return (process.env.JIRA_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET || '').trim();
    },
    get redirectUri(): string {
      return (process.env.JIRA_REDIRECT_URI || process.env.ATLASSIAN_REDIRECT_URI || 'http://localhost:5000/api/jira/oauth/callback').trim();
    },
    get scopes(): string[] {
      return ['offline_access', 'read:jira-user', 'read:jira-work', 'write:jira-work', 'read:me'];
    },
    get baseUrl(): string {
      return (process.env.JIRA_BASE_URL || '').trim();
    },
    get email(): string {
      return (process.env.JIRA_EMAIL || '').trim();
    },
    get apiToken(): string {
      return (process.env.JIRA_API_TOKEN || '').trim();
    },
    get defaultProject(): string {
      return (process.env.JIRA_DEFAULT_PROJECT || 'MF').trim();
    },
    get isOAuthConfigured(): boolean {
      return Boolean(this.clientId && this.clientSecret);
    },
    get isConfigured(): boolean {
      return Boolean(this.isOAuthConfigured || (this.baseUrl && this.email && this.apiToken));
    },
  },
  supabase: {
    get url(): string {
      return (process.env.SUPABASE_URL || 'https://yuqjktlvglzsfioniwmd.supabase.co').trim();
    },
    get anonKey(): string {
      return (process.env.SUPABASE_ANON_KEY || 'sb_publishable_Q9ATWFlgazxezxSGdlaoAQ_jfNjNJub').trim();
    },
    get serviceKey(): string {
      return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    },
    get isConfigured(): boolean {
      return Boolean(this.url && (this.anonKey || this.serviceKey));
    },
  },
};
