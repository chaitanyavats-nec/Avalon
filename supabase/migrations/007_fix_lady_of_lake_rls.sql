-- The lady_of_lake table's RLS policies from 002_add_rls_policies.sql are missing on
-- the live database (rows written by the assign-roles Edge Function via the service-role
-- key were invisible to every client using the anon key, since RLS was enabled on this
-- table with no permissive policy). Recreate them idempotently.
drop policy if exists "Anyone can select lady of lake" on lady_of_lake;
drop policy if exists "Players can insert lady of lake" on lady_of_lake;
drop policy if exists "Host can update lady of lake" on lady_of_lake;

create policy "Anyone can select lady of lake" on lady_of_lake for select using (true);
create policy "Players can insert lady of lake" on lady_of_lake for insert with check (true);
create policy "Host can update lady of lake" on lady_of_lake for update using (true);
