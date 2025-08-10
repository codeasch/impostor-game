import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const jwt = process.env.JWT_SECRET || '';

  return NextResponse.json({
    hasUrl: !!url,
    hasAnon: !!anon,
    hasService: !!service,
    hasJwt: !!jwt,
    lengths: {
      url: url.length,
      anon: anon.length,
      service: service.length,
      jwt: jwt.length,
    },
    likelyMisconfigured:
      !!anon && !!service && anon === service ? 'service_equals_anon' : null,
  });
}


