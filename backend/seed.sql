-- Seed data for AcademiQ
-- admin@usm.edu password: admin
-- admin2@usm.edu password: admin
-- student@usm.edu password: student
-- The hashes below use bcrypt with a cost of 12

INSERT INTO users (id, email, password_hash, role, display_name, university) VALUES 
('usr_admin_usm', 'admin@usm.edu', '$2b$12$6/CAD3nLCn9MebMvQn8aWOCjX5jgSuyRoxOrONjzhe7RCAQCLmlX2', 'admin', 'Admin', 'USM'),
('usr_student_usm', 'student@usm.edu', '$2b$12$Dg.YAc6BkGzOK3bWA8A0e.E3S03A21.OjJkW8/sk09RP5RLSPNonm', 'student', 'Student', 'USM'),
('usr_admin_usm2', 'admin2@usm.edu', '$2b$12$6/CAD3nLCn9MebMvQn8aWOCjX5jgSuyRoxOrONjzhe7RCAQCLmlX2', 'admin', 'Admin2', 'USM')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
