-- Dhaka Transit: tables + security. Safe to run more than once.
-- Run FIRST in Supabase Dashboard > SQL Editor.

create extension if not exists postgis with schema extensions;

create table if not exists operators (
  id      serial primary key,
  name    text not null unique,
  name_bn text
);

create table if not exists stops (
  id         serial primary key,
  name       text not null,
  name_bn    text,
  location   geography(Point, 4326) not null,   -- lng/lat
  created_at timestamptz default now()
);
create index if not exists stops_location_idx on stops using gist (location);

create table if not exists routes (
  id           serial primary key,
  operator_id  int references operators(id),
  code         text,
  name         text not null,
  name_bn      text,
  service_type text default 'local',            -- local | express | AC
  is_active    boolean default true
);

create table if not exists route_stops (
  id            serial primary key,
  route_id      int not null references routes(id) on delete cascade,
  stop_id       int not null references stops(id),
  direction     smallint not null default 0,    -- 0 outbound, 1 inbound
  stop_sequence int not null,
  unique (route_id, direction, stop_sequence)
);
create index if not exists route_stops_stop_idx on route_stops (stop_id);

create table if not exists fares (
  id           serial primary key,
  route_id     int not null references routes(id) on delete cascade,
  from_stop_id int not null references stops(id),
  to_stop_id   int not null references stops(id),
  fare_bdt     numeric(6,2) not null,
  unique (route_id, from_stop_id, to_stop_id)
);

create table if not exists fare_rules (
  route_id      int primary key references routes(id) on delete cascade,
  base_fare_bdt numeric(6,2) not null default 10,
  per_km_bdt    numeric(6,2) not null default 2.45,
  min_fare_bdt  numeric(6,2) not null default 10
);

-- Public read-only access
alter table operators   enable row level security;
alter table stops       enable row level security;
alter table routes      enable row level security;
alter table route_stops enable row level security;
alter table fares       enable row level security;
alter table fare_rules  enable row level security;

drop policy if exists "public read" on operators;
drop policy if exists "public read" on stops;
drop policy if exists "public read" on routes;
drop policy if exists "public read" on route_stops;
drop policy if exists "public read" on fares;
drop policy if exists "public read" on fare_rules;

create policy "public read" on operators   for select using (true);
create policy "public read" on stops       for select using (true);
create policy "public read" on routes      for select using (true);
create policy "public read" on route_stops for select using (true);
create policy "public read" on fares       for select using (true);
create policy "public read" on fare_rules  for select using (true);
