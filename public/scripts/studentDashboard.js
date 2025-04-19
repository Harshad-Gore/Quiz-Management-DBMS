document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    checkAuthAndRole();

    // Initialize the dashboard
    initDashboard();

    // Sidebar toggle functionality
    document.getElementById('toggle-sidebar').addEventListener('click', function () {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('sidebar-active');
        } else {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContent.classList.toggle('ml-64');
        }
    });

    // Navigation links
    document.getElementById('dashboard-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('dashboard-section');
    });

    document.getElementById('quizzes-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('quizzes-section');
    });

    document.getElementById('results-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('results-section');
        loadResults();
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Quiz modal close button
    document.getElementById('close-quiz-modal').addEventListener('click', () => {
        document.getElementById('quiz-modal').classList.add('hidden');
    });

    // Result modal close button
    document.getElementById('close-result-modal').addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
    });
    document.getElementById('close-result-modal-btn').addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
    });

    // Quiz form submission
    document.getElementById('quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitQuiz();
    });
});

// Check authentication and role
function checkAuthAndRole() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role !== 'student') {
        window.location.href = 'index.html';
        return;
    }
}

// Initialize dashboard
function initDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));

    // Set user info
    document.getElementById('user-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('user-id').textContent = user.id;
    document.getElementById('user-initials').textContent = getInitials(user.first_name, user.last_name);

    document.getElementById('profile-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('profile-id').textContent = `ID: ${user.id}`;
    document.getElementById('profile-department').textContent = user.department;
    document.getElementById('profile-initials').textContent = getInitials(user.first_name, user.last_name);

    // Load student-specific data
    loadStudentData(user.id);
    loadRecentAttempts(user.id);
}

// Get initials from name
function getInitials(firstName, lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections first
    const sections = ['dashboard-section', 'quizzes-section', 'results-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add('hidden');
        }
    });

    // Show the requested section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // If it's the quizzes section, wait for it to be visible
        if (sectionId === 'quizzes-section') {
            // Force a reflow to ensure the section is rendered
            targetSection.offsetHeight;
            
            // Now load the quizzes
            loadAvailableQuizzes();
        }
    } else {
        console.error(`Section ${sectionId} not found`);
    }

    // Update active link in sidebar
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('bg-indigo-700');
    });

    if (sectionId === 'dashboard-section') {
        document.getElementById('dashboard-link').classList.add('bg-indigo-700');
    } else if (sectionId === 'quizzes-section') {
        document.getElementById('quizzes-link').classList.add('bg-indigo-700');
    } else if (sectionId === 'results-section') {
        document.getElementById('results-link').classList.add('bg-indigo-700');
    }
}

// Load student data (PRN, etc.)
async function loadStudentData(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/students/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        // First check if the response is OK (status 200-299)
        if (!response.ok) {
            // Try to get error message from response
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load student data');
        }

        document.getElementById('prn-display').textContent = `PRN: ${data.student.prn_number}`;
        loadStatistics(userId);
    } catch (error) {
        console.error('Error loading student data:', error);
        // Show user-friendly error message
        alert('Failed to load student data. Please try again later.');
    }
}

async function loadRecentAttempts(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/students/${userId}/attempts?limit=5`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        // First check response status
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server responded with:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data.success || !Array.isArray(data.attempts)) {
            throw new Error('Invalid response format from server');
        }

        const container = document.getElementById('recent-attempts');
        container.innerHTML = '';

        if (data.attempts.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">No quiz attempts yet</div>';
            return;
        }

        data.attempts.forEach(attempt => {
            // Your rendering logic here
        });

    } catch (error) {
        console.error('Error loading recent attempts:', error);
        document.getElementById('recent-attempts').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i> 
                Failed to load recent attempts: ${error.message}
            </div>
        `;
    }
}

async function loadStatistics(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/students/${userId}/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load statistics');
        }

        // Safely handle average_score (might be null or undefined)
        const averageScore = data.average_score || 0; // Default to 0 if null/undefined
        const formattedAverage = typeof averageScore === 'number'
            ? averageScore.toFixed(1)
            : 'N/A'; // Fallback if not a number

        // Update UI with stats
        document.getElementById('quizzes-taken').textContent = data.quizzes_taken || 0;
        document.getElementById('highest-score').textContent = data.highest_score || 0;
        document.getElementById('average-score').textContent = formattedAverage;
        document.getElementById('rank').textContent = data.rank || 'N/A';

    } catch (error) {
        console.error('Error loading statistics:', error);
        // Show error to user
        document.getElementById('average-score').textContent = 'Error';
        document.getElementById('quizzes-taken').textContent = 'Error';
        document.getElementById('highest-score').textContent = 'Error';
        document.getElementById('rank').textContent = 'Error';
    }
}

