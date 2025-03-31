// db.js - MySQL2 Database Interactions for Quiz Management System
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Harsh@2004',
    database: process.env.DB_NAME || 'quiz_management_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Save a complete quiz to the database
 * @param {Object} quizData - The quiz data to save
 * @returns {Promise<Object>} - Result of the operation
 */
async function saveQuiz(quizData) {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Begin transaction
        await connection.beginTransaction();

        // 1. Save quiz metadata
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

        // 2. Save questions
        for (const question of quizData.questions) {
            await connection.execute(
                `INSERT INTO questions (id, quiz_id, question_text, answer_type, marks, time_limit)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    question.id,
                    quizData.id,
                    question.text,
                    question.type,
                    question.marks,
                    question.timeLimit || 0
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

        // Commit transaction
        await connection.commit();
        
        return {
            success: true,
            quizId: quizData.id,
            message: 'Quiz saved successfully'
        };
    } catch (error) {
        // Rollback transaction if there's an error
        if (connection) await connection.rollback();
        
        console.error('Database error in saveQuiz:', error);
        throw {
            success: false,
            message: 'Failed to save quiz',
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Get a quiz by its ID with all questions and options
 * @param {string} quizId - The quiz ID to retrieve
 * @returns {Promise<Object>} - The quiz data
 */
async function getQuiz(quizId) {
    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Get quiz metadata
        const [quizRows] = await connection.execute(
            `SELECT * FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (quizRows.length === 0) {
            throw new Error('Quiz not found');
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

        return {
            success: true,
            quiz: quiz
        };
    } catch (error) {
        console.error('Database error in getQuiz:', error);
        throw {
            success: false,
            message: 'Failed to retrieve quiz',
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Get all quizzes (basic metadata only)
 * @returns {Promise<Array>} - Array of quizzes
 */
async function getAllQuizzes() {
    let connection;
    try {
        connection = await pool.getConnection();

        const [quizzes] = await connection.execute(
            `SELECT id, title, description, created_at, total_marks 
             FROM quizzes ORDER BY created_at DESC`
        );

        return {
            success: true,
            quizzes: quizzes
        };
    } catch (error) {
        console.error('Database error in getAllQuizzes:', error);
        throw {
            success: false,
            message: 'Failed to retrieve quizzes',
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Delete a quiz and all its related data
 * @param {string} quizId - The quiz ID to delete
 * @returns {Promise<Object>} - Result of the operation
 */
async function deleteQuiz(quizId) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cascading delete will handle questions and options
        const [result] = await connection.execute(
            `DELETE FROM quizzes WHERE id = ?`,
            [quizId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Quiz not found');
        }

        await connection.commit();
        
        return {
            success: true,
            message: 'Quiz deleted successfully'
        };
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Database error in deleteQuiz:', error);
        throw {
            success: false,
            message: 'Failed to delete quiz',
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Get quiz results/analytics
 * @param {string} quizId - The quiz ID to get results for
 * @returns {Promise<Object>} - Quiz results data
 */
async function getQuizResults(quizId) {
    // Implementation would depend on your response tracking system
    // This is just a placeholder structure
    return {
        success: true,
        results: {
            totalAttempts: 0,
            averageScore: 0,
            questionAnalytics: []
        }
    };
}

module.exports = {
    saveQuiz,
    getQuiz,
    getAllQuizzes,
    deleteQuiz,
    getQuizResults,
    pool
};
