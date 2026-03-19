import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Authentication Pages ---
import Login from './Pages/Login';
import Signup from './Pages/signup';
import ForgotPassword from './Pages/ForgotPassword';

// --- Student Pages ---
import StudLayout from './Pages/stud_layout';
import StudDashboard from './Pages/stud_Dashboard';
import StudCanteens from './Pages/stud_Canteens';
import StudProfile from './Pages/stud_profile';
import StudHistory from './Pages/stud_history';
import ChangePassword from './Pages/ChangePassword';

// Added New Student Pages
import StudViewDebts from './Pages/stud_ViewDebts';
import StudAboutUs from './Pages/stud_Aboutus';
import StudentHelp from './Pages/stud_help';

// --- Owner Pages ---
import OwnerLayout from './Pages/owner_layout';
import OwnerEditMenu from './Pages/owner_editmenu';
import OwnerProfile from './Pages/owner_profile';
import OwnerActiveDebts from './Pages/owner_ActiveDebts';
import Ownerhistory from './Pages/owner_history';
import Owneranalytics from './Pages/owner_analysis';
import Ownerhelp from './Pages/owner_help';

// 🚨 Temporarily disabled to fix the white screen crash!
import CreditSnapDashboard from './Pages/owner_dashboard';

// --- NEW: Owner About Us ---
import OwnerAboutUs from './Pages/owner_AboutUs';

export default function App() {
  // A simple component to check for a token before allowing access
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      // If there's no token, kick them back to login!
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Authentication Routes --- */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- Protected Student Routes --- */}
        <Route path="/student" element={<ProtectedRoute><StudLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudDashboard />} />
          <Route path="canteens" element={<StudCanteens />} />
          <Route path="profile" element={<StudProfile />} />
          <Route path="history" element={<StudHistory />} />
          <Route path="help" element={<StudentHelp />} />
          <Route path="change-password" element={<ChangePassword />} />

          <Route path="debts" element={<StudViewDebts />} />
          <Route path="about" element={<StudAboutUs />} />
        </Route>

        {/* --- Protected Owner Routes --- */}
        <Route path="/owner" element={<ProtectedRoute><OwnerLayout /></ProtectedRoute>}>
          {/* Automatically redirects /owner to editmenu since dashboard is disabled for now */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* 🚨 Temporarily disabled to fix the white screen crash! */}
          <Route path="dashboard" element={<CreditSnapDashboard />} />

          <Route path="editmenu" element={<OwnerEditMenu />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="debts" element={<OwnerActiveDebts />} />
          <Route path="history" element={<Ownerhistory />} />
          <Route path="analytics" element={<Owneranalytics />} />
          <Route path="help" element={<Ownerhelp />} />

          {/* Reusing the Change Password file */}
          <Route path="change-password" element={<ChangePassword />} />

          {/* 👇 Your new Owner About Us route 👇 */}
          <Route path="about" element={<OwnerAboutUs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}