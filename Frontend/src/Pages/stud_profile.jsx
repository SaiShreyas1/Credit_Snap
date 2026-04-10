import { BASE_URL } from '../config';
import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

export default function StudProfile() {
  const { showAlert } = useNotifications();
  const navigate = useNavigate();
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  // 1. Master State: Holds the currently saved and verified user data.
  const [studentInfo, setStudentInfo] = useState({
    name: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    rollNo: "Loading...",
    hallNo: "Not Provided",
    roomNo: "Not Provided",
    profilePhoto: null
  });

  // 2. Edit Mode State: Controls the UI toggle and holds temporary draft data.
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(studentInfo);


  // ==========================================
  // DATA FETCHING & SYNCHRONIZATION
  // ==========================================

  // Fetch actual user data on load from API to ensure it's up to date
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return navigate('/');

        const response = await fetch(`${BASE_URL}/api/users/my-profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
          const user = data.data.user;
          
          // Map backend data to our frontend state structure, providing fallbacks
          const realData = {
            name: user.name || "N/A",
            email: user.email || "N/A",
            phone: user.phoneNo || "N/A",
            rollNo: user.rollNo || "N/A",
            hallNo: user.hallNo || "Not Provided",
            roomNo: user.roomNo || "Not Provided",
            profilePhoto: user.profilePhoto || null
          };
          setStudentInfo(realData);
          setEditForm(realData); // Pre-fill the edit form with the fetched data
          
          // Keep the active session in sync without leaving stale user data behind
          sessionStorage.setItem('user', JSON.stringify(user));
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    
    fetchProfile();
  }, [navigate]);


  // ==========================================
  // FORM & ACTION HANDLERS
  // ==========================================

  // Toggles to Edit Mode and ensures the draft form matches current actual data
  const handleEditClick = () => {
    setEditForm(studentInfo); 
    setIsEditing(true);
  };

  // Discards any draft changes and returns to View Mode
  const handleCancelClick = () => {
    setIsEditing(false);
  };

  // Submits the draft changes to the backend API
  const handleSaveClick = async () => {
    if (!editForm.name || editForm.name.trim() === '') {
      showAlert("Validation Error", "name cannot be empty", "warning");
      return;
    }

    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) {
      showAlert("Validation Error", "number of digits in phone number is not equal to 10", "warning");
      return;
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/update-my-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        const updatedUser = data.data.user;
        
        // Map the successful response back into the Master State
        const newStudentInfo = {
          name: updatedUser.name,
          email: updatedUser.email, // Email generally doesn't change, but good to sync
          phone: updatedUser.phoneNo,
          rollNo: updatedUser.rollNo,
          hallNo: updatedUser.hallNo,
          roomNo: updatedUser.roomNo,
          profilePhoto: updatedUser.profilePhoto
        };

        setStudentInfo(newStudentInfo);
        setIsEditing(false); // Return to View Mode
        
        // Keep the browser session storage synchronized with the new database values
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.removeItem('user');
        
        showAlert("Success", "Profile updated successfully!", "success");
      } else {
        showAlert("Error", data.message || 'Error updating profile', "error");
      }
    } catch (err) {
      showAlert("Network Error", "Could not connect to backend.", "error");
    }
  };

  // Generic input handler for all text fields in the Edit Form
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'name') {
      newValue = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (name === 'roomNo') {
      newValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    } else if (name === 'rollNo') {
      newValue = value.replace(/[^a-zA-Z0-9]/g, '');
    } else if (name === 'phone') {
      newValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setEditForm({ ...editForm, [name]: newValue });
  };

  // ==========================================
  // PROFILE PHOTO HANDLING
  // ==========================================

  // Converts uploaded image to a Base64 string for easy JSON transmission
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Hard limit: 500KB to prevent database bloat
    if (file.size > 500 * 1024) {
      showAlert("Image Too Large", "Please upload a profile picture smaller than 500KB.", "warning");
      return;
    }

    // Read the file and convert to Base64 data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm({ ...editForm, profilePhoto: reader.result });
      setIsEditing(true); // Automatically switch to edit mode if they just uploaded a photo
    };
    reader.readAsDataURL(file);
  };

  // Clears the photo from the draft state
  const handleRemovePhoto = (e) => {
    e.preventDefault();
    setEditForm({ ...editForm, profilePhoto: "" });
    setIsEditing(true);
  };

  // Determine which photo to show: the draft one (if editing) or the saved one
  const displayPhoto = isEditing ? editForm.profilePhoto : studentInfo.profilePhoto;


  // ==========================================
  // RENDER UI
  // ==========================================

  return (
    <div className="flex-1 h-full min-h-screen flex items-start justify-center pt-24 bg-white">
      
      {/* The Main Profile Card */}
      <div className="relative bg-[#e5e5e5] rounded-[32px] border border-gray-400 shadow-sm w-full max-w-2xl px-12 pt-20 pb-12">
        
        {/* Floating Avatar Container */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="relative bg-[#0f172a] rounded-full flex items-center justify-center w-32 h-32 border-[8px] border-white overflow-hidden group transition-all">
            
            {/* Display Image or Placeholder Icon */}
            {displayPhoto ? (
              <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-white" strokeWidth={2} />
            )}
            
            {/* Hover Overlay for Upload/Remove (Only visible on hover) */}
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
              <label className="cursor-pointer hover:opacity-80 transition-opacity">
                <span className="text-white text-[11px] font-semibold tracking-wider uppercase">Change</span>
                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {displayPhoto && (
                <button onClick={handleRemovePhoto} className="cursor-pointer text-red-400 hover:text-red-300 transition-colors text-[11px] font-semibold tracking-wider uppercase mt-1">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic User Details Section */}
        <div className="space-y-6 text-[1.15rem] text-gray-900 px-6 mt-4">
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Name :</span>
            {isEditing ? (
              <input type="text" name="name" value={editForm.name} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{studentInfo.name}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Email :</span>
            {/* Email is uneditable, just slightly faded during edit mode */}
            <span className={isEditing ? "text-gray-500" : ""}>{studentInfo.email}</span>
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Phone No :</span>
            {isEditing ? (
              <div className="w-full max-w-sm">
                <input type="text" name="phone" value={editForm.phone} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full outline-none focus:border-[#0f172a] shadow-sm transition" />
                {editForm.phone && editForm.phone.length !== 10 && (
                  <div className="text-red-500 text-xs mt-1 px-1">Mobile number must be exactly 10 digits.</div>
                )}
              </div>
            ) : (
              <span>{studentInfo.phone}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Roll No :</span>
            <span className={isEditing ? "text-gray-500" : ""}>{studentInfo.rollNo}</span>
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Hall No :</span>
            {isEditing ? (
              <select name="hallNo" value={['Not Provided', null, ''].includes(editForm.hallNo) ? "" : editForm.hallNo} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition">
                <option value="" disabled>Select Hall No</option>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>Hall {num}</option>
                ))}
              </select>
            ) : (
              <span>{studentInfo.hallNo}</span>
            )}
          </div>

          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Room No :</span>
            {isEditing ? (
              <input type="text" name="roomNo" value={editForm.roomNo} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{studentInfo.roomNo}</span>
            )}
          </div>

        </div>

        {/* Action Buttons Section */}
        {!isEditing ? (
          
          /* --- VIEW MODE BUTTONS --- */
          <>
            <div className="mt-14 flex justify-between gap-4 px-6">
              <button onClick={() => navigate('/student/change-password')} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Change Password
              </button>
              <button onClick={handleEditClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Edit Profile
              </button>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button onClick={() => {
                // Completely clear local state to prevent security bleeding
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('canteenId');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('canteenId');
                navigate('/');
              }} className="cursor-pointer bg-[#ea580c] text-white px-14 py-3 rounded-full font-medium text-lg hover:bg-orange-700 transition shadow-sm">
                Log Out
              </button>
            </div>
          </>
          
        ) : (
          
          /* --- EDIT MODE BUTTONS --- */
          <div className="mt-14 flex justify-between gap-4 px-6">
            <button onClick={handleCancelClick} className="cursor-pointer bg-gray-500 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-600 transition shadow-sm w-1/2">
              Cancel
            </button>
            <button onClick={handleSaveClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
              Save Changes
            </button>
          </div>
          
        )}

      </div>
    </div>
  );
}