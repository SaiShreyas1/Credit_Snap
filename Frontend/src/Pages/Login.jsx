import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import studentLogo from '../assets/Student_without_bg_logo.png';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';
import { Eye, EyeOff } from 'lucide-react';

const inlineCSS = `
  .login-page {
    display: flex;
    min-height: 100dvh;
    width: 100%;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .login-left-panel {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.4s ease;
  }

  /* Styling rules to switch application colors depending on the selected user role */
  /* --- THEME SWAP --- */
  .bg-yellow-theme {
    background-color: #FFFDE7;
  }

  /* Shopkeeper now Soft Yellow */
  .bg-blue-theme {
    background-color: #e5eff5;
  }

  /* Student is Blue */

  .brand-logo-wrap {
    width: min(82%, 420px);
    height: min(72vh, 420px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
    /* border: 2px solid red; */
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
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .login-heading {
    color: #183B66;
    font-size: 32px;
    margin-bottom: 35px;
  }

  /* Visual properties for the toggle slider that chooses between Student or Canteen roles */
  /* --- DYNAMIC SELECTOR --- */
  .role-selector {
    display: flex;
    border-radius: 8px;
    width: 100%;
    margin-bottom: 40px;
    overflow: hidden;
  }

  .selector-yellow {
    background-color: #FFFDE7;
  }

  .selector-blue {
    background-color: #e5eff5;
  }

  .role-btn {
    flex: 1;
    padding: 14px 0;
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .active-yellow {
    background-color: #D4AC0D;
    /* Rich Golden Yellow */
    color: #FFFFFF;
  }

  .active-blue {
    background-color: #183B66;
    color: #FFFFFF;
  }

  .login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .input-group {
    margin-bottom: 20px;
  }

  .custom-input {
    width: 100%;
    padding: 14px;
    border: 1px solid #B0B0B0;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input-wrapper .custom-input {
    padding-right: 45px;
  }

  .password-toggle-btn {
    position: absolute;
    right: 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  /* Button styling configuring backgrounds, hovers, and color transitions per theme */
  /* --- DYNAMIC BUTTONS --- */
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

  .btn-yellow {
    background-color: #D4AC0D;
  }

  /* Rich Golden Yellow */
  .btn-yellow:hover {
    background-color: #B8860B;
  }

  /* Slightly darker on hover */

  .btn-blue {
    background-color: #183B66;
  }

  .btn-blue:hover {
    background-color: #0F2540;
  }

  .signup-redirect {
    margin-top: 35px;
    font-size: 13px;
    min-height: 20px;
    text-align: center;
  }

  .signup-redirect-hidden {
    visibility: hidden;
  }

  .forgot-password-link {
    margin-top: 15px;
    font-size: 13px;
    text-align: center;
    width: 100%;
  }

  .forgot-password-link a, .signup-redirect a {
    color: #183B66;
    text-decoration: none;
    font-weight: 600;
  }

  /* Responsive adjustments */
  @media (max-width: 800px) {
    .login-page {
      flex-direction: column;
      overflow-y: auto;
    }

    .login-left-panel {
      padding: 40px 0;
    }

    .brand-logo-wrap {
      max-width: 250px;
      max-height: 250px;
    }

    .login-right-panel {
      padding: 24px 20px 40px;
    }

    .form-container {
      min-height: auto;
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

const Login = () => {
  const navigate = useNavigate();

  // --- STATES ---
  // Define state variables to manage user input, role selection, and error messages
  const [role, setRole] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- LOGIN LOGIC ---
  // Function to authenticate the user and retrieve a session token from the backend
  const handleLogin = async (e) => {
    e.preventDefault();
    const isStudent = role === 'Student';

    //1.Frontend Validation Check for IITK Emails
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setEmailError('Access restricted: Please use your @iitk.ac.in email.');
      return;
    }

    //Clear any old errors before trying to log in
    setEmailError('');
    setLoginError('');

    //2.CONNECTION TO MONGODB
    try {
      const response = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, password: password, role: isStudent ? 'student' : 'owner' }),
      });

      const data = await response.json();

      //3.VALIDATE THE LOGIN
      if (data.status === 'success') {
        console.log("Login successful! VIP Token Generated.");

        // Clear any stale auth from a previous account before saving the new session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('canteenId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('canteenId');

        // Save the token and user data to the browser's current session
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.data.user));

        // Route the user based on their REAL role from the database
        if (data.data.user.role === 'student') {
          navigate('/student/dashboard');
        } else if (data.data.user.role === 'owner') {
          navigate('/owner/dashboard');
        }
      } else {
        //If the password was wrong, or email wasn't found, show the error!
        setLoginError(data.message);
      }
    } catch (error) {
      setLoginError('Cannot connect to the backend server. Is nodemon running?');
    }
  };

  const isStudent = role === 'Student';

  // Return the complete login UI including dynamic branding and form fields depending on role
  return (
    <>
      <style>{inlineCSS}</style>
      <div className="login-page">
        <div className={`login-left-panel ${isStudent ? 'bg-blue-theme' : 'bg-yellow-theme'}`}>
          <div className="brand-logo-wrap">
            <img
              src={isStudent ? studentLogo : canteenLogo}
              alt={`CreditSnap ${role} Logo`}
              className="brand-logo"
            />
          </div>
        </div>

        <div className="login-right-panel">
          <div className="form-container">
            <h1 className="login-heading">LOGIN</h1>

            <div className={`role-selector ${isStudent ? 'selector-blue' : 'selector-yellow'}`}>
              <button
                type="button"
                className={`role-btn ${isStudent ? 'active-blue' : ''}`}
                onClick={() => {
                  setRole('Student');
                  setEmailError('');
                  setLoginError('');
                  setEmail('');
                  setPassword('');
                  setShowPassword(false);
                }}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-btn ${!isStudent ? 'active-yellow' : ''}`}
                onClick={() => {
                  setRole('Canteen');
                  setEmailError('');
                  setLoginError('');
                  setEmail('');
                  setPassword('');
                  setShowPassword(false);
                }}
              >
                Canteen
              </button>
            </div>

            <form className="login-form" onSubmit={handleLogin}>

              {/* --- EMAIL INPUT --- */}
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Enter your mail"
                  className="custom-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@+-]/g, ''))}
                  required
                />
                {emailError && <span className="error-text" style={{ color: 'red', marginTop: '5px', display: 'block' }}>{emailError}</span>}
              </div>

              {/* --- PASSWORD INPUT --- */}
              <div className="input-group">
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="custom-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
                  </button>
                </div>
                {loginError && <span className="error-text" style={{ color: 'red', marginTop: '5px', display: 'block' }}>{loginError}</span>}
              </div>

              <div className="forgot-password-link">
                <span className="light-text">Have Trouble in sign in? </span>
                <Link to="/forgot-password" state={{ role }}>Forgot Password.</Link>
              </div>

              <button
                type="submit"
                className={`primary-login-btn ${isStudent ? 'btn-blue' : 'btn-yellow'}`}
              >
                LOGIN
              </button>
            </form>

            <div className={`signup-redirect ${isStudent ? '' : 'signup-redirect-hidden'}`}>
              <span className="light-text">Don't have an account? </span>
              <a href="/signup">Sign Up.</a>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
