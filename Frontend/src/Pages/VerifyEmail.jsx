import { BASE_URL } from '../config';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Login.css';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your email...');
  const called = useRef(false);

  // Automatically trigger API validation for the email token exactly once upon component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/users/verifyEmail/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.status === 'success') {
          setStatus('Email verified successfully! Redirecting to login...');
          
          // Pause execution allowing the user to observe the success state before redirecting
          // Wait a brief moment so they can read the success message
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('Verification failed: ' + data.message);
        }
      } catch (error) {
        setStatus('Cannot connect to the backend server to verify email.');
      }
    };

    if (token && !called.current) {
      called.current = true;
      verifyToken();
    }
  }, [token, navigate]);

  // Render minimal feedback interface displaying dynamic connection success or failure alerts
  return (
    <div className="login-page">
      <div className="login-right-panel" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="form-container" style={{ textAlign: 'center' }}>
          <h1 className="login-heading">Email Verification</h1>
          <p style={{ margin: '20px 0', fontSize: '1.2rem', color: '#333' }}>
            {status}
          </p>
          {status.includes('failed') && (
            <button className="primary-login-btn btn-blue" onClick={() => navigate('/signup')}>
              Back to Signup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
