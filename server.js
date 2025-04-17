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

// Initialize database connection
let pool;
async function initializeDatabase() {
    try {
        pool = mysql.createPool(dbConfig);

        // Test the connection
        const connection = await pool.getConnection();
        console.log('Database connection established successfully');
        connection.release();

        return true;
    } catch (error) {
        console.error('Error connecting to the database:', error);
        return false;
    }
}

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
          SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published_quizzes,
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


// Get student statistics
app.get('/api/students/:userId/stats', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify access
        if (req.user.id !== userId && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as quizzes_taken,
                MAX(r.total_score) as highest_score,
                AVG(r.total_score) as average_score
            FROM responses r
            WHERE r.user_id = ?
        `, [userId]);

        // Get rank (fixed implementation)
        const [rank] = await pool.query(`
            SELECT COUNT(*) + 1 as \`rank\`
            FROM (
                SELECT user_id, AVG(total_score) as avg_score
                FROM responses
                GROUP BY user_id
            ) t
            WHERE t.avg_score > (
                SELECT AVG(total_score) 
                FROM responses 
                WHERE user_id = ?
            )
        `, [userId]);

        res.json({
            success: true,
            quizzes_taken: stats[0].quizzes_taken || 0,
            highest_score: stats[0].highest_score || 0,
            average_score: stats[0].average_score || 0,
            rank: rank[0]?.rank || 'N/A'  // Added optional chaining
        });
    } catch (error) {
        console.error('Error fetching student stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student statistics'
        });
    }
});

