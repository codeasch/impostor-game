import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  console.log('Ready API called');
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { player_id, room_code } = payload;
    console.log(`Ready API: Player ${player_id} in room ${room_code}`);

    // Get current room and players
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*, players!players_room_code_fkey(*)')
      .eq('code', room_code)
      .single();

    if (roomError) {
      console.error('Database error:', roomError);
      return NextResponse.json({ error: 'Database error', details: roomError.message }, { status: 500 });
    }

    if (!room) {
      console.log('Room not found');
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log('Room found:', room.code, 'Status:', room.status);

    if (room.status !== 'REVEAL') {
      return NextResponse.json({ error: 'Room is not in reveal phase' }, { status: 400 });
    }

    // Get connected players for accurate counting
    const connectedPlayers = room.players.filter((p: any) => p.connected);
    console.log(`Connected players: ${connectedPlayers.map((p: any) => p.name).join(', ')}`);
    
    // Add player to ready list if not already there
    const currentReadyPlayers = room.ready_players || [];
    console.log(`Current ready players: [${currentReadyPlayers.join(', ')}]`);
    console.log(`Player ${player_id} trying to ready up. Already ready: ${currentReadyPlayers.includes(player_id)}`);
    
    let updatedReadyPlayers = currentReadyPlayers;
    let wasAlreadyReady = currentReadyPlayers.includes(player_id);
    
    if (!wasAlreadyReady) {
      updatedReadyPlayers = [...currentReadyPlayers, player_id];
      
      // Update ready players list
      const { error: updateError } = await supabaseAdmin
        .from('rooms')
        .update({ ready_players: updatedReadyPlayers })
        .eq('code', room_code);

      if (updateError) {
        console.error('Error updating ready players:', updateError);
        return NextResponse.json({ error: 'Failed to mark player as ready' }, { status: 500 });
      }
      
      console.log(`Player ${player_id} added to ready list. Updated ready players: [${updatedReadyPlayers.join(', ')}]`);
    } else {
      console.log(`Player ${player_id} was already ready, skipping update`);
    }

    // Check if all connected players are ready
    const allReady = connectedPlayers.length > 0 && 
                    connectedPlayers.every((p: any) => updatedReadyPlayers.includes(p.id));
    
    console.log(`Ready check: ${updatedReadyPlayers.length}/${connectedPlayers.length} players ready`);
    console.log(`All ready: ${allReady}`);
    console.log(`Connected player IDs: [${connectedPlayers.map((p: any) => p.id).join(', ')}]`);
    console.log(`Ready player IDs: [${updatedReadyPlayers.join(', ')}]`);

    if (allReady) {
      // Auto-advance to DISCUSS phase
      const { error: advanceError } = await supabaseAdmin
        .from('rooms')
        .update({ 
          status: 'DISCUSS',
          ready_players: [] // Reset for next phase
        })
        .eq('code', room_code);

      if (advanceError) {
        console.error('Error advancing to discuss phase:', advanceError);
        return NextResponse.json({ error: 'Failed to advance to discussion' }, { status: 500 });
      }

      console.log(`🎉 All players ready! Room ${room_code} advanced to DISCUSS phase`);
      return NextResponse.json({ 
        success: true, 
        allReady: true,
        readyCount: updatedReadyPlayers.length,
        totalCount: connectedPlayers.length
      });
    }

    return NextResponse.json({ 
      success: true, 
      allReady: false,
      readyCount: updatedReadyPlayers.length,
      totalCount: connectedPlayers.length
    });
    
  } catch (error) {
    console.error('Error marking player ready:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}