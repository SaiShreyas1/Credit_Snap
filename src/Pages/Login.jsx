import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import studentLogo from '../assets/Student_without_bg_logo.png'; 
import canteenLogo from '../assets/Canteen_without_bg_logo.png'; 

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const isStudent = role === 'Student';

    // Validation Check for Students
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setEmailError('Access restricted: Please use your @iitk.ac.in email.');
      return; // Stop the login process
    }

    // If it passes, clear any old errors and proceed
    setEmailError('');
    console.log(`Logging in as ${role} with email: ${email}`);
    
    // --- THE MAGIC CONNECTION ---
    // Route the user to their correct dashboard!
    if (isStudent) {
      navigate('/student/dashboard');
    } else {
      navigate('/owner/editmenu');
    }
  };

  const isStudent = role === 'Student';

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
              onClick={() => { setRole('Student'); setEmailError(''); }}
            >
              Student
            </button>
            <button 
              type="button"
              className={`role-btn ${!isStudent ? 'active-yellow' : ''}`}
              onClick={() => { setRole('Canteen'); setEmailError(''); }}
            >
              Canteen
            </button>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Enter your mail" 
                className="custom-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
              {/* This will only show up if there is an error */}
              {emailError && <span className="error-text">{emailError}</span>}
            </div>
            
            <div className="input-group">
              <input type="password" placeholder="Enter your password" className="custom-input" required />
            </div>
            
            <div className="forgot-password-link">
              <span className="light-text">Have Trouble in sign in? </span>
              <a href="/forgot-password">Forgot Password.</a>
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