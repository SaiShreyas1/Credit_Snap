import React, { useState } from 'react';
import './Signup.css';
import studentLogo from '../assets/Student_without_bg_logo.png'; 

const Signup = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();

    // Validation Check
    if (!email.endsWith('@iitk.ac.in')) {
      setEmailError('You must register with a valid @iitk.ac.in email address.');
      return; 
    }

    setEmailError('');
    console.log(`Registering new student with email: ${email}`);
  };

  return (
    <div className="signup-page">
      <div className="signup-left-panel">
        <img 
          src={studentLogo} 
          alt="CreditSnap Student Logo" 
          className="brand-logo" 
        />
      </div>

      <div className="signup-right-panel">
        <div className="form-container">
          <h1 className="signup-heading">SIGN UP</h1>
          
          <form className="signup-form" onSubmit={handleSignup}>
            <div className="input-group">
              <input type="text" placeholder="Full Name" className="custom-input" required />
            </div>
            
            <div className="input-group">
              <input type="text" placeholder="Roll Number" className="custom-input" required />
            </div>

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

            <div className="split-group">
              <input type="text" placeholder="Hall No" className="custom-input" required />
              <input type="text" placeholder="Room No" className="custom-input" required />
            </div>

            <div className="input-group">
              <input type="password" placeholder="Password" className="custom-input" required />
            </div>

            <div className="input-group">
              <input type="password" placeholder="Confirm Password" className="custom-input" required />
            </div>
            
            <button type="submit" className="primary-signup-btn">
              SIGN UP
            </button>
          </form>

          <div className="login-redirect">
            <span className="light-text">Already have an account? </span>
            <a href="/">Login.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;