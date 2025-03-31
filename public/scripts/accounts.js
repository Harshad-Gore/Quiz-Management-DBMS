document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const response = await fetch('http://localhost:3000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Store token and user data
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Redirect based on role
          if (data.user.role === 'teacher') {
            window.location.href = 'teacher-dashboard.html';
          } else {
            window.location.href = 'student-dashboard.html';
          }
        } else {
          alert(data.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
      }
    });
  
    // Signup form submission
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        firstName: document.getElementById('first-name').value,
        lastName: document.getElementById('last-name').value,
        email: document.getElementById('email').value,
        institutionEmail: document.getElementById('institution-email').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirm-password').value,
        department: document.getElementById('department').value,
        role: document.querySelector('input[name="role"]:checked').value
      };
      
      // Add role-specific fields
      if (formData.role === 'student') {
        formData.prn = document.getElementById('prn').value;
      } else {
        formData.teacherId = document.getElementById('teacher-id').value;
        formData.designation = document.getElementById('designation').value;
      }
      
      try {
        const response = await fetch('http://localhost:3000/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Store token and user data
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Redirect based on role
          if (data.user.role === 'teacher') {
            window.location.href = 'teacher-dashboard.html';
          } else {
            window.location.href = 'student-dashboard.html';
          }
        } else {
          alert(data.message || 'Signup failed');
        }
      } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup');
      }
    });
  });