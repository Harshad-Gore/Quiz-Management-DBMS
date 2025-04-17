-- Create the database
CREATE DATABASE IF NOT EXISTS quiz_management_system;

USE quiz_management_system;

-- Users table with unique IDs
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,  -- Format: user_abc123
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'teacher') NOT NULL,
    department VARCHAR(100) NOT NULL,
    institution_email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (email),
    INDEX (institution_email),
    INDEX (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student-specific information
CREATE TABLE IF NOT EXISTS students (
    user_id VARCHAR(20) PRIMARY KEY,
    prn_number VARCHAR(50) NOT NULL UNIQUE,
    enrollment_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Teacher-specific information
CREATE TABLE IF NOT EXISTS teachers (
    user_id VARCHAR(20) PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100),
    joining_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Updated Quizzes table with creator tracking
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(20) PRIMARY KEY,  -- Format: quiz_xyz456
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(20) NOT NULL,  -- References users.id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    total_marks INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (created_by),
    INDEX (is_published),
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions table (unchanged but with creator tracking)
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(20) PRIMARY KEY,  -- Format: qst_789def
    quiz_id VARCHAR(20) NOT NULL,
    question_text TEXT NOT NULL,
    answer_type ENUM('text', 'number', 'single', 'multiple', 'boolean') NOT NULL,
    marks INT DEFAULT 1,
    time_limit INT DEFAULT 0 COMMENT 'In seconds, 0 means no limit',
    created_by VARCHAR(20) NOT NULL,  -- References users.id
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (quiz_id),
    INDEX (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Options table (unchanged)
CREATE TABLE IF NOT EXISTS options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id VARCHAR(20) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enhanced Responses table with user tracking
CREATE TABLE IF NOT EXISTS responses (
    id VARCHAR(20) PRIMARY KEY,  -- Format: res_123ghi
    quiz_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,  -- References users.id
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    total_score INT,
    time_taken INT COMMENT 'In seconds',
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (quiz_id),
    INDEX (user_id),
    INDEX (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Response details table (unchanged)
CREATE TABLE IF NOT EXISTS response_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id VARCHAR(20) NOT NULL,
    question_id VARCHAR(20) NOT NULL,
    answer_text TEXT COMMENT 'For text/number answers',
    option_id INT COMMENT 'For selected option if MCQ',
    is_correct BOOLEAN,
    marks_obtained INT,
    time_taken INT COMMENT 'In seconds',
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE SET NULL,
    INDEX (response_id),
    INDEX (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quiz access control (for teachers to share quizzes with specific students)
CREATE TABLE IF NOT EXISTS quiz_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,  -- Student ID
    granted_by VARCHAR(20) NOT NULL,  -- Teacher ID
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (quiz_id, user_id),
    INDEX (quiz_id),
    INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert teachers
INSERT INTO users (id, email, password, first_name, last_name, role, department, institution_email)
VALUES 
('user_teach1', 'john.doe@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'John', 'Doe', 'teacher', 'Computer Science', 'j.doe@university.edu'),
('user_teach2', 'jane.smith@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'Jane', 'Smith', 'teacher', 'Mathematics', 'j.smith@university.edu');

INSERT INTO teachers (user_id, teacher_id, designation, joining_date)
VALUES 
('user_teach1', 'TECH-1001', 'Professor', '2015-08-15'),
('user_teach2', 'TECH-1002', 'Associate Professor', '2018-03-22');

-- Insert students
INSERT INTO users (id, email, password, first_name, last_name, role, department, institution_email)
VALUES 
('user_stu1', 'alice.johnson@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'Alice', 'Johnson', 'student', 'Computer Science', 'a.johnson@university.edu'),
('user_stu2', 'bob.williams@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'Bob', 'Williams', 'student', 'Computer Science', 'b.williams@university.edu'),
('user_stu3', 'charlie.brown@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'Charlie', 'Brown', 'student', 'Mathematics', 'c.brown@university.edu'),
('user_stu4', 'diana.miller@example.com', '$2a$10$xJwL5v5z3V9z4hVp5n6Z8e9Qd7Rf8S2t3U4v5W6x7Y8z9A0B1C2D', 'Diana', 'Miller', 'student', 'Mathematics', 'd.miller@university.edu');

INSERT INTO students (user_id, prn_number, enrollment_date)
VALUES 
('user_stu1', 'PRN2023001', '2023-09-01'),
('user_stu2', 'PRN2023002', '2023-09-01'),
('user_stu3', 'PRN2023003', '2023-09-01'),
('user_stu4', 'PRN2023004', '2023-09-01');

-- Insert quizzes
INSERT INTO quizzes (id, title, description, created_by, total_marks, is_published, publish_date)
VALUES 
('quiz_001', 'Introduction to Programming', 'Basic programming concepts quiz', 'user_teach1', 20, TRUE, '2023-10-01 10:00:00'),
('quiz_002', 'Database Fundamentals', 'SQL and database concepts quiz', 'user_teach1', 25, TRUE, '2023-10-15 10:00:00'),
('quiz_003', 'Linear Algebra Basics', 'Basic linear algebra concepts', 'user_teach2', 30, TRUE, '2023-10-10 10:00:00'),
('quiz_004', 'Advanced Algorithms', 'Algorithm analysis and design', 'user_teach1', 40, FALSE, NULL);

-- Insert questions for quiz_001
INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_00101', 'quiz_001', 'What does HTML stand for?', 'single', 2, 'user_teach1'),
('qst_00102', 'quiz_001', 'Which of these are programming paradigms?', 'multiple', 3, 'user_teach1'),
('qst_00103', 'quiz_001', 'What is the output of 3 + 2 * 4 in Python?', 'number', 2, 'user_teach1'),
('qst_00104', 'quiz_001', 'Is JavaScript the same as Java?', 'boolean', 1, 'user_teach1'),
('qst_00105', 'quiz_001', 'Explain the concept of a variable in programming', 'text', 5, 'user_teach1');

-- Options for quiz_001 questions
INSERT INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_00101
('qst_00101', 'Hyper Text Markup Language', TRUE),
('qst_00101', 'Hyperlinks and Text Markup Language', FALSE),
('qst_00101', 'Home Tool Markup Language', FALSE),
('qst_00101', 'Hyper Transfer Markup Language', FALSE),

-- Options for qst_00102
('qst_00102', 'Object-oriented programming', TRUE),
('qst_00102', 'Functional programming', TRUE),
('qst_00102', 'Procedural programming', TRUE),
('qst_00102', 'Linear programming', FALSE),

-- Options for qst_00104 (boolean question)
('qst_00104', 'True', FALSE),
('qst_00104', 'False', TRUE);

-- Insert questions for quiz_002
INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_00201', 'quiz_002', 'What does SQL stand for?', 'single', 3, 'user_teach1'),
('qst_00202', 'quiz_002', 'Which of these are SQL commands?', 'multiple', 4, 'user_teach1'),
('qst_00203', 'quiz_002', 'What is the purpose of a primary key?', 'text', 5, 'user_teach1'),
('qst_00204', 'quiz_002', 'What is the maximum number of columns in a MySQL table?', 'number', 2, 'user_teach1'),
('qst_00205', 'quiz_002', 'Is MongoDB a relational database?', 'boolean', 1, 'user_teach1');

-- Options for quiz_002 questions
INSERT INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_00201
('qst_00201', 'Structured Query Language', TRUE),
('qst_00201', 'Simple Query Language', FALSE),
('qst_00201', 'Standard Query Language', FALSE),
('qst_00201', 'Sequential Query Language', FALSE),

-- Options for qst_00202
('qst_00202', 'SELECT', TRUE),
('qst_00202', 'INSERT', TRUE),
('qst_00202', 'UPDATE', TRUE),
('qst_00202', 'DISPLAY', FALSE),

-- Options for qst_00205 (boolean question)
('qst_00205', 'True', FALSE),
('qst_00205', 'False', TRUE);

-- Insert quiz access permissions
INSERT INTO quiz_access (quiz_id, user_id, granted_by)
VALUES 
('quiz_001', 'user_stu1', 'user_teach1'),
('quiz_001', 'user_stu2', 'user_teach1'),
('quiz_002', 'user_stu1', 'user_teach1'),
('quiz_002', 'user_stu2', 'user_teach1'),
('quiz_003', 'user_stu3', 'user_teach2'),
('quiz_003', 'user_stu4', 'user_teach2');

-- Insert responses
INSERT INTO responses (id, quiz_id, user_id, completed_at, total_score, time_taken)
VALUES 
-- Alice's responses
('res_001', 'quiz_001', 'user_stu1', '2023-10-02 14:30:00', 18, 1200),
('res_002', 'quiz_002', 'user_stu1', '2023-10-16 15:45:00', 22, 1800),

-- Bob's responses
('res_003', 'quiz_001', 'user_stu2', '2023-10-03 10:15:00', 15, 1500),
('res_004', 'quiz_002', 'user_stu2', '2023-10-17 11:30:00', 20, 2100),

-- Charlie's responses
('res_005', 'quiz_003', 'user_stu3', '2023-10-11 09:00:00', 25, 2400),

-- Diana's responses
('res_006', 'quiz_003', 'user_stu4', '2023-10-12 13:45:00', 28, 2000);

-- Insert response details for Alice's quiz_001 response
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_001', 'qst_00101', NULL, 1, TRUE, 2), -- Correct answer
('res_001', 'qst_00102', NULL, 1, TRUE, 1), -- Partially correct (selected 3/3 correct)
('res_001', 'qst_00102', NULL, 2, TRUE, 1),
('res_001', 'qst_00102', NULL, 3, TRUE, 1),
('res_001', 'qst_00103', '11', NULL, FALSE, 0), -- Incorrect answer
('res_001', 'qst_00104', NULL, 6, TRUE, 1), -- Correct answer (False)
('res_001', 'qst_00105', 'A variable is a named storage location that holds data', NULL, TRUE, 5); -- Good answer

-- Insert response details for Bob's quiz_001 response
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_003', 'qst_00101', NULL, 2, FALSE, 0), -- Incorrect answer
('res_003', 'qst_00102', NULL, 1, TRUE, 1), -- Partially correct (selected 2/3 correct)
('res_003', 'qst_00102', NULL, 2, TRUE, 1),
('res_003', 'qst_00103', '11', NULL, FALSE, 0), -- Incorrect answer
('res_003', 'qst_00104', NULL, 5, FALSE, 0), -- Incorrect answer (True)
('res_003', 'qst_00105', 'A variable changes', NULL, FALSE, 2); -- Partial credit

SELECT * FROM users;
SELECT * FROM teachers;
SELECT * FROM students;
SELECT * FROM quizzes;
SELECT * FROM questions;
SELECT * FROM options;
SELECT * FROM responses;
SELECT * FROM response_details;
SELECT * FROM quiz_access;

update users set id = 'user_f0f2zw' where email = 'harshad7237@gmail.com';

-- First, ensure the teacher exists (or create if not exists)
INSERT IGNORE INTO users (id, email, password, first_name, last_name, role, department, institution_email)
VALUES ('user_f0f2zw', 'msto97@university.edu', '$2a$10$hashedpassword', 'Mohammed', 'Sto', 'teacher', 'Computer Science', 'm.sto@university.edu');

INSERT IGNORE INTO teachers (user_id, teacher_id, designation, joining_date)
VALUES ('user_f0f2zw', '202301040138', 'Assistant Professor', '2023-01-04');

-- Add quizzes created by user_f0f2zw
INSERT INTO quizzes (id, title, description, created_by, total_marks, is_published, publish_date)
VALUES 
('quiz_msto2', 'Advanced Database Systems', 'Quiz on NoSQL and distributed databases', 'user_f0f2zw', 30, TRUE, '2023-11-15 10:00:00'),
('quiz_msto2', 'Cloud Computing Fundamentals', 'Quiz on cloud service models and deployment', 'user_f0f2zw', 25, TRUE, '2023-11-20 10:00:00'),
('quiz_msto3', 'Machine Learning Basics', 'Introductory concepts in ML', 'user_f0f2zw', 35, FALSE, NULL);

-- Add questions for Advanced Database Systems quiz
INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_msto101', 'quiz_msto2', 'Which of these is a NoSQL database type?', 'single', 3, 'user_f0f2zw'),
('qst_msto102', 'quiz_msto2', 'What are the ACID properties?', 'multiple', 5, 'user_f0f2zw'),
('qst_msto103', 'quiz_msto2', 'What is CAP theorem in distributed systems?', 'text', 8, 'user_f0f2zw'),
('qst_msto104', 'quiz_msto2', 'MongoDB uses which query language?', 'single', 3, 'user_f0f2zw'),
('qst_msto105', 'quiz_msto2', 'Is Cassandra a wide-column store?', 'boolean', 2, 'user_f0f2zw');

-- Options for Advanced Database questions
INSERT INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_msto101
('qst_msto101', 'Document', TRUE),
('qst_msto101', 'Relational', FALSE),
('qst_msto101', 'Tabular', FALSE),
('qst_msto101', 'Linear', FALSE),

-- Options for qst_msto102
('qst_msto102', 'Atomicity', TRUE),
('qst_msto102', 'Consistency', TRUE),
('qst_msto102', 'Isolation', TRUE),
('qst_msto102', 'Durability', TRUE),
('qst_msto102', 'Availability', FALSE),

-- Options for qst_msto104
('qst_msto104', 'MQL (MongoDB Query Language)', TRUE),
('qst_msto104', 'SQL', FALSE),
('qst_msto104', 'GraphQL', FALSE),
('qst_msto104', 'NoQL', FALSE),

-- Options for qst_msto105
('qst_msto105', 'True', TRUE),
('qst_msto105', 'False', FALSE);

-- Add questions for Cloud Computing quiz
INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_msto201', 'quiz_msto2', 'Which is NOT a cloud service model?', 'single', 3, 'user_f0f2zw'),
('qst_msto202', 'quiz_msto2', 'What are benefits of cloud computing?', 'multiple', 6, 'user_f0f2zw'),
('qst_msto203', 'quiz_msto2', 'Explain the difference between IaaS and PaaS', 'text', 7, 'user_f0f2zw'),
('qst_msto204', 'quiz_msto2', 'Which company provides AWS?', 'single', 2, 'user_f0f2zw'),
('qst_msto205', 'quiz_msto2', 'Is serverless computing actually without servers?', 'boolean', 2, 'user_f0f2zw');

-- Options for Cloud Computing questions
INSERT INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_msto201
('qst_msto201', 'Hardware as a Service', TRUE),
('qst_msto201', 'Software as a Service', FALSE),
('qst_msto201', 'Platform as a Service', FALSE),
('qst_msto201', 'Infrastructure as a Service', FALSE),

-- Options for qst_msto202
('qst_msto202', 'Scalability', TRUE),
('qst_msto202', 'Cost efficiency', TRUE),
('qst_msto202', 'High availability', TRUE),
('qst_msto202', 'Reduced maintenance', TRUE),
('qst_msto202', 'Better performance', FALSE),

-- Options for qst_msto204
('qst_msto204', 'Amazon', TRUE),
('qst_msto204', 'Microsoft', FALSE),
('qst_msto204', 'Google', FALSE),
('qst_msto204', 'IBM', FALSE),

-- Options for qst_msto205
('qst_msto205', 'False', TRUE),
('qst_msto205', 'True', FALSE);

-- Grant access to students for these quizzes
INSERT INTO quiz_access (quiz_id, user_id, granted_by)
VALUES 
('quiz_msto2', 'user_stu1', 'user_f0f2zw'),
('quiz_msto2', 'user_stu2', 'user_f0f2zw'),
('quiz_msto2', 'user_stu1', 'user_f0f2zw'),
('quiz_msto2', 'user_stu2', 'user_f0f2zw'),
('quiz_msto2', 'user_stu3', 'user_f0f2zw');

-- Verify the inserted data
SELECT * FROM quizzes WHERE created_by = 'user_f0f2zw';
SELECT * FROM questions WHERE created_by = 'user_f0f2zw';
SELECT * FROM options WHERE question_id LIKE 'qst_msto%';
SELECT * FROM quiz_access WHERE granted_by = 'user_f0f2zw';

-- Add responses from students who took the quizzes
INSERT INTO responses (id, quiz_id, user_id, completed_at, total_score, time_taken)
VALUES 
-- Alice's responses
('res_msto1', 'quiz_msto2', 'user_stu1', '2023-11-16 14:30:00', 24, 1800),
('res_msto2', 'quiz_msto2', 'user_stu1', '2023-11-21 15:45:00', 20, 1500),

-- Bob's responses
('res_msto3', 'quiz_msto1', 'user_stu2', '2023-11-17 10:15:00', 18, 2100),
('res_msto4', 'quiz_msto2', 'user_stu2', '2023-11-22 11:30:00', 22, 1700),

-- Charlie's response (only took cloud computing quiz)
('res_msto5', 'quiz_msto2', 'user_stu3', '2023-11-23 09:00:00', 19, 2000);

-- Add response details for Alice's Advanced Database quiz
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto1', 'qst_msto101', NULL, 1, TRUE, 3), -- Correct NoSQL answer
('res_msto1', 'qst_msto102', NULL, 6, TRUE, 1.25), -- ACID properties (4/4 correct)
('res_msto1', 'qst_msto102', NULL, 7, TRUE, 1.25),
('res_msto1', 'qst_msto102', NULL, 8, TRUE, 1.25),
('res_msto1', 'qst_msto102', NULL, 9, TRUE, 1.25),
('res_msto1', 'qst_msto103', 'CAP theorem states that a distributed system can only guarantee two out of three: Consistency, Availability, and Partition tolerance', NULL, TRUE, 8), -- Good explanation
('res_msto1', 'qst_msto104', NULL, 11, TRUE, 3), -- Correct MongoDB answer
('res_msto1', 'qst_msto105', NULL, 14, TRUE, 2); -- Correct Cassandra answer

-- Add response details for Alice's Cloud Computing quiz
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto2', 'qst_msto201', NULL, 16, TRUE, 3), -- Correct HaaS answer
('res_msto2', 'qst_msto202', NULL, 20, TRUE, 1.5), -- Cloud benefits (4/4 correct)
('res_msto2', 'qst_msto202', NULL, 21, TRUE, 1.5),
('res_msto2', 'qst_msto202', NULL, 22, TRUE, 1.5),
('res_msto2', 'qst_msto202', NULL, 23, TRUE, 1.5),
('res_msto2', 'qst_msto203', 'IaaS provides raw computing resources while PaaS provides a platform for application development', NULL, TRUE, 6), -- Good explanation
('res_msto2', 'qst_msto204', NULL, 25, TRUE, 2), -- Correct AWS answer
('res_msto2', 'qst_msto205', NULL, 28, TRUE, 2); -- Correct serverless answer

-- Add response details for Bob's Advanced Database quiz
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto3', 'qst_msto101', NULL, 2, FALSE, 0), -- Incorrect NoSQL answer
('res_msto3', 'qst_msto102', NULL, 6, TRUE, 1.25), -- ACID properties (3/4 correct)
('res_msto3', 'qst_msto102', NULL, 7, TRUE, 1.25),
('res_msto3', 'qst_msto102', NULL, 8, TRUE, 1.25),
('res_msto3', 'qst_msto103', 'CAP is about consistency and availability', NULL, FALSE, 4), -- Partial explanation
('res_msto3', 'qst_msto104', NULL, 11, TRUE, 3), -- Correct MongoDB answer
('res_msto3', 'qst_msto105', NULL, 14, TRUE, 2); -- Correct Cassandra answer

-- Add response details for Bob's Cloud Computing quiz
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto4', 'qst_msto201', NULL, 16, TRUE, 3), -- Correct HaaS answer
('res_msto4', 'qst_msto202', NULL, 20, TRUE, 1.5), -- Cloud benefits (3/4 correct)
('res_msto4', 'qst_msto202', NULL, 21, TRUE, 1.5),
('res_msto4', 'qst_msto202', NULL, 22, TRUE, 1.5),
('res_msto4', 'qst_msto203', 'IaaS is infrastructure, PaaS is platform', NULL, TRUE, 5), -- Brief but correct
('res_msto4', 'qst_msto204', NULL, 26, FALSE, 0), -- Incorrect AWS answer
('res_msto4', 'qst_msto205', NULL, 28, TRUE, 2); -- Correct serverless answer

-- Add response details for Charlie's Cloud Computing quiz
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto5', 'qst_msto201', NULL, 17, FALSE, 0), -- Incorrect answer
('res_msto5', 'qst_msto202', NULL, 20, TRUE, 1.5), -- Cloud benefits (2/4 correct)
('res_msto5', 'qst_msto202', NULL, 21, TRUE, 1.5),
('res_msto5', 'qst_msto203', 'IaaS gives you servers, PaaS gives you environments', NULL, TRUE, 4), -- Partial explanation
('res_msto5', 'qst_msto204', NULL, 25, TRUE, 2), -- Correct AWS answer
('res_msto5', 'qst_msto205', NULL, 27, FALSE, 0); -- Incorrect serverless answer

-- Verify the inserted responses
SELECT r.id, r.quiz_id, q.title, u.first_name, u.last_name, r.completed_at, r.total_score
FROM responses r
JOIN quizzes q ON r.quiz_id = q.id
JOIN users u ON r.user_id = u.id
WHERE q.created_by = 'user_f0f2zw';

SELECT rd.response_id, q.question_text, 
       CASE 
           WHEN rd.option_id IS NOT NULL THEN o.option_text
           ELSE rd.answer_text
       END AS answer,
       rd.is_correct, rd.marks_obtained
FROM response_details rd
LEFT JOIN options o ON rd.option_id = o.id
JOIN questions q ON rd.question_id = q.id
JOIN quizzes qz ON q.quiz_id = qz.id
WHERE qz.created_by = 'user_f0f2zw'
ORDER BY rd.response_id, rd.question_id;

delete  from users where id = 'user_87o7er';

-- First, ensure the teacher exists (or create if not exists)
INSERT IGNORE INTO users (id, email, password, first_name, last_name, role, department, institution_email)
VALUES ('user_f0f2zw', 'msto97@university.edu', '$2a$10$hashedpassword', 'Mohammed', 'Sto', 'teacher', 'Computer Science', 'm.sto@university.edu');

INSERT IGNORE INTO teachers (user_id, teacher_id, designation, joining_date)
VALUES ('user_f0f2zw', '202301040138', 'Assistant Professor', '2023-01-04');

-- Add quizzes created by user_f0f2zw with unique IDs
INSERT IGNORE INTO quizzes (id, title, description, created_by, total_marks, is_published, publish_date)
VALUES 
('quiz_msto_advdb', 'Advanced Database Systems', 'Quiz on NoSQL and distributed databases', 'user_f0f2zw', 30, TRUE, '2023-11-15 10:00:00'),
('quiz_msto_cloud', 'Cloud Computing Fundamentals', 'Quiz on cloud service models and deployment', 'user_f0f2zw', 25, TRUE, '2023-11-20 10:00:00'),
('quiz_msto_ml', 'Machine Learning Basics', 'Introductory concepts in ML', 'user_f0f2zw', 35, FALSE, NULL);

-- Add questions for Advanced Database Systems quiz
INSERT IGNORE INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_msto_advdb1', 'quiz_msto_advdb', 'Which of these is a NoSQL database type?', 'single', 3, 'user_f0f2zw'),
('qst_msto_advdb2', 'quiz_msto_advdb', 'What are the ACID properties?', 'multiple', 5, 'user_f0f2zw'),
('qst_msto_advdb3', 'quiz_msto_advdb', 'What is CAP theorem in distributed systems?', 'text', 8, 'user_f0f2zw'),
('qst_msto_advdb4', 'quiz_msto_advdb', 'MongoDB uses which query language?', 'single', 3, 'user_f0f2zw'),
('qst_msto_advdb5', 'quiz_msto_advdb', 'Is Cassandra a wide-column store?', 'boolean', 2, 'user_f0f2zw');

-- Options for Advanced Database questions
INSERT IGNORE INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_msto_advdb1
('qst_msto_advdb1', 'Document', TRUE),
('qst_msto_advdb1', 'Relational', FALSE),
('qst_msto_advdb1', 'Tabular', FALSE),
('qst_msto_advdb1', 'Linear', FALSE),

-- Options for qst_msto_advdb2
('qst_msto_advdb2', 'Atomicity', TRUE),
('qst_msto_advdb2', 'Consistency', TRUE),
('qst_msto_advdb2', 'Isolation', TRUE),
('qst_msto_advdb2', 'Durability', TRUE),
('qst_msto_advdb2', 'Availability', FALSE),

-- Options for qst_msto_advdb4
('qst_msto_advdb4', 'MQL (MongoDB Query Language)', TRUE),
('qst_msto_advdb4', 'SQL', FALSE),
('qst_msto_advdb4', 'GraphQL', FALSE),
('qst_msto_advdb4', 'NoQL', FALSE),

-- Options for qst_msto_advdb5
('qst_msto_advdb5', 'True', TRUE),
('qst_msto_advdb5', 'False', FALSE);

-- Add questions for Cloud Computing quiz
INSERT IGNORE INTO questions (id, quiz_id, question_text, answer_type, marks, created_by)
VALUES 
('qst_msto_cloud1', 'quiz_msto_cloud', 'Which is NOT a cloud service model?', 'single', 3, 'user_f0f2zw'),
('qst_msto_cloud2', 'quiz_msto_cloud', 'What are benefits of cloud computing?', 'multiple', 6, 'user_f0f2zw'),
('qst_msto_cloud3', 'quiz_msto_cloud', 'Explain the difference between IaaS and PaaS', 'text', 7, 'user_f0f2zw'),
('qst_msto_cloud4', 'quiz_msto_cloud', 'Which company provides AWS?', 'single', 2, 'user_f0f2zw'),
('qst_msto_cloud5', 'quiz_msto_cloud', 'Is serverless computing actually without servers?', 'boolean', 2, 'user_f0f2zw');

-- Options for Cloud Computing questions
INSERT IGNORE INTO options (question_id, option_text, is_correct)
VALUES 
-- Options for qst_msto_cloud1
('qst_msto_cloud1', 'Hardware as a Service', TRUE),
('qst_msto_cloud1', 'Software as a Service', FALSE),
('qst_msto_cloud1', 'Platform as a Service', FALSE),
('qst_msto_cloud1', 'Infrastructure as a Service', FALSE),

-- Options for qst_msto_cloud2
('qst_msto_cloud2', 'Scalability', TRUE),
('qst_msto_cloud2', 'Cost efficiency', TRUE),
('qst_msto_cloud2', 'High availability', TRUE),
('qst_msto_cloud2', 'Reduced maintenance', TRUE),
('qst_msto_cloud2', 'Better performance', FALSE),

-- Options for qst_msto_cloud4
('qst_msto_cloud4', 'Amazon', TRUE),
('qst_msto_cloud4', 'Microsoft', FALSE),
('qst_msto_cloud4', 'Google', FALSE),
('qst_msto_cloud4', 'IBM', FALSE),

-- Options for qst_msto_cloud5
('qst_msto_cloud5', 'False', TRUE),
('qst_msto_cloud5', 'True', FALSE);

-- Grant access to students for these quizzes (assuming these student users exist)
INSERT IGNORE INTO quiz_access (quiz_id, user_id, granted_by)
VALUES 
('quiz_msto_advdb', 'user_stu1', 'user_f0f2zw'),
('quiz_msto_cloud', 'user_stu1', 'user_f0f2zw'),
('quiz_msto_advdb', 'user_stu2', 'user_f0f2zw'),
('quiz_msto_cloud', 'user_stu2', 'user_f0f2zw'),
('quiz_msto_cloud', 'user_stu3', 'user_f0f2zw');

-- Add responses from students who took the quizzes
INSERT IGNORE INTO responses (id, quiz_id, user_id, completed_at, total_score, time_taken)
VALUES 
-- Alice's responses
('res_msto_advdb1', 'quiz_msto_advdb', 'user_stu1', '2023-11-16 14:30:00', 24, 1800),
('res_msto_cloud1', 'quiz_msto_cloud', 'user_stu1', '2023-11-21 15:45:00', 20, 1500),

-- Bob's responses
('res_msto_advdb2', 'quiz_msto_advdb', 'user_stu2', '2023-11-17 10:15:00', 18, 2100),
('res_msto_cloud2', 'quiz_msto_cloud', 'user_stu2', '2023-11-22 11:30:00', 22, 1700),

-- Charlie's response (only took cloud computing quiz)
('res_msto_cloud3', 'quiz_msto_cloud', 'user_stu3', '2023-11-23 09:00:00', 19, 2000);

-- Add response details for Alice's Advanced Database quiz
INSERT IGNORE INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto_advdb1', 'qst_msto_advdb1', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb1' AND option_text = 'Document'), TRUE, 3),
('res_msto_advdb1', 'qst_msto_advdb2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb2' AND option_text = 'Atomicity'), TRUE, 1.25),
('res_msto_advdb1', 'qst_msto_advdb2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb2' AND option_text = 'Consistency'), TRUE, 1.25),
('res_msto_advdb1', 'qst_msto_advdb2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb2' AND option_text = 'Isolation'), TRUE, 1.25),
('res_msto_advdb1', 'qst_msto_advdb2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb2' AND option_text = 'Durability'), TRUE, 1.25),
('res_msto_advdb1', 'qst_msto_advdb3', 'CAP theorem states that a distributed system can only guarantee two out of three: Consistency, Availability, and Partition tolerance', NULL, TRUE, 8),
('res_msto_advdb1', 'qst_msto_advdb4', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb4' AND option_text = 'MQL (MongoDB Query Language)'), TRUE, 3),
('res_msto_advdb1', 'qst_msto_advdb5', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_advdb5' AND option_text = 'True'), TRUE, 2);

-- Add response details for Alice's Cloud Computing quiz
INSERT IGNORE INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
('res_msto_cloud1', 'qst_msto_cloud1', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud1' AND option_text = 'Hardware as a Service'), TRUE, 3),
('res_msto_cloud1', 'qst_msto_cloud2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud2' AND option_text = 'Scalability'), TRUE, 1.5),
('res_msto_cloud1', 'qst_msto_cloud2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud2' AND option_text = 'Cost efficiency'), TRUE, 1.5),
('res_msto_cloud1', 'qst_msto_cloud2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud2' AND option_text = 'High availability'), TRUE, 1.5),
('res_msto_cloud1', 'qst_msto_cloud2', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud2' AND option_text = 'Reduced maintenance'), TRUE, 1.5),
('res_msto_cloud1', 'qst_msto_cloud3', 'IaaS provides raw computing resources while PaaS provides a platform for application development', NULL, TRUE, 6),
('res_msto_cloud1', 'qst_msto_cloud4', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud4' AND option_text = 'Amazon'), TRUE, 2),
('res_msto_cloud1', 'qst_msto_cloud5', NULL, (SELECT id FROM options WHERE question_id = 'qst_msto_cloud5' AND option_text = 'False'), TRUE, 2);

-- Verify the inserted data
SELECT * FROM quizzes WHERE created_by = 'user_f0f2zw';
SELECT * FROM questions WHERE created_by = 'user_f0f2zw';
SELECT q.id, q.question_text, o.option_text, o.is_correct 
FROM questions q
JOIN options o ON q.id = o.question_id
WHERE q.created_by = 'user_f0f2zw';
SELECT * FROM quiz_access WHERE granted_by = 'user_f0f2zw';

SELECT r.id, r.quiz_id, q.title, u.first_name, u.last_name, r.completed_at, r.total_score
FROM responses r
JOIN quizzes q ON r.quiz_id = q.id
JOIN users u ON r.user_id = u.id
WHERE q.created_by = 'user_f0f2zw';

select * from quizzes;
select * from teachers;


-- First, ensure the student exists (or create if not exists)
INSERT IGNORE INTO users (id, email, password, first_name, last_name, role, department, institution_email)
VALUES ('user_nyaulu', 'student.nyaulu@university.edu', '$2a$10$hashedpassword', 'Nyaulu', 'Student', 'student', 'Computer Science', 'nyaulu@university.edu');

INSERT IGNORE INTO students (user_id, prn_number, enrollment_date)
VALUES ('user_nyaulu', 'PRN2023005', '2023-09-01');

-- Grant access to some quizzes for this student
INSERT IGNORE INTO quiz_access (quiz_id, user_id, granted_by)
VALUES 
('quiz_001', 'user_nyaulu', 'user_teach1'),  -- Introduction to Programming
('quiz_002', 'user_nyaulu', 'user_teach1'),  -- Database Fundamentals
('quiz_msto_advdb', 'user_nyaulu', 'user_f0f2zw');  -- Advanced Database Systems

-- Add quiz attempts for user_nyaulu
INSERT INTO responses (id, quiz_id, user_id, completed_at, total_score, time_taken)
VALUES 
-- First attempt at Introduction to Programming (scored 16/20)
('res_nyaulu1', 'quiz_001', 'user_nyaulu', '2023-10-03 11:20:00', 16, 1500),

-- Second attempt at Database Fundamentals (scored 20/25)
('res_nyaulu2', 'quiz_002', 'user_nyaulu', '2023-10-16 14:45:00', 20, 1800),

-- Attempt at Advanced Database Systems (scored 22/30)
('res_nyaulu3', 'quiz_msto_advdb', 'user_nyaulu', '2023-11-17 09:30:00', 22, 2100);

-- Add response details for Introduction to Programming attempt
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
-- Question 1: Correct answer
('res_nyaulu1', 'qst_00101', NULL, 1, TRUE, 2),

-- Question 2: Partially correct (selected 2/3 correct options)
('res_nyaulu1', 'qst_00102', NULL, 1, TRUE, 1),
('res_nyaulu1', 'qst_00102', NULL, 2, TRUE, 1),

-- Question 3: Incorrect answer
('res_nyaulu1', 'qst_00103', '11', NULL, FALSE, 0),

-- Question 4: Correct answer
('res_nyaulu1', 'qst_00104', NULL, 6, TRUE, 1),

-- Question 5: Partial credit answer
('res_nyaulu1', 'qst_00105', 'A variable stores information', NULL, TRUE, 3);

-- Add response details for Database Fundamentals attempt
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
-- Question 1: Correct answer
('res_nyaulu2', 'qst_00201', NULL, 1, TRUE, 3),

-- Question 2: Partially correct (selected 2/3 correct options)
('res_nyaulu2', 'qst_00202', NULL, 1, TRUE, 1.33),
('res_nyaulu2', 'qst_00202', NULL, 2, TRUE, 1.33),

-- Question 3: Good answer
('res_nyaulu2', 'qst_00203', 'A primary key uniquely identifies each record in a table', NULL, TRUE, 5),

-- Question 4: Incorrect answer
('res_nyaulu2', 'qst_00204', '1000', NULL, FALSE, 0),

-- Question 5: Correct answer
('res_nyaulu2', 'qst_00205', NULL, 6, TRUE, 1);

-- Add response details for Advanced Database Systems attempt
INSERT INTO response_details (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
VALUES 
-- Question 1: Correct answer
('res_nyaulu3', 'qst_msto_advdb1', NULL, 1, TRUE, 3),

-- Question 2: Partially correct (3/4 correct options)
('res_nyaulu3', 'qst_msto_advdb2', NULL, 1, TRUE, 1.25),
('res_nyaulu3', 'qst_msto_advdb2', NULL, 2, TRUE, 1.25),
('res_nyaulu3', 'qst_msto_advdb2', NULL, 3, TRUE, 1.25),

-- Question 3: Partial credit answer
('res_nyaulu3', 'qst_msto_advdb3', 'CAP theorem is about consistency, availability, and partition tolerance', NULL, TRUE, 6),

-- Question 4: Correct answer
('res_nyaulu3', 'qst_msto_advdb4', NULL, 11, TRUE, 3),

-- Question 5: Correct answer
('res_nyaulu3', 'qst_msto_advdb5', NULL, 14, TRUE, 2);

-- Verify the inserted data
SELECT * FROM users WHERE id = 'user_nyaulu';
SELECT * FROM students WHERE user_id = 'user_nyaulu';
SELECT * FROM quiz_access WHERE user_id = 'user_nyaulu';
SELECT * FROM responses WHERE user_id = 'user_nyaulu';

SELECT r.id, q.title, r.total_score, q.total_marks, 
       CONCAT(ROUND((r.total_score/q.total_marks)*100, '%') as percentage,
       r.completed_at
FROM responses r
JOIN quizzes q ON r.quiz_id = q.id
WHERE r.user_id = 'user_nyaulu';

SELECT rd.response_id, q.question_text, 
       CASE 
           WHEN rd.option_id IS NOT NULL THEN o.option_text
           ELSE rd.answer_text
       END AS answer,
       rd.is_correct, rd.marks_obtained, q.marks
FROM response_details rd
LEFT JOIN options o ON rd.option_id = o.id
JOIN questions q ON rd.question_id = q.id
JOIN responses r ON rd.response_id = r.id
WHERE r.user_id = 'user_nyaulu'
ORDER BY rd.response_id, rd.question_id;

-- Check published quizzes
SELECT * FROM quizzes WHERE is_published = 1;

-- Check quiz access for a specific student (replace 'user_stu1' with actual student ID)
SELECT * FROM quiz_access WHERE user_id = 'user_nyaulu';
