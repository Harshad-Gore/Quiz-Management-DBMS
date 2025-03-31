const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { saveQuiz, getQuiz, getAllQuizzes, deleteQuiz, getQuizResults} = require('./public/scripts/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Harsh@2004',
    database: process.env.DB_NAME || 'quiz_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function executeQuery(sql, params) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// Get all quizzes
app.get('/api/quizzes', async (req, res) => {
    try {
        const result = await getAllQuizzes();
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

// Get a specific quiz
app.get('/api/quizzes/:id', async (req, res) => {
    try {
        const result = await getQuiz(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

// API Routes

// create a new quiz
app.post('/api/quizzes', async (req, res) => {
    try {
        const quizData = req.body;
        
        // Generate unique IDs if not provided
        quizData.id = quizData.id || `quiz-${uuidv4()}`;
        quizData.createdAt = new Date().toISOString();
        
        // Calculate total marks
        quizData.totalMarks = quizData.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

        // Begin transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert quiz
            await connection.execute(
                `INSERT INTO quizzes (id, title, description, created_at, total_marks)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    quizData.id,
                    quizData.title,
                    quizData.description,
                    quizData.createdAt,
                    quizData.totalMarks
                ]
            );

            // Insert questions
            for (const question of quizData.questions) {
                question.id = question.id || `q-${uuidv4()}`;
                
                await connection.execute(
                    `INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, time_limit)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        question.id,
                        quizData.id,
                        question.text,
                        question.type,
                        question.marks || 1,
                        question.timeLimit || 0
                    ]
                );

                // Insert options if this is a multiple/single choice question
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

            // Commit transaction
            await connection.commit();
            
            res.status(201).json({
                success: true,
                quizId: quizData.id,
                message: 'Quiz created successfully'
            });
        } catch (error) {
            // Rollback transaction if any error occurs
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create quiz',
            error: error.message
        });
    }
});

// Get all quizzes (metadata only)
app.get('/api/quizzes', async (req, res) => {
    try {
        const quizzes = await executeQuery(
            `SELECT id, title, description, created_at, total_marks 
             FROM quizzes ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            quizzes
        });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quizzes',
            error: error.message
        });
    }
});

// Get a single quiz with all questions and options
app.get('/api/quizzes/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;

        // Get quiz metadata
        const [quiz] = await executeQuery(
            `SELECT * FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        // Get all questions for this quiz
        const questions = await executeQuery(
            `SELECT * FROM questions WHERE quiz_id = ? ORDER BY id`,
            [quizId]
        );

        // Get options for each question (for MCQ questions)
        for (const question of questions) {
            if (question.answer_type === 'single' || question.answer_type === 'multiple') {
                question.options = await executeQuery(
                    `SELECT id, option_text, is_correct 
                     FROM options WHERE question_id = ?`,
                    [question.id]
                );
            }
        }

        quiz.questions = questions;

        res.json({
            success: true,
            quiz
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quiz',
            error: error.message
        });
    }
});

// Delete a quiz
app.delete('/api/quizzes/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;

        // Cascading delete will handle questions and options
        const result = await executeQuery(
            `DELETE FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        res.json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete quiz',
            error: error.message
        });
    }
});

// 2. Quiz Response Endpoints

// Submit a quiz response
app.post('/api/quizzes/:quizId/responses', async (req, res) => {
    try {
        const { quizId } = req.params;
        const { userId, answers } = req.body;

        // Begin transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Create response record
            const startedAt = new Date();
            const [responseResult] = await connection.execute(
                `INSERT INTO responses (quiz_id, user_id, started_at)
                 VALUES (?, ?, ?)`,
                [quizId, userId || null, startedAt]
            );

            const responseId = responseResult.insertId;
            let totalScore = 0;

            // Process each answer
            for (const answer of answers) {
                let isCorrect = false;
                let marksObtained = 0;

                // Get the question details
                const [question] = await connection.execute(
                    `SELECT marks, answer_type FROM questions WHERE id = ?`,
                    [answer.questionId]
                );

                if (!question[0]) continue;

                const questionMarks = question[0].marks || 1;
                const answerType = question[0].answer_type;

                // Validate answer based on question type
                if (answerType === 'text' || answerType === 'number') {
                    // For text/number answers, we'd need to compare with correct answer
                    // This would require storing correct answers for these types
                    // For now, we'll just record the response
                    isCorrect = false; // Would need actual validation
                } 
                else if (answerType === 'single' || answerType === 'multiple') {
                    // For MCQs, check if selected options are correct
                    if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
                        // Get correct options for this question
                        const [correctOptions] = await connection.execute(
                            `SELECT id FROM options 
                             WHERE question_id = ? AND is_correct = 1`,
                            [answer.questionId]
                        );

                        const correctOptionIds = correctOptions.map(opt => opt.id);
                        
                        // For single choice, check if the selected option is correct
                        if (answerType === 'single') {
                            isCorrect = correctOptionIds.includes(answer.selectedOptionIds[0]);
                        } 
                        // For multiple choice, check if all selected options are correct
                        // and all correct options are selected
                        else {
                            const allSelectedCorrect = answer.selectedOptionIds.every(id => 
                                correctOptionIds.includes(id));
                            const allCorrectSelected = correctOptionIds.every(id => 
                                answer.selectedOptionIds.includes(id));
                            isCorrect = allSelectedCorrect && allCorrectSelected;
                        }
                    }
                } 
                else if (answerType === 'boolean') {
                    // For true/false questions, compare with correct answer
                    // Would need to store correct boolean answer in questions table
                    isCorrect = false; // Would need actual validation
                }

                // Calculate marks obtained
                if (isCorrect) {
                    marksObtained = questionMarks;
                    totalScore += marksObtained;
                }

                // Save response details
                await connection.execute(
                    `INSERT INTO response_details 
                     (response_id, question_id, answer_text, option_id, is_correct, marks_obtained)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        responseId,
                        answer.questionId,
                        answer.answerText || null,
                        answer.selectedOptionIds ? answer.selectedOptionIds[0] : null,
                        isCorrect ? 1 : 0,
                        marksObtained
                    ]
                );
            }

            // Update response with completion time and total score
            await connection.execute(
                `UPDATE responses 
                 SET completed_at = ?, total_score = ?
                 WHERE id = ?`,
                [new Date(), totalScore, responseId]
            );

            // Commit transaction
            await connection.commit();
            
            res.status(201).json({
                success: true,
                responseId,
                totalScore,
                message: 'Response submitted successfully'
            });
        } catch (error) {
            // Rollback transaction if any error occurs
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit response',
            error: error.message
        });
    }
});

