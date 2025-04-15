document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
  
    if (!token || !user) {
      window.location.href = 'loginSignUp.html';
      return;
    }
  
    // Verify user is a student
    if (user.role == 'student') {
      window.location.href = 'student-dashboard.html';
      return;
    }
  
    try {
      // Load dashboard data
      const response = await fetch(`/api/student/dashboard?studentId=${user.id}`);
  
      const data = await response.json();
  
      if (!data.success) {
        throw new Error(data.message || 'Failed to load dashboard');
      }
  
      // Update UI with student data
      updateStudentProfile(data.student);
      updateStatistics(data.stats);
  
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
  
  function updateStudentProfile(student) {
    // Update profile sections
    const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`;
    const fullName = `${student.first_name} ${student.last_name}`;
    const role = student.role.charAt(0).toUpperCase() + student.role.slice(1);
  
    // Sidebar profile
    document.getElementById('user-initials').textContent = initials;
    document.getElementById('user-name').textContent = fullName;
    document.getElementById('user-role').textContent = role;
    document.getElementById('user-id').textContent = student.id;
  
    // Main profile card
    document.getElementById('profile-initials').textContent = initials;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-role').textContent = role;
    document.getElementById('profile-id').textContent = `ID: ${student.id}`;
    document.getElementById('profile-department').textContent = student.department;
    document.getElementById('student-id-display').textContent = student.student_id;
    document.getElementById('designation-display').textContent = student.designation || 'Not specified';
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
      localStorage.clear();
      window.location.href = 'loginSignUp.html';
      
    });
  }