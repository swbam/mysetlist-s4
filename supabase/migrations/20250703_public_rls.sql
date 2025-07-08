-- Enable row-level security and open read access for public tables
alter table artists enable row level security;
alter table shows enable row level security;
alter table venues enable row level security;

create policy p_select_artists on artists for select using ( true );
create policy p_select_shows   on shows   for select using ( true );
create policy p_select_venues  on venues  for select using ( true );