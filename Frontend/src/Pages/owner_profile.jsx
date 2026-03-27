import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const buildOwnerInfo = (user, canteen) => ({
  canteenName: canteen?.name || "Not Set",
  adminName: user?.name || "Not Set",
  email: user?.email || "Not Set",
  phone: user?.phoneNo || "Not Set",
  timings: canteen?.timings || "4:00 PM - 4:00 AM",
  profilePhoto: user?.profilePhoto || null,
  razorpayMerchantKeyId: canteen?.razorpayMerchantKeyId || "",
  razorpayMerchantKeySecret: "",
  razorpayMerchantSecretConfigured: Boolean(canteen?.razorpayMerchantSecretConfigured),
});

export default function OwnerProfile() {
  const { showAlert } = useNotifications();
  const navigate = useNavigate();
  
  // Construct the central data object holding canteen identity and administrator contact info
  // 1. Master State
  const [ownerInfo, setOwnerInfo] = useState(buildOwnerInfo(null, null));

  // 2. Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(ownerInfo);

  // Request authorized profile metadata from server during component initialization cycle
  // 🚀 FETCH PROFILE ON MOUNT
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return navigate('/');

        const response = await fetch('http://localhost:5000/api/users/my-profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
          const newInfo = buildOwnerInfo(data.data.user, data.data.canteen);
          setOwnerInfo(newInfo);
          setEditForm(newInfo);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    
    fetchProfile();
  }, [navigate]);

  // Functions for orchestrating the view/edit mode swaps and managing network payload dispatch
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
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const payload = {
        canteenName: editForm.canteenName,
        adminName: editForm.adminName,
        phone: editForm.phone,
        timings: editForm.timings,
        profilePhoto: editForm.profilePhoto ?? "",
      };

      if (editForm.razorpayMerchantKeyId?.trim()) {
        payload.razorpayMerchantKeyId = editForm.razorpayMerchantKeyId.trim();
      }

      if (editForm.razorpayMerchantKeySecret?.trim()) {
        payload.razorpayMerchantKeySecret = editForm.razorpayMerchantKeySecret.trim();
      }

      const response = await fetch('http://localhost:5000/api/users/update-my-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        const newInfo = buildOwnerInfo(data.data.user, data.data.canteen);
        setOwnerInfo(newInfo);
        setEditForm(newInfo);
        setIsEditing(false);
        showAlert("Success", "Profile updated successfully!", "success");
      } else {
        showAlert("Error", data.message || 'Error updating profile', "error");
      }
    } catch {
      showAlert("Network Error", "Could not connect to backend.", "error");
    }
  };

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      showAlert("Image Too Large", "Please upload a profile picture smaller than 500KB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm({ ...editForm, profilePhoto: reader.result });
      setIsEditing(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e) => {
    e.preventDefault();
    setEditForm({ ...editForm, profilePhoto: "" });
    setIsEditing(true);
  };

  const displayPhoto = isEditing ? editForm.profilePhoto : ownerInfo.profilePhoto;

  return (
    <div className="flex-1 h-full min-h-screen flex items-start justify-center pt-24 bg-white">
      
      {/* The Gray Card */}
      <div className="relative bg-[#e5e5e5] rounded-[32px] border border-gray-400 shadow-sm w-full max-w-2xl px-12 pt-20 pb-12">
        
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="relative bg-[#0f172a] rounded-full flex items-center justify-center w-32 h-32 border-[8px] border-white overflow-hidden group transition-all">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-white" strokeWidth={2} />
            )}
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

          <div className="flex items-start">
            <span className="w-48 font-medium shrink-0 pt-1">Razorpay Key ID :</span>
            <div className="w-full max-w-sm">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="razorpayMerchantKeyId"
                    value={editForm.razorpayMerchantKeyId}
                    onChange={handleChange}
                    placeholder="rzp_test_xxxxx"
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full outline-none focus:border-[#0f172a] shadow-sm transition"
                  />
                  <p className="text-xs text-gray-600 mt-2 leading-5">
                    Use the Razorpay API key ID from this canteen&apos;s own merchant account. Payments will go directly to this canteen.
                  </p>
                  <input
                    type="password"
                    name="razorpayMerchantKeySecret"
                    value={editForm.razorpayMerchantKeySecret}
                    onChange={handleChange}
                    placeholder={ownerInfo.razorpayMerchantSecretConfigured ? 'Leave blank to keep existing secret' : 'Enter Razorpay key secret'}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full outline-none focus:border-[#0f172a] shadow-sm transition mt-4"
                  />
                  <p className="text-xs text-gray-600 mt-2 leading-5">
                    The key secret is stored securely on the backend and is never shown again after saving.
                  </p>
                </>
              ) : ownerInfo.razorpayMerchantKeyId ? (
                <div>
                  <span>{ownerInfo.razorpayMerchantKeyId}</span>
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    {ownerInfo.razorpayMerchantSecretConfigured
                      ? 'Direct Razorpay payments are connected for this canteen.'
                      : 'Key ID saved, but the secret still needs to be added.'}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-gray-500">Not connected</span>
                  <p className="text-xs text-amber-700 mt-2 font-medium">Students cannot pay debts online until this canteen adds its Razorpay merchant keys.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing ? (
          // VIEW MODE
          <>
            <div className="mt-14 flex justify-between gap-4 px-6">
              <button onClick={() => navigate('/owner/change-password')} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Change Password
              </button>
              <button onClick={handleEditClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Edit Profile
              </button>
            </div>
            <div className="mt-6 flex justify-center">
              <button onClick={() => {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('canteenId');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('canteenId');
                navigate('/');
              }} className="cursor-pointer bg-[#C28813] text-white px-14 py-3 rounded-full font-medium text-lg hover:bg-black transition shadow-sm">
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
            <button onClick={handleSaveClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
              Save Changes
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
