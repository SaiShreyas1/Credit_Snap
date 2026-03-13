import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout and Pages
import StudentLayout from './Pages/stud_layout';
import StudDashboard from './Pages/stud_Dashboard';
import StudentCanteens from './Pages/stud_canteens';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Wrap the student routes inside the Layout! */}
        <Route path="/student" element={<StudentLayout />}>
          
          {/* This redirects /student to /student/dashboard automatically */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          {/* These pages load inside the <Outlet /> of the Layout */}
          <Route path="dashboard" element={<StudDashboard />} />
          <Route path="canteens" element={<StudentCanteens/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}