async function loadRecentAttempts(userId) {
    try {
        const container = document.getElementById('recent-attempts');
        container.innerHTML = `
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                <span class="text-gray-600">Loading your recent attempts...</span>
            </div>
        `;

        const response = await fetch(`http://localhost:3000/api/students/${userId}/attempts?limit=5`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        container.innerHTML = '';

        if (data.attempts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block p-4 bg-blue-50 rounded-full mb-3">
                        <i class="fas fa-clipboard-list text-blue-500 text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-700">No quiz attempts yet</h3>
                    <p class="text-gray-500">Your attempts will appear here once you complete a quiz</p>
                </div>
            `;
            return;
        }

        data.attempts.forEach(attempt => {
            const percentage = (attempt.score / attempt.total_marks * 100).toFixed(1);
            const date = new Date(attempt.completed_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const attemptElement = document.createElement('div');
            attemptElement.className = 'bg-white rounded-xl shadow-sm p-5 mb-4 border border-gray-100 hover:border-indigo-100 transition-all duration-200';
            attemptElement.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <i class="fas fa-question-circle text-indigo-600"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-800 text-lg">${attempt.quiz_title}</h3>
                                <p class="text-sm text-gray-500">
                                    <i class="far fa-clock mr-1"></i> ${date}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end">
                        <div class="flex items-center mb-1">
                            <span class="text-2xl font-bold text-gray-800 mr-2">${attempt.score}</span>
                            <span class="text-gray-500">/ ${attempt.total_marks}</span>
                        </div>
                        
                        <div class="w-full flex items-center">
                            <div class="flex-1 bg-gray-100 rounded-full h-2 mr-2">
                                <div class="h-2 rounded-full ${getScoreColorClass(percentage)}" 
                                     style="width: ${percentage}%"></div>
                            </div>
                            <span class="text-sm font-medium ${getScoreTextColorClass(percentage)}">
                                ${percentage}%
                            </span>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(attemptElement);
        });

    } catch (error) {
        console.error('Error loading recent attempts:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-block p-4 bg-red-50 rounded-full mb-3">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-700">Failed to load attempts</h3>
                <p class="text-gray-500">${error.message}</p>
                <button onclick="loadRecentAttempts('${userId}')" 
                        class="mt-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                    <i class="fas fa-sync-alt mr-2"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Helper functions for styling
function getScoreColorClass(percentage) {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-red-500';
}

function getScoreTextColorClass(percentage) {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-blue-600';
    return 'text-red-600';
}

// Get color based on score percentage
function getScoreColor(percentage) {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'blue';
    return 'red';
}

async function loadAvailableQuizzes() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await fetch('/api/student/available-quizzes', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        // First check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load available quizzes');
        }

        if (!data.success) {
            throw new Error(data.message || 'Failed to load available quizzes');
        }

        const quizzes = data.quizzes || [];
        const container = document.getElementById('available-quizzes-container');
        
        if (!container) {
            console.error('Quiz container not found');
            return;
        }

        container.innerHTML = '';

        if (quizzes.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No available quizzes at the moment.</p>';
            return;
        }

        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition mb-4 border border-gray-100';
            quizCard.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${quiz.title}</h3>
                        <p class="text-sm text-gray-500">
                            <i class="fas fa-chalkboard-teacher mr-1"></i>
                            By ${quiz.teacher_first_name} ${quiz.teacher_last_name}
                        </p>
                    </div>
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        ${quiz.total_marks} Marks
                    </span>
                </div>
                <p class="text-gray-600 mb-4">${quiz.description || 'No description provided'}</p>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 gap-2">
                    <div class="flex items-center">
                        <i class="fas fa-building mr-1"></i>
                        <span>Department: ${quiz.department}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-clock mr-1"></i>
                        <span>Time Limit: ${quiz.time_limit} minutes</span>
                    </div>
                </div>
                <div class="mt-4">
                    <button 
                        class="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition flex items-center justify-center"
                        onclick="startQuiz('${quiz.id}')"
                    >
                        <i class="fas fa-play mr-2"></i>
                        Start Quiz
                    </button>
                </div>
            `;
            container.appendChild(quizCard);
        });
    } catch (error) {
        console.error('Error loading available quizzes:', error);
        const container = document.getElementById('available-quizzes-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block p-4 bg-red-50 rounded-full mb-3">
                        <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-700">Error loading quizzes</h3>
                    <p class="text-gray-500 mb-4">${error.message}</p>
                    <button onclick="loadAvailableQuizzes()" 
                            class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                        <i class="fas fa-sync-alt mr-2"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Function to start a quiz
async function startQuiz(quizId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) {
            throw new Error('User not authenticated');
        }

        // Store quiz ID in session storage for the quiz page
        sessionStorage.setItem('currentQuizId', quizId);
        
        // Redirect to quiz page
        window.location.href = 'quiz.html';
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Failed to start quiz. Please try again.');
    }
}

// Submit quiz
async function submitQuiz() {
    const quizId = document.getElementById('quiz-form').dataset.quizId;
    const questions = document.querySelectorAll('.question');
    const answers = [];

    questions.forEach(question => {
        const questionId = question.dataset.questionId;
        const answerType = question.dataset.answerType;
        let answer;

        if (answerType === 'single' || answerType === 'multiple') {
            const selectedOptions = question.querySelectorAll('input:checked');
            answer = Array.from(selectedOptions).map(opt => opt.value);
        } else if (answerType === 'boolean') {
            const selectedOption = question.querySelector('input:checked');
            answer = selectedOption ? selectedOption.value : null;
        } else {
            // Text or number
            const input = question.querySelector('input');
            answer = input.value;
        }

        answers.push({
            question_id: questionId,
            answer: answer
        });
    });

    try {
        const response = await fetch(`http://localhost:3000/api/quizzes/${quizId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ answers })
        });

        if (!response.ok) {
            throw new Error('Failed to submit quiz');
        }

        const result = await response.json();

        // Close quiz modal
        document.getElementById('quiz-modal').classList.add('hidden');

        // Show result
        showResultDetails(result.response_id);

        // Refresh dashboard
        const user = JSON.parse(localStorage.getItem('user'));
        loadStatistics(user.id);
        loadRecentAttempts(user.id);
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Failed to submit quiz. Please try again.');
    }
}

// Load results
async function loadResults() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/students/${user.id}/attempts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }

        const attempts = await response.json();
        const container = document.getElementById('results-list');

        if (attempts.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">No quiz attempts yet</div>';
            return;
        }

        container.innerHTML = '';

        attempts.forEach(attempt => {
            const percentage = (attempt.score / attempt.total_marks * 100).toFixed(1);
            const date = new Date(attempt.completed_at).toLocaleString();

            const attemptElement = document.createElement('div');
            attemptElement.className = 'bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 cursor-pointer';
            attemptElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold">${attempt.quiz_title}</h3>
                        <p class="text-sm text-gray-600">Completed on ${date}</p>
                    </div>
                    <div class="flex items-center">
                        <div class="w-24 bg-gray-200 rounded-full h-2.5 mr-3">
                            <div class="bg-${getScoreColor(percentage)}-600 h-2.5 rounded-full" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <span class="font-medium">${attempt.score}/${attempt.total_marks}</span>
                    </div>
                </div>
            `;

            attemptElement.addEventListener('click', () => {
                showResultDetails(attempt.response_id);
            });

            container.appendChild(attemptElement);
        });
    } catch (error) {
        console.error('Error loading results:', error);
        document.getElementById('results-list').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i> Failed to load results
            </div>
        `;
    }
}

// Show result details
async function showResultDetails(responseId) {
    try {
        // Show loading state
        document.getElementById('result-details').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i> Loading result details...
            </div>
        `;

        document.getElementById('result-modal').classList.remove('hidden');

        // Fetch result details
        const response = await fetch(`http://localhost:3000/api/responses/${responseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch result details');
        }

        const result = await response.json();

        // Set result header info
        document.getElementById('result-quiz-title').textContent = result.quiz_title;
        document.getElementById('result-score').textContent = result.score;
        document.getElementById('result-total').textContent = result.total_marks;

        // Render result details
        const detailsContainer = document.getElementById('result-details');
        detailsContainer.innerHTML = '';

        result.questions.forEach((question, index) => {
            let answerHtml = '';
            let feedbackClass = '';

            if (question.is_correct) {
                feedbackClass = 'text-green-600';
            } else {
                feedbackClass = 'text-red-600';
            }

            if (question.answer_type === 'single' || question.answer_type === 'multiple' || question.answer_type === 'boolean') {
                answerHtml = `
                    <div class="mb-2">
                        <span class="font-medium">Your answer:</span> 
                        <span class="${feedbackClass}">${question.user_answer || 'Not answered'}</span>
                    </div>
                    <div>
                        <span class="font-medium">Correct answer:</span> 
                        ${question.correct_answer}
                    </div>
                `;
            } else {
                // Text or number answer
                answerHtml = `
                    <div class="mb-2">
                        <span class="font-medium">Your answer:</span> 
                        <span class="${feedbackClass}">${question.user_answer || 'Not answered'}</span>
                    </div>
                    ${question.correct_answer ? `
                    <div>
                        <span class="font-medium">Correct answer:</span> 
                        ${question.correct_answer}
                    </div>
                    ` : ''}
                `;
            }

            const questionElement = document.createElement('div');
            questionElement.className = 'p-4 border rounded-lg';
            questionElement.innerHTML = `
                <h3 class="font-bold mb-2">${index + 1}. ${question.question_text}</h3>
                <div class="ml-4 mb-3 text-sm">
                    <span class="text-gray-500">${question.marks} mark(s)</span>
                    <span class="ml-2 ${feedbackClass}">
                        ${question.is_correct ? 'Correct' : 'Incorrect'} 
                        (${question.marks_obtained}/${question.marks} marks)
                    </span>
                </div>
                <div class="ml-4">
                    ${answerHtml}
                </div>
            `;

            detailsContainer.appendChild(questionElement);
        });
    } catch (error) {
        console.error('Error loading result details:', error);
        document.getElementById('result-details').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i> Failed to load result details
            </div>
        `;
    }
}