import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useLocation } from 'react-router-dom'; 
import { useNotifications } from '../context/NotificationContext'; 
 

export default function ChangePassword() {
  const { showAlert } = useNotifications();
  const location = useLocation(); 
  const isOwner = location.pathname.includes('/owner'); 
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      showAlert("Missing Fields", "Please fill in all fields before updating.", "warning");
      return;
    }

    if (passwords.currentPassword === passwords.newPassword) {
      showAlert("Invalid Password", "New password cannot be the same as your current password.", "warning");
      return;
    }

    if (passwords.newPassword.length < 8) {
      showAlert("Password Too Short", "New password must be at least 8 characters long for security.", "warning");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      showAlert("Mismatch", "New passwords do not match. Please re-type carefully.", "warning");
      return;
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        showAlert("Access Denied", "You are not logged in! Please log in again to continue.", "error");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/users/updatePassword`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        showAlert("Password Updated", "Your password has been changed successfully!", "success");
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); 
        
        // Keep fresh auth in the current session only
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        showAlert("Failed", data.message || "Failed to update password. Please check your credentials.", "error");
      }
    } catch (err) {
      showAlert("Error", "Could not connect to the server. Please check your connection.", "error");
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D9D9D9]">
        
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="bg-orange-100 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-[#f97316]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
            <p className="text-sm text-gray-500">Ensure your account stays secure.</p>
          </div>
        </div>

          {/* Success and Error messages are now handled by global showAlert modals */}


        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Enter current password"
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </div>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Enter new password"
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </div>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Confirm new password"
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </div>
            </div>
          </div>

          <div className="pt-2">
           <button
           type="submit"
           className={`w-full text-white font-bold py-3 rounded-xl hover:shadow-md transition duration-200 ${
           isOwner 
            ? 'bg-[#D89715] hover:bg-[#C28813]' // <-- Changed to your new color!
           : 'bg-[#f97316] hover:bg-orange-600' 
           }`}
            >
           Update Password
           </button>
           </div>
          
        </form>
      </div>
    </div>
  );
}