// Quiz Management Endpoints
app.post('/api/quizzes', async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: 'Database connection not initialized'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const quizData = req.body;

        // 1. Save quiz metadata
        await connection.execute(
            `INSERT INTO quizzes (id, title, description, created_at, total_marks, created_by, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                quizData.id,
                quizData.title,
                quizData.description,
                new Date(quizData.createdAt).toISOString().slice(0, 19).replace('T', ' '),
                quizData.totalMarks,
                quizData.createdBy,
                true
            ]
        );

        // 2. Save questions
        for (const question of quizData.questions) {
            await connection.execute(
                `INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, time_limit, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    question.id,
                    quizData.id,
                    question.text,
                    question.type,
                    question.marks,
                    question.timeLimit || 0,
                    quizData.createdBy
                ]
            );

            // 3. Save options if this is a multiple/single choice question
            if (question.options && question.options.length > 0) {
                for (const option of question.options) {
                    await connection.execute(
                        `INSERT INTO options (question_id, option_text, is_correct)
                         VALUES (?, ?, ?)`,
                        [
                            question.id,
                            option.text,
                            option.correct ? 1 : 0
                        ]
                    );
                }
            }
        }

        await connection.commit();
        res.json({
            success: true,
            quizId: quizData.id,
            message: 'Quiz saved successfully'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error saving quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save quiz',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/quizzes/:quizId', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const quizId = req.params.quizId;

        // 1. Get quiz metadata
        const [quizRows] = await connection.execute(
            `SELECT * FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (quizRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        const quiz = quizRows[0];

        // 2. Get all questions for this quiz
        const [questionRows] = await connection.execute(
            `SELECT * FROM questions WHERE quiz_id = ? ORDER BY id`,
            [quizId]
        );

        // 3. Get options for each question
        for (const question of questionRows) {
            if (question.answer_type === 'single' || question.answer_type === 'multiple') {
                const [optionRows] = await connection.execute(
                    `SELECT * FROM options WHERE question_id = ?`,
                    [question.id]
                );
                question.options = optionRows;
            }
        }

        quiz.questions = questionRows;

        res.json({
            success: true,
            quiz: quiz
        });
    } catch (error) {
        console.error('Error getting quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quiz',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/quizzes', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [quizzes] = await connection.execute(
            `SELECT id, title, description, created_at, total_marks 
             FROM quizzes ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            quizzes: quizzes
        });
    } catch (error) {
        console.error('Error getting quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve quizzes',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/quizzes/:quizId', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const quizId = req.params.quizId;

        // Cascading delete will handle questions and options
        const [result] = await connection.execute(
            `DELETE FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error deleting quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete quiz',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/quizzes/:quizId/results', async (req, res) => {
    try {
        // Implementation would depend on your response tracking system
        res.json({
            success: true,
            results: {
                totalAttempts: 0,
                averageScore: 0,
                questionAnalytics: []
            }
        });
    } catch (error) {
        console.error('Error getting quiz results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quiz results',
            error: error.message
        });
    }
});

// Get student data
app.get('/api/students/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify the requesting user has access to this data
        if (req.user.id !== userId && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to student data'
            });
        }

        const [student] = await pool.query(`
            SELECT u.*, s.prn_number, s.enrollment_date 
            FROM users u
            JOIN students s ON u.id = s.user_id
            WHERE u.id = ?
        `, [userId]);

        if (student.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            student: {
                id: student[0].id,
                first_name: student[0].first_name,
                last_name: student[0].last_name,
                email: student[0].email,
                department: student[0].department,
                prn_number: student[0].prn_number,
                enrollment_date: student[0].enrollment_date
            }
        });

    } catch (error) {
        console.error('Error fetching student data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student data'
        });
    }
});

// Get student quiz attempts
app.get('/api/students/:userId/attempts', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;

        // Verify the requesting user has access to this data
        if (req.user.id !== userId && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to student data'
            });
        }

        // Base query
        let query = `
            SELECT 
                r.id AS response_id,
                q.id AS quiz_id,
                q.title AS quiz_title,
                q.total_marks,
                r.total_score AS score,
                r.completed_at,
                r.time_taken
            FROM responses r
            JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = ?
        `;

        // Add ordering and limit if specified
        query += ' ORDER BY r.completed_at DESC';
        if (limit) {
            query += ' LIMIT ?';
        }

        const [attempts] = await pool.query(query, limit ? [userId, limit] : [userId]);

        res.json({
            success: true,
            attempts: attempts.map(attempt => ({
                response_id: attempt.response_id,
                quiz_id: attempt.quiz_id,
                quiz_title: attempt.quiz_title,
                total_marks: attempt.total_marks,
                score: attempt.score,
                completed_at: attempt.completed_at,
                time_taken: attempt.time_taken
            }))
        });

    } catch (error) {
        console.error('Error fetching student attempts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student attempts'
        });
    }
});

// Get detailed quiz attempt results
app.get('/api/responses/:responseId', authenticateToken, async (req, res) => {
    try {
        const { responseId } = req.params;

        // 1. Get the main response data
        const [response] = await pool.query(`
            SELECT 
                r.*,
                q.title AS quiz_title,
                q.total_marks,
                u.first_name,
                u.last_name
            FROM responses r
            JOIN quizzes q ON r.quiz_id = q.id
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [responseId]);

        if (response.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Response not found'
            });
        }

        // 2. Get all response details (answers to questions)
        const [details] = await pool.query(`
            SELECT 
                rd.*,
                q.question_text,
                q.answer_type,
                q.marks,
                o.option_text AS selected_option_text,
                co.option_text AS correct_option_text
            FROM response_details rd
            JOIN questions q ON rd.question_id = q.id
            LEFT JOIN options o ON rd.option_id = o.id
            LEFT JOIN options co ON co.question_id = q.id AND co.is_correct = 1
            WHERE rd.response_id = ?
            ORDER BY rd.id
        `, [responseId]);

        // Format the response data
        const result = {
            response_id: response[0].id,
            quiz_id: response[0].quiz_id,
            quiz_title: response[0].quiz_title,
            student_name: `${response[0].first_name} ${response[0].last_name}`,
            total_marks: response[0].total_marks,
            score: response[0].total_score,
            completed_at: response[0].completed_at,
            time_taken: response[0].time_taken,
            questions: []
        };

        // Group questions and format answers
        details.forEach(detail => {
            let correctAnswer;
            let userAnswer;

            switch (detail.answer_type) {
                case 'single':
                case 'multiple':
                    correctAnswer = detail.correct_option_text;
                    userAnswer = detail.selected_option_text;
                    break;
                case 'boolean':
                    correctAnswer = detail.is_correct ? 'true' : 'false';
                    userAnswer = detail.answer_text;
                    break;
                default:
                    correctAnswer = detail.answer_text; // For text/number questions
                    userAnswer = detail.answer_text;
            }

            result.questions.push({
                question_id: detail.question_id,
                question_text: detail.question_text,
                answer_type: detail.answer_type,
                marks: detail.marks,
                marks_obtained: detail.marks_obtained,
                is_correct: detail.is_correct,
                user_answer: userAnswer,
                correct_answer: correctAnswer,
                time_taken: detail.time_taken
            });
        });

        res.json({
            success: true,
            result
        });

    } catch (error) {
        console.error('Error fetching response details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch response details'
        });
    }
});