// Get quiz results/analytics
app.get('/api/quizzes/:quizId/results', async (req, res) => {
    try {
        const { quizId } = req.params;

        // Get basic quiz info
        const [quiz] = await executeQuery(
            `SELECT id, title FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        // Get response statistics
        const [stats] = await executeQuery(
            `SELECT 
                COUNT(*) as total_attempts,
                AVG(total_score) as average_score,
                MAX(total_score) as highest_score
             FROM responses
             WHERE quiz_id = ?`,
            [quizId]
        );

        // Get question-wise analytics
        const questionAnalytics = await executeQuery(
            `SELECT 
                q.id as question_id,
                q.question_text,
                q.marks,
                COUNT(rd.id) as response_count,
                AVG(rd.marks_obtained) as average_marks,
                SUM(rd.is_correct) as correct_count
             FROM questions q
             LEFT JOIN response_details rd ON q.id = rd.question_id
             LEFT JOIN responses r ON rd.response_id = r.id AND r.quiz_id = ?
             WHERE q.quiz_id = ?
             GROUP BY q.id`,
            [quizId, quizId]
        );

        res.json({
            success: true,
            results: {
                quiz,
                totalAttempts: stats.total_attempts || 0,
                averageScore: stats.average_score || 0,
                highestScore: stats.highest_score || 0,
                questionAnalytics
            }
        });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quiz results',
            error: error.message
        });
    }
});

function generateUniqueId(prefix) {
    return `${prefix}_${Math.random().toString(36).substr(2, 8)}`;
}

// User Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, institutionEmail, password, department, role, prn, teacherId, designation } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !institutionEmail || !password || !department || !role) {
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }

        // Validate role-specific fields
        if (role === 'student' && !prn) {
            return res.status(400).json({ success: false, message: 'PRN number is required for students' });
        }
        if (role === 'teacher' && !teacherId) {
            return res.status(400).json({ success: false, message: 'Teacher ID is required for teachers' });
        }

        // Check if email already exists
        const [emailExists] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR institution_email = ?',
            [email, institutionEmail]
        );
        
        if (emailExists.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateUniqueId('user');

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert user
            await connection.query(
                `INSERT INTO users (id, email, password, first_name, last_name, role, department, institution_email)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, email, hashedPassword, firstName, lastName, role, department, institutionEmail]
            );

            // Insert role-specific data
            if (role === 'student') {
                await connection.query(
                    `INSERT INTO students (user_id, prn_number)
                     VALUES (?, ?)`,
                    [userId, prn]
                );
            } else {
                await connection.query(
                    `INSERT INTO teachers (user_id, teacher_id, designation)
                     VALUES (?, ?, ?)`,
                    [userId, teacherId, designation || null]
                );
            }

            await connection.commit();

            // Generate JWT token
            const token = jwt.sign(
                { userId, email, role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: userId,
                    firstName,
                    lastName,
                    email,
                    role,
                    department
                }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// User Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const [users] = await pool.query(
            `SELECT users.*, 
             students.prn_number AS prn, 
             teachers.teacher_id, 
             teachers.designation
             FROM users
             LEFT JOIN students ON users.id = students.user_id
             LEFT JOIN teachers ON users.id = teachers.user_id
             WHERE users.email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

// Dashboard Data Endpoint
app.get('/api/user/dashboard', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get user profile
        const [user] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.role, u.department,
             COUNT(DISTINCT q.id) AS quizzes_created,
             COUNT(DISTINCT r.id) AS quizzes_taken,
             COALESCE(AVG(rd.marks_obtained), 0) AS avg_score
             FROM users u
             LEFT JOIN quizzes q ON u.id = q.created_by
             LEFT JOIN results r ON u.id = r.user_id
             LEFT JOIN response_details rd ON r.id = rd.response_id
             WHERE u.id = ?
             GROUP BY u.id`, 
            [userId]
        );

        if (!user[0]) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get recent activity
        const [activity] = await pool.query(
            `SELECT q.title AS quiz, DATE_FORMAT(r.completed_at, '%Y-%m-%d') AS date,
             'Exam' AS type, CONCAT(r.score, '/', r.total_marks) AS score, 'Completed' AS status
             FROM results r
             JOIN quizzes q ON r.quiz_id = q.id
             WHERE r.user_id = ?
             ORDER BY r.completed_at DESC
             LIMIT 5`,
            [userId]
        );

        // Get recent quizzes (for teachers) or upcoming quizzes (for students)
        let quizzes = [];
        if (user[0].role === 'teacher') {
            [quizzes] = await pool.query(
                `SELECT id, title, description, 
                 (SELECT COUNT(*) FROM questions WHERE quiz_id = quizzes.id) AS question_count,
                 (SELECT SUM(marks) FROM questions WHERE quiz_id = quizzes.id) AS total_marks,
                 DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
                 'Active' AS status
                 FROM quizzes
                 WHERE created_by = ?
                 ORDER BY created_at DESC
                 LIMIT 3`,
                [userId]
            );
        } else {
            [quizzes] = await pool.query(
                `SELECT q.id, q.title, q.description,
                 (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS question_count,
                 (SELECT SUM(marks) FROM questions WHERE quiz_id = q.id) AS total_marks,
                 DATE_FORMAT(q.created_at, '%Y-%m-%d') AS created_at
                 FROM quizzes q
                 WHERE q.id NOT IN (
                     SELECT quiz_id FROM results WHERE user_id = ?
                 )
                 ORDER BY q.created_at DESC
                 LIMIT 3`,
                [userId]
            );
        }

        res.json({
            success: true,
            user: {
                uniqueId: user[0].id,
                firstName: user[0].first_name,
                lastName: user[0].last_name,
                role: user[0].role,
                department: user[0].department,
                quizzesCreated: user[0].quizzes_created,
                quizzesTaken: user[0].quizzes_taken,
                averageScore: Math.round(user[0].avg_score) + '%'
            },
            recentActivity: activity,
            quizzes
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load dashboard', error: error.message });
    }
});

// Authentication middleware
async function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}


if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

module.exports = app;