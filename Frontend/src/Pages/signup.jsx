import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './signup.css';
import studentLogo from '../assets/Student_without_bg_logo.png';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();

  // Field States - Store all form input data such as user credentials and profile details
  // Field States
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [hallNo, setHallNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isHallDropdownOpen, setIsHallDropdownOpen] = useState(false);
  //Status States
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle the signup form submission and send registration data to backend API
  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    //Validation Check
    if (!email.endsWith('@iitk.ac.in')) {
      setErrorMsg('You must register with a valid @iitk.ac.in email address.');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (phoneNo.length !== 10) {
      setErrorMsg('Mobile number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    const hallNum = parseInt(hallNo, 10);
    if (isNaN(hallNum) || hallNum < 1 || hallNum > 14) {
      setErrorMsg('Incorrect Hall Number. Please enter a valid Hall Number between 1 and 14.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phoneNo: phoneNo,
          password: password,
          role: 'student',
          rollNo: rollNo,
          hallNo: hallNo,
          roomNo: roomNo
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        navigate('/verify-email-pending');
      } else {
        setErrorMsg('Signup failed: ' + data.message);
        setIsSubmitting(false);
      }
    } catch (error) {
      setErrorMsg('Cannot connect to the backend server. Is nodemon running?');
      setIsSubmitting(false);
    }
  };

  // Render the signup UI containing dynamic side panels and responsive form layout
  return (
    <div className="signup-page">
      <div className="signup-left-panel bg-blue-theme">
        <div className="signup-brand-logo-wrap">
          <img
            src={studentLogo}
            alt="CreditSnap Student Logo"
            className="signup-brand-logo"
          />
        </div>
      </div>

      <div className="signup-right-panel">
        <div className="form-container">
          <h1 className="signup-heading">SIGN UP</h1>

          <form className="signup-form" onSubmit={handleSignup}>
            {errorMsg && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{errorMsg}</div>}

            <div className="input-group">
              <input type="text" placeholder="Full Name" className="custom-input" value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} required />
            </div>

            <div className="input-group">
              <input type="text" placeholder="Roll Number" className="custom-input" value={rollNo} onChange={(e) => setRollNo(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} required />
            </div>

            <div className="input-group">
              <input
                type="email"
                placeholder="IITK Email"
                className="custom-input"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@+-]/g, ''))}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: (phoneNo && phoneNo.length !== 10) ? '10px' : 'auto' }}>
              <input
                type="tel"
                placeholder="Phone Number"
                className="custom-input"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
              {phoneNo && phoneNo.length !== 10 && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px', textAlign: 'left', paddingLeft: '4px' }}>
                  Mobile number must be exactly 10 digits.
                </div>
              )}
            </div>

            <div className="split-group">
              <div
                className="custom-input custom-dropdown-wrapper"
                style={{ position: 'relative', cursor: 'pointer', padding: 0 }}
                tabIndex={0}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsHallDropdownOpen(false);
                  }
                }}
              >
                <div
                  className="dropdown-header"
                  onClick={() => setIsHallDropdownOpen(!isHallDropdownOpen)}
                  style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}
                >
                  <span style={{ color: hallNo ? '#000' : '#777' }}>
                    {hallNo ? `Hall ${hallNo}` : 'Select Hall No'}
                  </span>
                  <ChevronDown size={18} color="#777" />
                </div>

                {isHallDropdownOpen && (
                  <div className="dropdown-options" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '150px',
                    overflowY: 'auto',
                    backgroundColor: '#fff',
                    border: '1px solid #B0B0B0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    marginTop: '4px'
                  }}>
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((num) => (
                      <div
                        key={num}
                        className="dropdown-option"
                        onClick={() => {
                          setHallNo(num.toString());
                          setIsHallDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: num < 14 ? '1px solid #f0f0f0' : 'none',
                          backgroundColor: hallNo === num.toString() ? '#f5f5f5' : '#fff'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = hallNo === num.toString() ? '#f5f5f5' : '#fff'}
                      >
                        Hall {num}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input type="text" placeholder="Room No" className="custom-input" value={roomNo} onChange={(e) => setRoomNo(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))} required />
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
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
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="custom-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-signup-btn btn-blue" disabled={isSubmitting}>
              {isSubmitting ? 'SENDING EMAIL...' : 'SIGN UP'}
            </button>
          </form>

          <div className="login-redirect">
            <span className="light-text">Already have account? </span>
            <a href="/">Login.</a>
          </div>

          <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
            <span className="light-text" style={{ color: '#666' }}>Need Help? </span>
            <a href="mailto:creditsnapiitk24@gmail.com" style={{ color: '#1a365d', fontWeight: '600', textDecoration: 'none' }}>Contact us here.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
