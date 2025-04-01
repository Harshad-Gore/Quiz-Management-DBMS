document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    window.location.href = 'loginSignUp.html';
    return;
  }

  // Verify user is a teacher
  if (user.role !== 'teacher') {
    window.location.href = 'index.html';
    return;
  }

  try {
    // Load dashboard data
    const response = await fetch(`/api/teacher/dashboard?teacherId=${user.id}`);

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to load dashboard');
    }

    // Update UI with teacher data
    updateTeacherProfile(data.teacher);
    updateStatistics(data.stats);
    populateRecentQuizzes(data.recentQuizzes);
    populateRecentSubmissions(data.recentSubmissions);

    // Initialize sidebar toggle
    initSidebar();

  } catch (error) {
    console.error('Dashboard error:', error);
    alert('Failed to load dashboard data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    //window.location.href = 'loginSignUp.html';
  }
});

function updateTeacherProfile(teacher) {
  // Update profile sections
  const initials = `${teacher.first_name.charAt(0)}${teacher.last_name.charAt(0)}`;
  const fullName = `${teacher.first_name} ${teacher.last_name}`;
  const role = teacher.role.charAt(0).toUpperCase() + teacher.role.slice(1);

  // Sidebar profile
  document.getElementById('user-initials').textContent = initials;
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-role').textContent = role;
  document.getElementById('user-id').textContent = teacher.id;

  // Main profile card
  document.getElementById('profile-initials').textContent = initials;
  document.getElementById('profile-name').textContent = fullName;
  document.getElementById('profile-role').textContent = role;
  document.getElementById('profile-id').textContent = `ID: ${teacher.id}`;
  document.getElementById('profile-department').textContent = teacher.department;
  document.getElementById('teacher-id-display').textContent = teacher.teacher_id;
  document.getElementById('designation-display').textContent = teacher.designation || 'Not specified';
}

function updateStatistics(stats) {
  document.getElementById('quizzes-count').textContent = stats.totalQuizzes;
  document.getElementById('published-quizzes').textContent = stats.publishedQuizzes;
  document.getElementById('total-marks').textContent = stats.totalMarksCreated;
  document.getElementById('average-score').textContent = stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A';
}

function populateRecentQuizzes(quizzes) {
  const container = document.getElementById('recent-quizzes-container');
  container.innerHTML = '';

  quizzes.forEach(quiz => {
    const quizCard = document.createElement('div');
    quizCard.className = 'border rounded-lg p-4 hover:shadow-md transition';
    quizCard.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold">${quiz.title}</h3>
          <span class="text-xs ${quiz.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded">
            ${quiz.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
        <p class="text-sm text-gray-600 mb-3">${quiz.total_marks} Marks • ${new Date(quiz.created_at).toLocaleDateString()}</p>
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-500">Created: ${formatTimeAgo(quiz.created_at)}</span>
          <div class="flex space-x-2">
            <button class="text-indigo-600 hover:text-indigo-800 view-results" data-quiz-id="${quiz.id}">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button class="text-indigo-600 hover:text-indigo-800 edit-quiz" data-quiz-id="${quiz.id}">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `;
    container.appendChild(quizCard);
  });

  // Add event listeners for buttons
  document.querySelectorAll('.view-results').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const quizId = e.currentTarget.getAttribute('data-quiz-id');
      window.location.href = `quiz-results.html?quizId=${quizId}`;
    });
  });

  document.querySelectorAll('.edit-quiz').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const quizId = e.currentTarget.getAttribute('data-quiz-id');
      window.location.href = `edit-quiz.html?quizId=${quizId}`;
    });
  });
}

function populateRecentSubmissions(submissions) {
  const tableBody = document.getElementById('recent-submissions');
  tableBody.innerHTML = '';

  submissions.forEach(sub => {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-indigo-600">${sub.title}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${sub.first_name} ${sub.last_name}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          ${sub.total_score || 'Pending'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${sub.completed_at ? new Date(sub.completed_at).toLocaleString() : 'In progress'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="text-indigo-600 hover:text-indigo-800 view-submission" data-submission-id="${sub.id}">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      `;
    tableBody.appendChild(row);
  });

  // Add event listeners for view buttons
  document.querySelectorAll('.view-submission').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const submissionId = e.currentTarget.getAttribute('data-submission-id');
      window.location.href = `submission-detail.html?submissionId=${submissionId}`;
    });
  });
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function initSidebar() {
  // Toggle sidebar
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

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'loginSignUp.html';
  });
}