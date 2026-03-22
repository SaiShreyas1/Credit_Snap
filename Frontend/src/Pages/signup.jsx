import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './signup.css';
import studentLogo from '../assets/Student_without_bg_logo.png';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';

const Signup = () => {
  const navigate = useNavigate();

  // Field States
  const [role, setRole] = useState('Student');
  const isStudent = role === 'Student';
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [hallNo, setHallNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status States
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    // Validation Check
    if (isStudent && !email.endsWith('@iitk.ac.in')) {
      setErrorMsg('You must register with a valid @iitk.ac.in email address.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (isStudent) {
      const hallNum = parseInt(hallNo, 10);
      if (isNaN(hallNum) || hallNum < 1 || hallNum > 14) {
        setErrorMsg('Incorrect Hall Number. Please enter a valid Hall Number between 1 and 14.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phoneNo: phoneNo,
          password: password,
          role: isStudent ? 'student' : 'owner',
          rollNo: isStudent ? rollNo : undefined,
          hallNo: isStudent ? hallNo : undefined,
          roomNo: isStudent ? roomNo : undefined
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Redirect to the pending verification page
        if (isStudent) {
          navigate('/verify-email-pending');
        } else {
          alert('Owner Account Created Successfully! Please login.');
          navigate('/');
        }
      } else {
        setErrorMsg('Signup failed: ' + data.message);
        setIsSubmitting(false);
      }
    } catch (error) {
      setErrorMsg('Cannot connect to the backend server. Is nodemon running?');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-page">
      <div className={`signup-left-panel ${isStudent ? 'bg-blue-theme' : 'bg-yellow-theme'}`}>
        <div className="signup-brand-logo-wrap">
          <img
            src={isStudent ? studentLogo : canteenLogo}
            alt={`CreditSnap ${role} Logo`}
            className="signup-brand-logo"
          />
        </div>
      </div>

      <div className="signup-right-panel">
        <div className="form-container">
          <h1 className="signup-heading">SIGN UP</h1>

          <div className={`role-selector ${isStudent ? 'selector-blue' : 'selector-yellow'}`} style={{ marginBottom: '20px' }}>
            <button
              type="button"
              className={`role-btn ${isStudent ? 'active-blue' : ''}`}
              onClick={() => { setRole('Student'); setErrorMsg(''); }}
            >
              Student
            </button>
            <button
              type="button"
              className={`role-btn ${!isStudent ? 'active-yellow' : ''}`}
              onClick={() => { setRole('Canteen'); setErrorMsg(''); }}
            >
              Canteen
            </button>
          </div>

          <form className="signup-form" onSubmit={handleSignup}>
            {errorMsg && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{errorMsg}</div>}

            <div className="input-group">
              <input type="text" placeholder={isStudent ? "Full Name" : "Canteen Owner Name"} className="custom-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            {isStudent && (
              <div className="input-group">
                <input type="text" placeholder="Roll Number" className="custom-input" value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
              </div>
            )}

            <div className="input-group">
              <input
                type="email"
                placeholder={isStudent ? "IITK Email" : "Email Address"}
                className="custom-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="tel"
                placeholder="Phone Number"
                className="custom-input"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                required
              />
            </div>

            {isStudent && (
              <div className="split-group">
                <input type="text" placeholder="Hall No" className="custom-input" value={hallNo} onChange={(e) => setHallNo(e.target.value)} required />
                <input type="text" placeholder="Room No" className="custom-input" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} required />
              </div>
            )}

            <div className="input-group">
              <input type="password" placeholder="Password" className="custom-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="input-group">
              <input type="password" placeholder="Confirm Password" className="custom-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <button type="submit" className={`primary-signup-btn ${isStudent ? 'btn-blue' : 'btn-yellow'}`} disabled={isSubmitting}>
              {isSubmitting ? 'SENDING EMAIL...' : 'SIGN UP'}
            </button>
          </form>

          <div className="login-redirect">
            <span className="light-text">Already have account? </span>
            <a href="/">Login.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;