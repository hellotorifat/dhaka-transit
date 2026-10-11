-- SAMPLE data for testing only (coordinates approximate).
-- Replace with real surveyed data later. Run THIRD.
-- Re-running this wipes and re-creates the sample data.

truncate route_stops, fare_rules, fares, routes, stops, operators restart identity cascade;

insert into operators (name, name_bn) values ('Sample Bus Co', 'স্যাম্পল বাস');

insert into stops (name, name_bn, location) values
  ('Mirpur 12', 'মিরপুর ১২', st_point(90.3640, 23.8280)::geography),
  ('Mirpur 10', 'মিরপুর ১০', st_point(90.3687, 23.8069)::geography),
  ('Farmgate',  'ফার্মগেট',  st_point(90.3872, 23.7561)::geography),
  ('Shahbag',   'শাহবাগ',    st_point(90.3957, 23.7389)::geography),
  ('Motijheel', 'মতিঝিল',    st_point(90.4172, 23.7330)::geography);

insert into routes (operator_id, code, name, name_bn)
values (1, 'S-1', 'Mirpur 12 - Motijheel', 'মিরপুর ১২ - মতিঝিল');

insert into route_stops (route_id, stop_id, direction, stop_sequence) values
  (1, 1, 0, 1), (1, 2, 0, 2), (1, 3, 0, 3), (1, 4, 0, 4), (1, 5, 0, 5),
  -- return direction (direction 1): Motijheel -> Mirpur 12
  (1, 5, 1, 1), (1, 4, 1, 2), (1, 3, 1, 3), (1, 2, 1, 4), (1, 1, 1, 5);

insert into fare_rules (route_id, base_fare_bdt, per_km_bdt, min_fare_bdt)
values (1, 10, 2.45, 10);
