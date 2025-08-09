import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // Test if we can connect to Supabase
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed',
        details: error.message,
        hint: 'Make sure you have run the database schema from supabase/schema.sql'
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
