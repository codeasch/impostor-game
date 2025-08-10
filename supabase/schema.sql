-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Rooms & players
create table rooms (
  code text primary key,            -- 6 chars
  host_id uuid not null,
  status text not null default 'LOBBY',  -- LOBBY | ASSIGNING | REVEAL | DISCUSS | VOTE | REVEAL_RESULT | ENDED
  created_at timestamptz default now(),
  current_round int default 0,
  ready_players uuid[] default '{}'  -- Array of player IDs who are ready
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_code text references rooms(code) on delete cascade,
  name text not null,
  is_host boolean default false,
  connected boolean default true,
  joined_at timestamptz default now(),
  avatar_seed text,
  device_id text,
  kicked boolean default false,
  kicked_at timestamptz
);
create index on players(room_code);
create index if not exists players_room_device_idx on players(room_code, device_id);

-- Rounds & assignments
create table rounds (
  id uuid primary key default gen_random_uuid(),
  room_code text references rooms(code) on delete cascade,
  round_number int not null,
  pack text not null,
  mode text not null,                  -- BLANK | DECEPTION
  impostor_count int not null,
  clue_rounds int not null,            -- 1..3
  timer_seconds int,                   -- null => no timer
  crew_word text not null,
  start_server_ts timestamptz,         -- set on DISCUSS start
  end_server_ts timestamptz            -- set for timer mode
);
create index on rounds(room_code);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  role text not null,                  -- INNOCENT | IMPOSTOR
  word_shown text not null             -- crew word or '?' or close word
);
create index on assignments(round_id);

-- Votes
create table votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  voter_id uuid references players(id) on delete cascade,
  accused_player_id uuid references players(id) on delete cascade,
  created_at timestamptz default now(),
  unique (round_id, voter_id)
);

-- Realtime presence (optional helper)
create table presence (
  room_code text references rooms(code) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  last_seen timestamptz default now(),
  primary key (room_code, player_id)
);

-- Row Level Security (RLS) Policies
alter table rooms enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table assignments enable row level security;
alter table votes enable row level security;
alter table presence enable row level security;

-- Players can see rooms they're part of
create policy "Players can view their room" on rooms
  for select using (
    code in (
      select room_code from players 
      where id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
    )
  );

-- Players can see other players in their room
create policy "Players can view room players" on players
  for select using (
    room_code in (
      select room_code from players 
      where id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
    )
  );

-- Players can update their own connection status
create policy "Players can update themselves" on players
  for update using (
    id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
  );

-- Players can see rounds in their room
create policy "Players can view room rounds" on rounds
  for select using (
    room_code in (
      select room_code from players 
      where id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
    )
  );

-- Players can only see their own assignments
create policy "Players can view their assignments" on assignments
  for select using (
    player_id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
  );

-- Players can see votes in their current round
create policy "Players can view round votes" on votes
  for select using (
    round_id in (
      select r.id from rounds r
      join players p on p.room_code = r.room_code
      where p.id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
    )
  );

-- Players can insert their own votes
create policy "Players can vote" on votes
  for insert with check (
    voter_id = (current_setting('request.jwt.claims', true)::json->>'player_id')::uuid
  );

-- Enable realtime
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table votes;

-- Optional RPC to remove a uuid from a uuid[] column by key
CREATE OR REPLACE FUNCTION array_remove_uuid(
  table_name text,
  col_name text,
  key text,
  key_val text,
  uuid_val uuid
) RETURNS void AS $$
DECLARE
  sql text;
BEGIN
  sql := format('UPDATE %I SET %I = array_remove(%I, $1) WHERE %I = $2', table_name, col_name, col_name, key);
  EXECUTE sql USING uuid_val, key_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
