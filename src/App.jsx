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
import ChangePassword from './Pages/ChangePassword'; // <-- ADDED THIS IMPORT

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
          <Route path="history" element={<StudHistory />} />
          <Route path="help" element={<StudentHelp />} />
          <Route path="change-password" element={<ChangePassword />} /> {/* <-- ADDED THIS ROUTE */}
          
          {/* New Student Routes */}
          <Route path="debts" element={<StudViewDebts />} /> 
          <Route path="about" element={<StudAboutUs />} />
          {/* <Route path="help" element={<StudHelp />} /> */}

        </Route>

        {/* --- Protected Owner Routes --- */}
        <Route path="/owner" element={<OwnerLayout />}>
          {/* Automatically redirects /owner to /owner/editmenu */}
          <Route index element={<Navigate to="editmenu" replace />} />
          <Route path="editmenu" element={<OwnerEditMenu />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="debts" element={<OwnerActiveDebts/>}/>
          <Route path="history" element={<Ownerhistory/>}/>
          <Route path="analytics" element={<Owneranalytics />} />
          <Route path="help" element={<Ownerhelp />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}