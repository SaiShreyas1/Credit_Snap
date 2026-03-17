import React, { useState } from 'react';
import './ForgotPassword.css';
import studentLogo from '../assets/Student_without_bg_logo.png'; 

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleReset = (e) => {
    e.preventDefault();

    // Validation Check
    if (!email.endsWith('@iitk.ac.in')) {
      setEmailError('Please enter a valid @iitk.ac.in email address.');
      return; 
    }

    setEmailError('');
    console.log(`Sending password reset link to ${email}...`);
  };

  return (
    <div className="forgot-page">
      <div className="forgot-left-panel">
        <img 
          src={studentLogo} 
          alt="CreditSnap Logo" 
          className="brand-logo" 
        />
      </div>

      <div className="forgot-right-panel">
        <div className="form-container">
          <h1 className="forgot-heading">FORGOT PASSWORD</h1>
          
          <p className="instruction-text">
            Enter your IITK email address and we'll send you a link to reset your password.
          </p>
          
          <form className="forgot-form" onSubmit={handleReset}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="IITK Email" 
                className="custom-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
              {emailError && <span className="error-text">{emailError}</span>}
            </div>
            
            <button type="submit" className="primary-forgot-btn">
              SEND RESET LINK
            </button>
          </form>

          <div className="login-redirect">
            <span className="light-text">Remember your password? </span>
            <a href="/">Back to Login.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;