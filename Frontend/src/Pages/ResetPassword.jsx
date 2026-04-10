                              import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import studentLogo from '../assets/Student_without_bg_logo.png';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';

// Shared inline CSS — same styles used by ForgotPassword.jsx (no external CSS file exists)
const inlineCSS = `
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
  .bg-yellow-theme { background-color: #FFFDE7; }
  .bg-blue-theme { background-color: #e5eff5; }
  .btn-yellow { background-color: #D4AC0D; }
  .btn-yellow:hover { background-color: #B8860B; }
  .btn-blue { background-color: #183B66; }
  .btn-blue:hover { background-color: #0F2540; }
  .brand-logo { max-width: 350px; width: 80%; height: auto; }
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
  .forgot-heading { color: #183B66; font-size: 28px; margin-bottom: 10px; }
  .instruction-text { color: #666666; text-align: center; font-size: 14px; margin-bottom: 30px; line-height: 1.5; }
  .forgot-form { width: 100%; display: flex; flex-direction: column; }
  .input-group { margin-bottom: 15px; }
  .custom-input { width: 100%; padding: 12px; border: 1px solid #B0B0B0; border-radius: 4px; box-sizing: border-box; }
  .custom-input:focus { border-color: #183B66; outline: none; }
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
  .error-text { color: #D32F2F; font-size: 13px; display: block; margin-top: 5px; text-align: left; font-weight: 500; }
  @media (max-width: 800px) {
    .forgot-page { flex-direction: column; overflow: auto; }
    .forgot-left-panel { padding: 20px 0; }
    .brand-logo { max-width: 200px; }
    .forgot-right-panel { padding: 20px; }
  }
`;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse token from navigation parameters and extract expected visual role variant
  // Read the role from query parameters (e.g., ?role=owner)
  const queryParams = new URLSearchParams(location.search);
  const role = queryParams.get('role') || 'Student'; // Default to student
  const isOwner = role.toLowerCase() === 'owner';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evaluate form passwords enforcing conditions and dispatch patch request securely
  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/api/users/resetPassword/${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSuccessMsg('Password reset successful! Redirecting to login...');

        // Wait a brief moment so they can read the success message
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Failed to reset password.');
      }
    } catch (error) {
      setErrorMsg('Cannot connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{inlineCSS}</style>
      <div className="forgot-page">
        {/* Side panel displaying appropriate branding illustration driven by user role */}
        <div className={`forgot-left-panel ${isOwner ? 'bg-yellow-theme' : 'bg-blue-theme'}`}>
          <img
            src={isOwner ? canteenLogo : studentLogo}
            alt="CreditSnap Logo"
            className="brand-logo"
          />
        </div>

        <div className="forgot-right-panel">
          <div className="form-container">
            <h1 className="forgot-heading" style={{ color: isOwner ? '#eab308' : '#1e3a8a' }}>RESET PASSWORD</h1>

            <p className="instruction-text">
              Enter your new password below.
            </p>

            <form className="forgot-form" onSubmit={handleReset}>
              {successMsg && <div style={{ color: 'green', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</div>}

              <div className="input-group">
                <input
                  type="password"
                  placeholder="New Password"
                  className="custom-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="custom-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errorMsg && <span className="error-text">{errorMsg}</span>}
              </div>

              <button type="submit" className={`primary-forgot-btn ${isOwner ? 'btn-yellow' : 'btn-blue'}`} disabled={isSubmitting}>
                {isSubmitting ? 'RESETTING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
