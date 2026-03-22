import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Reusing your existing styles!

const VerifyEmailPending = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-right-panel" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="form-container" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 className="login-heading">Check Your Inbox! 📬</h1>
          
          <div style={{ margin: '30px 0', fontSize: '1.2rem', color: '#4a5568', lineHeight: '1.6' }}>
            <p>We've sent a verification link to your email address.</p>
            <p>Please click the link in that email to verify your account and complete the signup process.</p>
            <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#a0aec0' }}>
              (If you don't see it, check your spam or promotion folders.)
            </p>
          </div>

          <button 
            className="primary-login-btn btn-blue" 
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPending;
