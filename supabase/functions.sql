-- Dhaka Transit: database functions. Safe to run more than once.
-- Run SECOND (after schema.sql).

drop function if exists nearest_stops(double precision, double precision, int, int);
drop function if exists direct_routes(int, int);
drop function if exists route_path(int, smallint, int, int);

-- Bus stops near a point, nearest first
create or replace function nearest_stops(
  p_lat double precision,
  p_lng double precision,
  max_meters int default 1500,
  max_results int default 5
)
returns table (
  id int, name text, lat double precision, lng double precision, distance_m double precision
)
language sql stable
set search_path = public, extensions
as $$
  select s.id,
         s.name,
         st_y(s.location::geometry),
         st_x(s.location::geometry),
         st_distance(s.location, st_point(p_lng, p_lat)::geography)
  from stops s
  where st_dwithin(s.location, st_point(p_lng, p_lat)::geography, max_meters)
  order by s.location <-> st_point(p_lng, p_lat)::geography
  limit max_results;
$$;

-- Direct buses from stop A to stop B (same route, correct direction) + fare
create or replace function direct_routes(p_from_stop int, p_to_stop int)
returns table (
  route_id int, route_name text, direction smallint, stops_count int, fare_bdt numeric
)
language sql stable
set search_path = public, extensions
as $$
  select r.id,
         r.name,
         a.direction,
         (b.stop_sequence - a.stop_sequence),
         round(
           coalesce(
             f.fare_bdt,
             greatest(
               fr.min_fare_bdt,
               fr.base_fare_bdt + fr.per_km_bdt * (st_distance(sa.location, sb.location) / 1000.0)::numeric
             ),
             10::numeric
           ),
           0
         )
  from route_stops a
  join route_stops b
    on b.route_id = a.route_id
   and b.direction = a.direction
   and b.stop_sequence > a.stop_sequence
  join routes r on r.id = a.route_id and r.is_active
  join stops sa on sa.id = a.stop_id
  join stops sb on sb.id = b.stop_id
  left join fares f
    on f.route_id = r.id and f.from_stop_id = a.stop_id and f.to_stop_id = b.stop_id
  left join fare_rules fr on fr.route_id = r.id
  where a.stop_id = p_from_stop
    and b.stop_id = p_to_stop
  order by (b.stop_sequence - a.stop_sequence);
$$;

-- Ordered stops between board and alight (to draw the bus line on the map)
create or replace function route_path(
  p_route_id int, p_direction smallint, p_from_stop int, p_to_stop int
)
returns table (
  stop_id int, name text, lat double precision, lng double precision, stop_sequence int
)
language sql stable
set search_path = public, extensions
as $$
  select s.id,
         s.name,
         st_y(s.location::geometry),
         st_x(s.location::geometry),
         rs.stop_sequence
  from route_stops rs
  join stops s on s.id = rs.stop_id
  where rs.route_id = p_route_id
    and rs.direction = p_direction
    and rs.stop_sequence between
        (select x.stop_sequence from route_stops x
          where x.route_id = p_route_id and x.direction = p_direction and x.stop_id = p_from_stop)
    and (select y.stop_sequence from route_stops y
          where y.route_id = p_route_id and y.direction = p_direction and y.stop_id = p_to_stop)
  order by rs.stop_sequence;
$$;

-- Make the Supabase API pick up the new functions immediately
notify pgrst, 'reload schema';
