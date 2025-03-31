// Form submission - Signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
        firstName: document.getElementById('first-name').value,
        lastName: document.getElementById('last-name').value,
        email: document.getElementById('email').value,
        institutionEmail: document.getElementById('institution-email').value,
        password: document.getElementById('password').value,
        department: document.getElementById('department').value,
        role: document.querySelector('input[name="role"]:checked').value,
        prn: document.getElementById('prn').value,
        teacherId: document.getElementById('teacher-id').value,
        designation: document.getElementById('designation').value
    };

    // Validate passwords match
    if (userData.password !== document.getElementById('confirm-password').value) {
        alert('Passwords do not match!');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Registration failed');
        }

        // Save token and redirect to dashboard
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Signup error:', error);
        alert(error.message);
    }
});

// Form submission - Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }

        // Save token and redirect to dashboard
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
    }
});