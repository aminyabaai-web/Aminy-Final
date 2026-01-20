/**
 * Supabase Configuration
 *
 * These values are loaded from environment variables.
 * For local development, set them in .env.local
 * For production, set them in your deployment environment.
 *
 * SECURITY: Never commit actual API keys to this file.
 */

// Get from environment variables with fallback validation
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value && import.meta.env.PROD) {
    // Only error in production - dev mode can run with mock data
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
};

// Extract project ID from URL
const extractProjectId = (url: string): string => {
  if (!url) return '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');

export const projectId = extractProjectId(supabaseUrl);
export const publicAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Export full URL for direct use
export const supabaseFullUrl = supabaseUrl;

// Validation check removed for production
