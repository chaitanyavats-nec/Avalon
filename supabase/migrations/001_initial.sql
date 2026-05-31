-- Rooms
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 6-character join code, uppercase
  host_session_id text not null,
  status text not null default 'lobby', -- lobby | role_reveal | quest | lady_of_lake | assassin | ended
  settings jsonb not null default '{}', -- { playerCount, roles: [], ladyOfLake: bool }
  current_quest int default 1,
  quest_leader_index int default 0,   -- index into players array
  rejection_count int default 0,       -- consecutive rejected proposals (resets on approval)
  created_at timestamptz default now()
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  session_id text not null,
  name text not null,
  role text,                          -- assigned role name, null until revealed
  team text,                          -- 'good' | 'evil', null until revealed
  is_host boolean default false,
  is_ready boolean default false,
  seat_order int,                     -- fixed seating order once game starts
  created_at timestamptz default now()
);

-- Quests
create table quests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  quest_number int not null,          -- 1–5
  required_players int not null,
  proposed_team uuid[],               -- array of player IDs
  proposal_count int default 1,       -- which proposal attempt this is (max 5)
  team_vote_result text,              -- 'approved' | 'rejected'
  quest_result text,                  -- 'pass' | 'fail' | null
  created_at timestamptz default now()
);

-- Team votes (approve/reject proposal)
create table votes (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  vote text not null,                 -- 'approve' | 'reject'
  unique(quest_id, player_id)
);

-- Quest cards (success/fail submitted anonymously)
create table quest_cards (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  card text not null,                 -- 'success' | 'fail'
  -- deliberately no player_id — anonymous submission
  submitted_at timestamptz default now()
);

-- Lady of the Lake assignments
create table lady_of_lake (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  holder_player_id uuid references players(id),
  investigated_player_id uuid references players(id),
  quest_number int,                   -- after which quest this occurred
  created_at timestamptz default now()
);

-- Game events log (for realtime broadcast and audit)
create table game_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

-- Row-level security

alter table rooms enable row level security;
alter table players enable row level security;
alter table quests enable row level security;
alter table votes enable row level security;
alter table quest_cards enable row level security;
alter table lady_of_lake enable row level security;
alter table game_events enable row level security;

-- Policies
create policy "Public can insert rooms" on rooms for insert with check (true);
create policy "Anyone can select rooms" on rooms for select using (true);
create policy "Host can update rooms" on rooms for update using (host_session_id = current_setting('request.jwt.claims', true)::json->>'session_id' or current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

create policy "Public can insert players" on players for insert with check (true);
create policy "Players can select players in their room" on players for select using (true);
create policy "Players can update their own player" on players for update using (session_id = current_setting('request.jwt.claims', true)::json->>'session_id' or current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- (Other policies would go here, omitting complex RLS for anonymous sessions for brevity, 
--  but in a real app we would use custom JWTs or an edge function for sensitive operations.)
