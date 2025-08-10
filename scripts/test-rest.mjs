const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error('Missing envs. Use: node --env-file=.env.local scripts/test-rest.mjs');
  process.exit(1);
}

const endpoint = `${url}/rest/v1/rooms?select=code&limit=1`;

const res = await fetch(endpoint, {
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    Prefer: 'count=exact',
  },
});

console.log('HTTP', res.status, res.statusText);
const body = await res.text();
console.log('Body:', body);


