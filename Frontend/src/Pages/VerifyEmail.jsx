// --- IMPORTS ---
// Import the backend API URL configuration
import { BASE_URL } from '../config';
// Import React and necessary hooks (useEffect for lifecycle, useState for state, useRef for variables that don't trigger re-renders)
import React, { useEffect, useState, useRef } from 'react';
// Import routing hooks: useParams to get URL parameters (like the token), useNavigate to redirect the user
import { useParams, useNavigate } from 'react-router-dom';

// --- INLINE CSS ---
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

const VerifyEmail = () => {
  // Extract the 'token' parameter directly from the URL (e.g., /verify-email/:token)
  const { token } = useParams();
  // Hook used to programmatically navigate the user to different pages
  const navigate = useNavigate();
  // State to hold the current status message displayed to the user on the screen
  const [status, setStatus] = useState('Verifying your email...');
  // Ref used to track if the API call has already been made (prevents double-firing in React StrictMode)
  const called = useRef(false);

  // --- VERIFICATION LOGIC ---
  // Automatically trigger API validation for the email token exactly once upon component mount
  useEffect(() => {
    // Define the async function to call the backend server
    const verifyToken = async () => {
      try {
        // Make a GET request to the backend verify endpoint, passing the token from the URL
        const response = await fetch(`${BASE_URL}/api/users/verifyEmail/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Parse the JSON response returned by the server
        const data = await response.json();

        // Check if the backend successfully verified the token
        if (data.status === 'success') {
          setStatus('Email verified successfully! Redirecting to login...');

          // Pause execution allowing the user to observe the success state before redirecting.
          // Wait 2 seconds (2000ms), then navigate them to the login page ('/')
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          // If verification fails (e.g., token expired or invalid), show the error message from the backend
          setStatus('Verification failed: ' + data.message);
        }
      } catch (error) {
        // Catch network errors (e.g., if the backend server is down or not running)
        setStatus('Cannot connect to the backend server to verify email.');
      }
    };

    // Safety check: Only call the function if we have a token AND we haven't already called it
    if (token && !called.current) {
      called.current = true; // Mark as called to prevent duplicate API requests
      verifyToken(); // Execute the verification function
    }
  }, [token, navigate]); // Dependency array: re-run if token or navigate function changes

  // --- RENDER UI ---
  // Render minimal feedback interface displaying dynamic connection success or failure alerts
  return (
    <>
      <style>{inlineCSS}</style>
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
    </>
  );
};

export default VerifyEmail;