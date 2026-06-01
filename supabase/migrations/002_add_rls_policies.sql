-- Add missing RLS policies for anonymous gameplay

-- Quests
create policy "Anyone can select quests" on quests for select using (true);
create policy "Host can update quests" on quests for update using (true);
create policy "Anyone can insert quests" on quests for insert with check (true);

-- Votes
create policy "Anyone can select votes" on votes for select using (true);
create policy "Players can insert votes" on votes for insert with check (true);
create policy "Anyone can update votes" on votes for update using (true);
create policy "Anyone can delete votes" on votes for delete using (true);

-- Quest Cards
create policy "Anyone can select quest cards" on quest_cards for select using (true);
create policy "Players can insert quest cards" on quest_cards for insert with check (true);

-- Lady of the Lake
create policy "Anyone can select lady of lake" on lady_of_lake for select using (true);
create policy "Players can insert lady of lake" on lady_of_lake for insert with check (true);
create policy "Host can update lady of lake" on lady_of_lake for update using (true);

-- Game Events
create policy "Anyone can select game events" on game_events for select using (true);
create policy "Anyone can insert game events" on game_events for insert with check (true);
