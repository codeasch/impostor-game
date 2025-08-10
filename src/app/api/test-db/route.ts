import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function GET() {
  try {
    // Test if we can connect to Supabase
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('count')
      .limit(1);

    if (error) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const h = (s: string) => (s ? crypto.createHash('sha256').update(s).digest('hex') : null);
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed',
        details: error.message,
        hint: 'Check environment variables and run the database schema from supabase/schema.sql',
        envCheck: {
          hasUrl: !!url,
          hasAnon: !!anon,
          hasService: !!service,
          anonLen: anon.length || 0,
          serviceLen: service.length || 0,
          anonSha256: h(anon),
          serviceSha256: h(service),
        }
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful!' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check your SUPABASE environment variables'
    }, { status: 500 });
  }
}
