import React from 'react';
import { useNavigate } from 'react-router-dom';

// Shared inline CSS — replaces the deleted Login.css file
const inlineCSS = `
  .login-page {
    display: flex;
    height: 100vh;
    width: 100vw;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
  }
  .login-right-panel {
    flex: 1;
    background-color: #FFFFFF;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .form-container {
    width: 100%;
    max-width: 420px;
    min-height: 520px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .login-heading { color: #183B66; font-size: 32px; margin-bottom: 35px; }
  .primary-login-btn {
    color: #FFFFFF;
    border: none;
    padding: 14px;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    width: 75%;
    display: block;
    margin: 35px auto 0 auto;
    transition: background-color 0.3s ease;
  }
  .btn-blue { background-color: #183B66; }
  .btn-blue:hover { background-color: #0F2540; }
`;

const VerifyEmailPending = () => {
  const navigate = useNavigate();

  // Present a static informative screen instructing the user to check their external email inbox
  return (
    <>
      <style>{inlineCSS}</style>
      <div className="login-page">
        <div className="login-right-panel" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="form-container" style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h1 className="login-heading">Check Your Inbox! 📬</h1>

            {/* Main instruction block rendered centrally with inline CSS spacing */}
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
    </>
  );
};

export default VerifyEmailPending;