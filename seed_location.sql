-- Insert default office location for testing
INSERT INTO office_locations (name, address, latitude, longitude, radius, is_active)
VALUES 
  ('Kantor Pusat', 'Jl. Sudirman No. 123, Jakarta Pusat', -6.208763, 106.845599, 100, true);

-- Check inserted data
SELECT * FROM office_locations;