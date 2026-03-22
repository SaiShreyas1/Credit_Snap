import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OwnerProfile() {
  const navigate = useNavigate();
  
  // 1. Master State
  const [ownerInfo, setOwnerInfo] = useState({
    canteenName: "Loading...",
    adminName: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    timings: "Loading...",
  });

  // 2. Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(ownerInfo);

  // 🚀 FETCH PROFILE ON MOUNT
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const response = await fetch('http://localhost:5000/api/users/my-profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
          const user = data.data.user;
          const canteen = data.data.canteen;
          
          const newInfo = {
            canteenName: canteen?.name || "Not Set",
            adminName: user.name || "Not Set",
            email: user.email || "Not Set",
            phone: user.phoneNo || "Not Set",
            timings: canteen?.timings || "4:00 PM - 4:00 AM",
          };
          
          setOwnerInfo(newInfo);
          setEditForm(newInfo);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    
    fetchProfile();
  }, [navigate]);

  // 3. Handlers
  const handleEditClick = () => {
    setEditForm(ownerInfo); // reset form to current data
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/update-my-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setOwnerInfo(editForm); // save the new data locally to reflect changes
        setIsEditing(false);
      } else {
        alert(data.message || 'Error updating profile');
      }
    } catch (err) {
      alert('Network Error: Could not connect to backend.');
    }
  };

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex-1 h-full min-h-screen flex items-start justify-center pt-24 bg-white">
      
      {/* The Gray Card */}
      <div className="relative bg-[#e5e5e5] rounded-[32px] border border-gray-400 shadow-sm w-full max-w-2xl px-12 pt-20 pb-12">
        
        {/* The Overlapping Avatar Cutout */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#0f172a] rounded-full flex items-center justify-center w-32 h-32 border-[8px] border-white">
            <User className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Text Details / Input Fields */}
        <div className="space-y-6 text-[1.15rem] text-gray-900 px-6 mt-4">
          
          <div className="flex items-center">
            <span className="w-48 font-medium shrink-0">Canteen Name :</span>
            {isEditing ? (
              <input type="text" name="canteenName" value={editForm.canteenName} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.canteenName}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-48 font-medium shrink-0">Admin Name :</span>
            {isEditing ? (
              <input type="text" name="adminName" value={editForm.adminName} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.adminName}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-48 font-medium shrink-0">Email :</span>
            <span className={isEditing ? "text-gray-500" : ""}>{ownerInfo.email}</span>
          </div>
          
          <div className="flex items-center">
            <span className="w-48 font-medium shrink-0">Phone No :</span>
            {isEditing ? (
              <input type="text" name="phone" value={editForm.phone} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.phone}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-48 font-medium shrink-0">Timings :</span>
            {isEditing ? (
              <input type="text" name="timings" value={editForm.timings} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.timings}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing ? (
          // VIEW MODE
          <>
            <div className="mt-14 flex justify-between gap-4 px-6">
              <button onClick={() => navigate('/owner/change-password')} className="cursor-pointer bg-[#262626] text-white px-8 py-3 rounded-full font-medium hover:bg-black transition shadow-sm w-1/2">
                Change Password
              </button>
              <button onClick={handleEditClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Edit Profile
              </button>
            </div>
            <div className="mt-6 flex justify-center">
              <button onClick={() => navigate('/')} className="cursor-pointer bg-[#C28813] text-white px-14 py-3 rounded-full font-medium text-lg hover:bg-black transition shadow-sm">
                Log Out
             </button>
            </div>
          </>
        ) : (
          // EDIT MODE
          <div className="mt-14 flex justify-between gap-4 px-6">
            <button onClick={handleCancelClick} className="cursor-pointer bg-gray-500 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-600 transition shadow-sm w-1/2">
              Cancel
            </button>
            <button onClick={handleSaveClick} className="cursor-pointer bg-[#16a34a] text-white px-8 py-3 rounded-full font-medium hover:bg-green-700 transition shadow-sm w-1/2">
              Save Changes
            </button>
          </div>
        )}

      </div>
    </div>
  );
}