import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { NotificationProvider } from './context/NotificationContext';

//---Authentication Pages ---
import Login from './Pages/Login';
import Signup from './Pages/signup';
import ForgotPassword from './Pages/ForgotPassword';
import ResetPassword from './Pages/ResetPassword';
import VerifyEmail from './Pages/VerifyEmail';
import VerifyEmailPending from './Pages/VerifyEmailPending';

//--Student Pages ---
import StudLayout from './Pages/stud_layout';
import StudDashboard from './Pages/stud_Dashboard';
import StudCanteens from './Pages/stud_canteens';
import StudProfile from './Pages/stud_profile';
import StudHistory from './Pages/stud_history';
import ChangePassword from './Pages/ChangePassword';

//Added New Student Pages
import StudViewDebts from './Pages/stud_ViewDebts';
import StudAboutUs from './Pages/stud_AboutUs';
import StudentHelp from './Pages/stud_help';

//--- Owner Pages ---
import OwnerLayout from './Pages/owner_layout';
import OwnerEditMenu from './Pages/owner_editmenu';
import OwnerProfile from './Pages/owner_profile';
import OwnerActiveDebts from './Pages/owner_ActiveDebts';
import Ownerhistory from './Pages/owner_history';
import Owneranalytics from './Pages/Owner_analysis';
import Ownerhelp from './Pages/owner_help';

//Temporarily disabled to fix the white screen crash!
import CreditSnapDashboard from './Pages/owner_dashboard';

// --- NEW: Owner About Us ---
import OwnerAboutUs from './Pages/owner_AboutUs';

// ==========================================
//THE PERMANENT 401 FIX (GLOBAL INTERCEPTOR)
// ==========================================
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    //If the backend rejects the token because it's expired or invalid
    if (error.response && error.response.status === 401) {
      console.warn("Token expired or invalid. Auto-logging out...");
      
      //Wipe everything clean so it doesn't get stuck in a loop
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('canteenId');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('canteenId');
      
      //Kick them back to the Login page ("/")
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);
// ==========================================

export default function App() {
  //A robust component to check for a token AND the correct role before allowing access
  const RoleProtectedRoute = ({ children, allowedRole }) => {
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');

    if (!token || !userStr) {
      //If there's no token or user data, kick them back to login
      return <Navigate to="/" replace />;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== allowedRole) {
        //If a student tries to access owner pages (or vice versa), kick them to their own dashboard!
        return <Navigate to={`/${user.role}/dashboard`} replace />;
      }
    } catch (e) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Public Authentication Routes --- */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/verify-email-pending" element={<VerifyEmailPending />} />

          {/* --- Protected Student Routes --- */}
          <Route path="/student" element={<RoleProtectedRoute allowedRole="student"><StudLayout /></RoleProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudDashboard />} />
            <Route path="canteens/*" element={<StudCanteens />} />
            <Route path="profile" element={<StudProfile />} />
            <Route path="history" element={<StudHistory />} />
            <Route path="help" element={<StudentHelp />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="debts" element={<StudViewDebts />} />
            <Route path="about" element={<StudAboutUs />} />
          </Route>

          {/* --- Protected Owner Routes --- */}
          <Route path="/owner" element={<RoleProtectedRoute allowedRole="owner"><OwnerLayout /></RoleProtectedRoute>}>
            {/* Automatically redirects /owner to editmenu since dashboard is disabled for now */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/*Temporarily disabled to fix the white screen crash! */}
            <Route path="dashboard" element={<CreditSnapDashboard />} />

            <Route path="editmenu" element={<OwnerEditMenu />} />
            <Route path="profile" element={<OwnerProfile />} />
            <Route path="debts" element={<OwnerActiveDebts />} />
            <Route path="history" element={<Ownerhistory />} />
            <Route path="analytics" element={<Owneranalytics />} />
            <Route path="help" element={<Ownerhelp />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="about" element={<OwnerAboutUs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}
