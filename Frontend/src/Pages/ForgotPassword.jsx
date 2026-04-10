import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import studentLogo from '../assets/Student_without_bg_logo.png';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';

// Injecting the CSS directly into a variable to retain hover states and media queries
const inlineCSS = `
  /* Container styling for the entire forgot password viewport to prevent scrolling */
  /* Full page layout - Locked to exact window height */
  .forgot-page {
    display: flex;
    height: 100vh; 
    width: 100vw;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    overflow: hidden; 
  }

  .forgot-left-panel {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.4s ease;
  }

  /* Switching between predefined brand colors dependent on active requested role */
  /* --- THEMES --- */
  .bg-yellow-theme { background-color: #FFFDE7; }
  .bg-blue-theme { background-color: #e5eff5; }

  .btn-yellow { background-color: #D4AC0D; }
  .btn-yellow:hover { background-color: #B8860B; }

  .btn-blue { background-color: #183B66; }
  .btn-blue:hover { background-color: #0F2540; }

  .brand-logo {
    max-width: 350px; 
    width: 80%;
    height: auto;
  }

  .forgot-right-panel {
    flex: 1;
    background-color: #FFFFFF;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0; 
  }

  .form-container {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px; 
  }

  .forgot-heading {
    color: #183B66; 
    font-size: 28px; 
    margin-bottom: 10px; 
  }

  .instruction-text {
    color: #666666;
    text-align: center;
    font-size: 14px;
    margin-bottom: 30px;
    line-height: 1.5;
  }

  .forgot-form { 
    width: 100%; 
    display: flex; 
    flex-direction: column; 
  }

  .input-group { 
    margin-bottom: 15px; 
  }

  .custom-input {
    width: 100%;
    padding: 12px; 
    border: 1px solid #B0B0B0;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .custom-input:focus {
    border-color: #183B66;
    outline: none;
  }

  .primary-forgot-btn {
    color: #FFFFFF;
    border: none;
    padding: 12px;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    width: 75%;
    display: block; 
    margin: 15px auto 0 auto; 
    transition: background-color 0.3s ease;
  }

  .light-text {
    color: #888888;
  }

  .login-redirect { 
    margin-top: 25px; 
    font-size: 13px; 
    text-align: center;
  }

  .login-redirect a {
    color: #183B66;
    text-decoration: none;
    font-weight: 600;
  }

  /* Change orientation layout to stack panels cleanly on smaller mobile screens */
  /* Responsive adjustments */
  @media (max-width: 800px) {
    .forgot-page {
      flex-direction: column;
      overflow: auto; 
    }
    .forgot-left-panel {
      padding: 20px 0;
    }
    .brand-logo {
      max-width: 200px;
    }
    .forgot-right-panel {
      padding: 20px;
    }
  }

  /* Error message styling */
  .error-text {
    color: #D32F2F;
    font-size: 13px;
    display: block;
    margin-top: 5px;
    text-align: left;
    font-weight: 500;
  }
`;

const ForgotPassword = () => {
  const location = useLocation();
  const role = location.state?.role || 'Student';
  const isStudent = role === 'Student';
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger password reset logic managing payload submission and tracking server response
  const handleReset = async (e) => {
    e.preventDefault();

    // Ensure the inputted email matches the required institute domain address rules
    // Validation Check
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setEmailError('Please enter a valid @iitk.ac.in email address.');
      return;
    }

    setEmailError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/users/forgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSuccessMsg('A password reset link has been sent to your email!');
      } else {
        setEmailError(data.message || 'Failed to send reset link.');
      }
    } catch (error) {
      setEmailError('Cannot connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the components for the forgot password page with adaptable styling based on role
  return (
    <>
      <style>{inlineCSS}</style>
      <div className="forgot-page">
        <div className={`forgot-left-panel ${isStudent ? 'bg-blue-theme' : 'bg-yellow-theme'}`}>
          <img
            src={isStudent ? studentLogo : canteenLogo}
            alt="CreditSnap Logo"
            className="brand-logo"
          />
        </div>

        <div className="forgot-right-panel">
          <div className="form-container">
            <h1 className="forgot-heading">FORGOT PASSWORD</h1>

            <p className="instruction-text">
              {isStudent
                ? "Enter your IITK email address and we'll send you a link to reset your password."
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>

            <form className="forgot-form" onSubmit={handleReset}>
              {successMsg && <div style={{ color: 'green', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</div>}
              <div className="input-group">
                <input
                  type="email"
                  placeholder={isStudent ? "IITK Email" : "Email"}
                  className="custom-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@+-]/g, ''))}
                  required
                />
                {emailError && <span className="error-text">{emailError}</span>}
              </div>

              <button type="submit" className={`primary-forgot-btn ${isStudent ? 'btn-blue' : 'btn-yellow'}`} disabled={isSubmitting}>
                {isSubmitting ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </form>

            <div className="login-redirect">
              <span className="light-text">Remember your password? </span>
              <Link to="/">Back to Login.</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;