import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './ForgotPassword.css';
import studentLogo from '../assets/Student_without_bg_logo.png'; 
import canteenLogo from '../assets/Canteen_without_bg_logo.png';

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
  );
};

export default ResetPassword;
