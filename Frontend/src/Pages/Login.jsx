import { BASE_URL } from '../config';
import React, { useState } from 'react';
import './Login.css';
import { useNavigate, Link } from 'react-router-dom';
import studentLogo from '../assets/Student_without_bg_logo.png';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  // --- STATES ---
  // Define state variables to manage user input, role selection, and error messages
  //--- STATES ---
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- LOGIN LOGIC ---
  // Function to authenticate the user and retrieve a session token from the backend
  //--- LOGIN LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const isStudent = role === 'Student';

    //1.Frontend Validation Check for IITK Emails
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setEmailError('Access restricted: Please use your @iitk.ac.in email.');
      return;
    }

    //Clear any old errors before trying to log in
    setEmailError('');
    setLoginError('');

    //2.CONNECTION TO MONGODB
    try {
      const response = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, password: password }),
      });

      const data = await response.json();

      //3.VALIDATE THE LOGIN
      if (data.status === 'success') {
        console.log("Login successful! VIP Token Generated.");

        // Clear any stale auth from a previous account before saving the new session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('canteenId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('canteenId');

        // Save the token and user data to the browser's current session
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.data.user));

        // Route the user based on their REAL role from the database
        if (data.data.user.role === 'student') {
          navigate('/student/dashboard');
        } else if (data.data.user.role === 'owner') {
          navigate('/owner/dashboard');
        }
      } else {
        //If the password was wrong, or email wasn't found, show the error!
        setLoginError(data.message);
      }
    } catch (error) {
      setLoginError('Cannot connect to the backend server. Is nodemon running?');
    }
  };

  const isStudent = role === 'Student';

  // Return the complete login UI including dynamic branding and form fields depending on role
  return (
    <div className="login-page">
      <div className={`login-left-panel ${isStudent ? 'bg-blue-theme' : 'bg-yellow-theme'}`}>
        <div className="brand-logo-wrap">
          <img
            src={isStudent ? studentLogo : canteenLogo}
            alt={`CreditSnap ${role} Logo`}
            className="brand-logo"
          />
        </div>
      </div>

      <div className="login-right-panel">
        <div className="form-container">
          <h1 className="login-heading">LOGIN</h1>

          <div className={`role-selector ${isStudent ? 'selector-blue' : 'selector-yellow'}`}>
            <button
              type="button"
              className={`role-btn ${isStudent ? 'active-blue' : ''}`}
              onClick={() => {
                setRole('Student');
                setEmailError('');
                setLoginError('');
                setEmail('');
                setPassword('');
                setShowPassword(false);
              }}
            >
              Student
            </button>
            <button
              type="button"
              className={`role-btn ${!isStudent ? 'active-yellow' : ''}`}
              onClick={() => {
                setRole('Canteen');
                setEmailError('');
                setLoginError('');
                setEmail('');
                setPassword('');
                setShowPassword(false);
              }}
            >
              Canteen
            </button>
          </div>

          <form className="login-form" onSubmit={handleLogin}>

            {/* --- EMAIL INPUT --- */}
            <div className="input-group">
              <input
                type="email"
                placeholder="Enter your mail"
                className="custom-input"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@+-]/g, ''))}
                required
              />
              {emailError && <span className="error-text" style={{ color: 'red', marginTop: '5px', display: 'block' }}>{emailError}</span>}
            </div>

            {/* --- PASSWORD INPUT --- */}
            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="custom-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
                </button>
              </div>
              {loginError && <span className="error-text" style={{ color: 'red', marginTop: '5px', display: 'block' }}>{loginError}</span>}
            </div>

            <div className="forgot-password-link">
              <span className="light-text">Have Trouble in sign in? </span>
              <Link to="/forgot-password" state={{ role }}>Forgot Password.</Link>
            </div>

            <button
              type="submit"
              className={`primary-login-btn ${isStudent ? 'btn-blue' : 'btn-yellow'}`}
            >
              LOGIN
            </button>
          </form>

          <div className={`signup-redirect ${isStudent ? '' : 'signup-redirect-hidden'}`}>
            <span className="light-text">Don't have an account? </span>
            <a href="/signup">Sign Up.</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