// Updated /api/quizzes/available endpoint
app.get('/api/quizzes/available', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // For students: Get quizzes they have access to via quiz_access table
        if (userRole === 'student') {
            const [quizzes] = await pool.query(`
                SELECT q.* 
                FROM quizzes q
                JOIN quiz_access qa ON q.id = qa.quiz_id
                WHERE q.is_published = 1
                AND qa.user_id = ?
                ORDER BY q.created_at DESC
            `, [userId]);

            return res.json({
                success: true,
                quizzes: quizzes
            });
        }
        // For teachers: Get all published quizzes
        else if (userRole === 'teacher') {
            const [quizzes] = await pool.query(`
                SELECT * FROM quizzes
                WHERE is_published = 1
                ORDER BY created_at DESC
            `);

            return res.json({
                success: true,
                quizzes: quizzes
            });
        }

        res.status(403).json({
            success: false,
            message: 'Unauthorized access'
        });

    } catch (error) {
        console.error('Error fetching available quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available quizzes'
        });
    }
});

// Submit quiz answers
app.post('/api/quizzes/:quizId/submit', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { quizId } = req.params;
        const { answers } = req.body;
        const userId = req.user.id;

        // 1. Get quiz details to calculate total marks
        const [quiz] = await connection.query(`
            SELECT id, total_marks FROM quizzes WHERE id = ?
        `, [quizId]);

        if (quiz.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        // 2. Create response record
        const responseId = generateId('res');
        await connection.query(`
            INSERT INTO responses (id, quiz_id, user_id, total_score, completed_at)
            VALUES (?, ?, ?, 0, NOW())
        `, [responseId, quizId, userId]);

        let totalScore = 0;

        // 3. Process each answer
        for (const answer of answers) {
            const [question] = await connection.query(`
                SELECT id, answer_type, marks 
                FROM questions 
                WHERE id = ? AND quiz_id = ?
            `, [answer.question_id, quizId]);

            if (question.length === 0) continue;

            const questionData = question[0];
            let isCorrect = false;
            let marksObtained = 0;
            let correctOptionId = null;

            // Check if answer is correct
            if (questionData.answer_type === 'single' || questionData.answer_type === 'multiple') {
                // For MCQ questions, get correct options from database
                const [correctOptions] = await connection.query(`
                    SELECT id FROM options 
                    WHERE question_id = ? AND is_correct = 1
                `, [answer.question_id]);

                // Compare user's answer with correct options
                if (correctOptions.length > 0) {
                    correctOptionId = correctOptions[0].id;

                    if (questionData.answer_type === 'single') {
                        isCorrect = answer.answer.length === 1 &&
                            answer.answer[0] === correctOptions[0].id;
                    } else {
                        // For multiple choice, check if all correct options are selected
                        const correctIds = correctOptions.map(o => o.id);
                        isCorrect = arraysEqual(answer.answer.sort(), correctIds.sort());
                    }
                }
            } else if (questionData.answer_type === 'boolean') {
                // For boolean questions, compare directly
                const [correctAnswer] = await connection.query(`
                    SELECT option_text FROM options 
                    WHERE question_id = ? AND is_correct = 1 LIMIT 1
                `, [answer.question_id]);

                if (correctAnswer.length > 0) {
                    isCorrect = answer.answer === correctAnswer[0].option_text;
                }
            } else {
                // For text/number questions, we can't auto-grade
                isCorrect = false;
            }

            // Calculate marks obtained
            marksObtained = isCorrect ? questionData.marks : 0;
            totalScore += marksObtained;

            // Save response details
            await connection.query(`
                INSERT INTO response_details (
                    response_id, 
                    question_id, 
                    answer_text, 
                    option_id, 
                    is_correct, 
                    marks_obtained
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                responseId,
                answer.question_id,
                typeof answer.answer === 'string' ? answer.answer : null,
                (questionData.answer_type === 'single' || questionData.answer_type === 'multiple') ?
                    answer.answer[0] : null,
                isCorrect ? 1 : 0,
                marksObtained
            ]);
        }

        // 4. Update response with total score
        await connection.query(`
            UPDATE responses 
            SET total_score = ? 
            WHERE id = ?
        `, [totalScore, responseId]);

        await connection.commit();

        res.json({
            success: true,
            response_id: responseId,
            quiz_id: quizId,
            total_score: totalScore,
            total_marks: quiz[0].total_marks
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error submitting quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quiz'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Helper function to compare arrays
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server only after database is initialized
initializeDatabase().then(success => {
    if (success) {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } else {
        console.error('Failed to start server due to database connection issues');
        process.exit(1);
    }
});