import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Timer sync utility
export async function getServerTime(): Promise<number> {
  try {
    const response = await fetch('/api/time');
    const data = await response.json();
    return new Date(data.serverNow).getTime();
  } catch (error) {
    console.error('Failed to get server time:', error);
    return Date.now();
  }
}

export async function calculateClockOffset(): Promise<number> {
  const clientTime = Date.now();
  const serverTime = await getServerTime();
  return serverTime - clientTime;
}
