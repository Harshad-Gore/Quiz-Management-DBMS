// db.js - API calls for Quiz Management System

/**
 * Save a complete quiz to the database
 * @param {Object} quizData - The quiz data to save
 * @returns {Promise<Object>} - Result of the operation
 */
export async function saveQuiz(quizData) {
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quizData)
        });

        if (!response.ok) {
            throw new Error('Failed to save quiz');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving quiz:', error);
        throw error;
    }
}

/**
 * Get a quiz by its ID with all questions and options
 * @param {string} quizId - The quiz ID to retrieve
 * @returns {Promise<Object>} - The quiz data
 */
export async function getQuiz(quizId) {
    try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        
        if (!response.ok) {
            throw new Error('Failed to retrieve quiz');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting quiz:', error);
        throw error;
    }
}

/**
 * Get all quizzes (basic metadata only)
 * @returns {Promise<Array>} - Array of quizzes
 */
export async function getAllQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        
        if (!response.ok) {
            throw new Error('Failed to retrieve quizzes');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting quizzes:', error);
        throw error;
    }
}

/**
 * Delete a quiz and all its related data
 * @param {string} quizId - The quiz ID to delete
 * @returns {Promise<Object>} - Result of the operation
 */
export async function deleteQuiz(quizId) {
    try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete quiz');
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting quiz:', error);
        throw error;
    }
}

/**
 * Get quiz results/analytics
 * @param {string} quizId - The quiz ID to get results for
 * @returns {Promise<Object>} - Quiz results data
 */
export async function getQuizResults(quizId) {
    try {
        const response = await fetch(`/api/quizzes/${quizId}/results`);
        
        if (!response.ok) {
            throw new Error('Failed to get quiz results');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting quiz results:', error);
        throw error;
    }
}
