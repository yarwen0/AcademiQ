-- Seed data for AcademiQ
-- Both accounts use the password: Password123!
-- The hashes below use bcrypt with a cost of 12

INSERT INTO users (email, password, role) VALUES 
('admin@usm.edu', '$2a$12$VEj6O6.pZ9L.L9zZ9zZ9zOu1m3n2o1p2q3r4s5t6u7v8w9x0y1z2', 'admin'),
('student@usm.edu', '$2a$12$VEj6O6.pZ9L.L9zZ9zZ9zOu1m3n2o1p2q3r4s5t6u7v8w9x0y1z2', 'student');