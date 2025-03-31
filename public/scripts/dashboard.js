// document.addEventListener('DOMContentLoaded', async function() {
//     const token = localStorage.getItem('token');
//     const user = JSON.parse(localStorage.getItem('user'));

//     if (!token || !user) {
//         window.location.href = 'login.html';
//         return;
//     }

//     // Load user data
//     try {
//         const response = await fetch('/api/user/dashboard', {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         const data = await response.json();

//         if (!data.success) {
//             throw new Error(data.message || 'Failed to load dashboard');
//         }

//         // Update UI with real data
//         updateDashboard(data);
//         setupEventListeners();
//     } catch (error) {
//         console.error('Dashboard error:', error);
//         alert(error.message);
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         window.location.href = 'login.html';
//     }
// });

function updateDashboard(data) {
    const { user, recentActivity, quizzes } = data;

    // Update profile sections
    document.getElementById('user-initials').textContent = 
        user.firstName.charAt(0) + user.lastName.charAt(0);
    document.getElementById('user-name').textContent = 
        `${user.firstName} ${user.lastName}`;
    document.getElementById('user-role').textContent = 
        user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('user-id').textContent = user.uniqueId;

    document.getElementById('profile-initials').textContent = 
        user.firstName.charAt(0) + user.lastName.charAt(0);
    document.getElementById('profile-name').textContent = 
        `${user.firstName} ${user.lastName}`;
    document.getElementById('profile-role').textContent = 
        user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('profile-id').textContent = `ID: ${user.uniqueId}`;
    document.getElementById('profile-department').textContent = user.department;

    document.getElementById('quizzes-count').textContent = user.quizzesCreated;
    document.getElementById('quizzes-taken').textContent = user.quizzesTaken;
    document.getElementById('average-score').textContent = user.averageScore;

    // Update recent activity
    const activityTable = document.getElementById('recent-activity');
    activityTable.innerHTML = ''; // Clear existing rows
    
    recentActivity.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-indigo-600">${item.quiz}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.date}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${item.type === 'Exam' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                    ${item.type}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${item.score}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ${item.status}
                </span>
            </td>
        `;
        activityTable.appendChild(row);
    });

    // Update quizzes section
    const quizzesContainer = document.getElementById('recent-quizzes').querySelector('.grid');
    quizzesContainer.innerHTML = ''; // Clear existing cards
    
    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'border rounded-lg p-4 hover:shadow-md transition';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold">${quiz.title}</h3>
                <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">${quiz.status || 'Active'}</span>
            </div>
            <p class="text-sm text-gray-600 mb-3">${quiz.question_count} Questions • ${quiz.total_marks} Marks</p>
            <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">Created: ${quiz.created_at}</span>
                <div class="flex space-x-2">
                    <button class="text-indigo-600 hover:text-indigo-800">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="text-indigo-600 hover:text-indigo-800">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
        quizzesContainer.appendChild(card);
    });

    // Show/hide sections based on role
    if (user.role === 'student') {
        document.getElementById('upcoming-quizzes').classList.remove('hidden');
        document.getElementById('recent-quizzes').classList.add('hidden');
    } else {
        document.getElementById('upcoming-quizzes').classList.add('hidden');
        document.getElementById('recent-quizzes').classList.remove('hidden');
    }
}

function setupEventListeners() {
    // Toggle sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('sidebar-active');
        } else {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContent.classList.toggle('ml-64');
        }
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
}