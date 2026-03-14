import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Import Your Authentication Pages
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import ForgotPassword from './Pages/ForgotPassword';

// 2. Import Teammate's Dashboard & Layout Pages
import StudentLayout from './Pages/stud_layout';
import StudDashboard from './Pages/stud_Dashboard';
import StudentCanteens from './Pages/stud_canteens';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Authentication Routes (Your Work) --- */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- Protected Student Routes (Teammate's Work) --- */}
        <Route path="/student" element={<StudentLayout />}>
          {/* Automatically redirects /student to /student/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          <Route path="dashboard" element={<StudDashboard />} />
          <Route path="canteens" element={<StudentCanteens />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}