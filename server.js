require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

function generateId(prefix) {
    const randomString = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${randomString}`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'c895e33bdb49ae9793b7dde1e4c2fb4067dc2041b6730d15456f9e88b376bdb1';

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        // const user = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const { password: _, ...userData } = user;
        res.json({ success: true, user: userData, token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// User Signup
app.post('/api/signup', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            institutionEmail,
            password,
            confirmPassword,
            department,
            role,
            prn,
            teacherId,
            designation
        } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        const [emailCheck] = await pool.query('SELECT id FROM users WHERE email = ? OR institution_email = ?',
            [email, institutionEmail]);

        if (emailCheck.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = generateId('user');

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(
                `INSERT INTO users (id, email, password, first_name, last_name, role, department, institution_email) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, email, hashedPassword, firstName, lastName, role, department, institutionEmail]
            );

            if (role === 'student') {
                await connection.query(
                    `INSERT INTO students (user_id, prn_number, enrollment_date) 
             VALUES (?, ?, CURDATE())`,
                    [userId, prn]
                );
            } else if (role === 'teacher') {
                await connection.query(
                    `INSERT INTO teachers (user_id, teacher_id, designation, joining_date) 
             VALUES (?, ?, ?, CURDATE())`,
                    [userId, teacherId, designation]
                );
            }

            await connection.commit();

            const token = jwt.sign(
                { id: userId, email, role },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: {
                    id: userId,
                    firstName,
                    lastName,
                    email,
                    institutionEmail,
                    role,
                    department
                },
                token
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
});

// Get teacher dashboard data
app.get('/api/teacher/dashboard', async (req, res) => {
    try {
        const teacherId = req.query.teacherId;

        // Get teacher info
        const [teacher] = await pool.query(`
        SELECT u.*, t.teacher_id, t.designation 
        FROM users u
        JOIN teachers t ON u.id = t.user_id
        WHERE u.id = ?
      `, [teacherId]);

        if (teacher.length === 0) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }

        // Get quiz statistics
        const [quizStats] = await pool.query(`
        SELECT 
          COUNT(*) as total_quizzes,
          SUM(is_published) as published_quizzes,
          SUM(total_marks) as total_marks_created
        FROM quizzes
        WHERE created_by = ?
      `, [teacherId]);

        // Get recent quizzes
        const [recentQuizzes] = await pool.query(`
        SELECT id, title, description, is_published, total_marks, created_at
        FROM quizzes
        WHERE created_by = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [teacherId]);

        // Get recent submissions
        const [recentSubmissions] = await pool.query(`
        SELECT r.id, q.title, u.first_name, u.last_name, r.total_score, r.completed_at
        FROM responses r
        JOIN quizzes q ON r.quiz_id = q.id
        JOIN users u ON r.user_id = u.id
        WHERE q.created_by = ?
        ORDER BY r.completed_at DESC
        LIMIT 5
      `, [teacherId]);

        res.json({
            success: true,
            teacher: teacher[0],
            stats: {
                totalQuizzes: quizStats[0].total_quizzes || 0,
                publishedQuizzes: quizStats[0].published_quizzes || 0,
                totalMarksCreated: quizStats[0].total_marks_created || 0,
                averageScore: 0 // You can calculate this later
            },
            recentQuizzes,
            recentSubmissions
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get student dashboard data
app.get('/api/student/dashboard', async (req, res) => {
    try {
        const studentId = req.query.studentId;

        // Get student info
        const [student] = await pool.query(`
        SELECT u.*, s.prn_number, s.enrollment_date 
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.id = ?
      `, [studentId]);

        if (student.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Get quiz statistics
        const [quizStats] = await pool.query(`
        SELECT 
          COUNT(*) as total_quizzes,
          SUM(is_published) as published_quizzes,
          SUM(total_marks) as total_marks_created,
          AVG(total_score) as average_score
        FROM quizzes q
        JOIN responses r ON q.id = r.quiz_id
        WHERE r.user_id = ?
      `, [studentId]);

        // Get recent quizzes taken by the student
        const [recentQuizzes] = await pool.query(`
        SELECT q.id, q.title, q.description, r.total_score, r.completed_at
        FROM quizzes q
        JOIN responses r ON q.id = r.quiz_id
        WHERE r.user_id = ?
        ORDER BY r.completed_at DESC
        LIMIT 5
      `, [studentId]);

        res.json({
            success: true,
            student: student[0],
            stats: {
                totalQuizzes: quizStats[0].total_quizzes || 0,
                publishedQuizzes: quizStats[0].published_quizzes || 0,
                totalMarksCreated: quizStats[0].total_marks_created || 0,
                averageScore: quizStats[0].average_score || 0
            },
            recentQuizzes
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});