import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, message } = await request.json();

    // Send a test broadcast
    try {
      await supabaseAdmin
        .channel(`room:${roomCode}`)
        .send({
          type: 'broadcast',
          event: 'TEST_MESSAGE',
          payload: { message, timestamp: new Date().toISOString() }
        });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Broadcast failed' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Broadcast sent successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
