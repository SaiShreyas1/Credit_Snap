import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom'; 

export default function ChangePassword() {
  const location = useLocation(); // <-- ADD THIS
  const isOwner = location.pathname.includes('/owner'); // <-- ADD THIS
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 1. Basic Validation: Check for empty fields
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    // 2. NEW FIX: Prevent using the same password
    if (passwords.currentPassword === passwords.newPassword) {
      setError('New password cannot be the same as the current password.');
      return;
    }

    // 3. Length check
    if (passwords.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    // 4. Match check
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    // TODO: Send data to your backend API here
    try {
      setSuccess('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); 
    } catch (err) {
      setError('Failed to update password. Please try again.');
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Enter current password"
              />
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
                type="password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Enter new password"
              />
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
                type="password"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="pt-2">
           <button
           type="submit"
           className={`w-full text-white font-bold py-3 rounded-xl hover:shadow-md transition duration-200 ${
           isOwner 
            ? 'bg-[#192f60]         hover:bg-[#152142]' // <-- Color if it's the Owner
           : 'bg-[#f97316] hover:bg-orange-600' // <-- Color if it's the Student
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