import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Authentication Pages ---
import Login from './Pages/Login';
import Signup from './Pages/signup';
import ForgotPassword from './Pages/ForgotPassword';

// --- Student Pages ---
import StudLayout from './Pages/stud_layout';
import StudDashboard from './Pages/stud_Dashboard';
import StudCanteens from './Pages/stud_canteens';
import StudProfile from './Pages/stud_profile';

// --- Owner Pages ---
import OwnerLayout from './Pages/owner_layout';
import OwnerEditMenu from './Pages/owner_editmenu';
import OwnerProfile from './Pages/owner_profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Authentication Routes --- */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- Protected Student Routes --- */}
        <Route path="/student" element={<StudLayout />}>
          {/* Automatically redirects /student to /student/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudDashboard />} />
          <Route path="canteens" element={<StudCanteens />} />
          <Route path="profile" element={<StudProfile />} />
        </Route>

        {/* --- Protected Owner Routes --- */}
        <Route path="/owner" element={<OwnerLayout />}>
          {/* Automatically redirects /owner to /owner/editmenu */}
          <Route index element={<Navigate to="editmenu" replace />} />
          <Route path="editmenu" element={<OwnerEditMenu />} />
          <Route path="profile" element={<OwnerProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}