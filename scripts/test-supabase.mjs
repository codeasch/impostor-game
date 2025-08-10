import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL set:', !!url, 'Service set:', !!service, 'Len:', (service || '').length);
if (!url || !service) {
  console.error('Missing envs. Use: node --env-file=.env.local scripts/test-supabase.mjs');
  process.exit(1);
}

const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

try {
  const { count, error } = await admin
    .from('rooms')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Query error full:', JSON.stringify(error, null, 2));
    process.exit(2);
  }
  console.log('Rooms count (head):', count);
  process.exit(0);
} catch (e) {
  console.error('Fatal error:', e.message);
  process.exit(3);
}


