import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './ForgotPassword.css';
import studentLogo from '../assets/Student_without_bg_logo.png'; 
import canteenLogo from '../assets/Canteen_without_bg_logo.png';

const ForgotPassword = () => {
  const location = useLocation();
  const role = location.state?.role || 'Student';
  const isStudent = role === 'Student';
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    // Validation Check
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setEmailError('Please enter a valid @iitk.ac.in email address.');
      return; 
    }

    setEmailError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/users/forgotPassword', {
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

  return (
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
                onChange={(e) => setEmail(e.target.value)}
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
  );
};

export default ForgotPassword;