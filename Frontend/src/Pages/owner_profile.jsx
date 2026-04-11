import { BASE_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { User, AlertTriangle } from 'lucide-react';
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

const parseTimings = (timingStr) => {
  const regex = /(\d+):(\d+)\s*(AM|PM)\s*-\s*(\d+):(\d+)\s*(AM|PM)/i;
  const match = timingStr ? timingStr.match(regex) : null;
  if (match) {
    return {
      fromHour: parseInt(match[1]),
      fromMinute: parseInt(match[2]),
      fromPeriod: match[3].toUpperCase(),
      toHour: parseInt(match[4]),
      toMinute: parseInt(match[5]),
      toPeriod: match[6].toUpperCase(),
    };
  }
  return {
    fromHour: 4, fromMinute: 0, fromPeriod: 'PM',
    toHour: 4, toMinute: 0, toPeriod: 'AM'
  };
};

const formatTimings = (t) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${t.fromHour}:${pad(t.fromMinute || 0)} ${t.fromPeriod} - ${t.toHour}:${pad(t.toMinute || 0)} ${t.toPeriod}`;
};

export default function OwnerProfile() {
  const { showAlert } = useNotifications();
  const navigate = useNavigate();
  
  // Construct the central data object holding canteen identity and administrator contact info
  // 1. Master State
  const [ownerInfo, setOwnerInfo] = useState(buildOwnerInfo(null, null));

  // 2. Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(ownerInfo);
  const [timingParts, setTimingParts] = useState(parseTimings(ownerInfo.timings));

  // Request authorized profile metadata from server during component initialization cycle
  // 🚀 FETCH PROFILE ON MOUNT
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return navigate('/');

        const response = await fetch(`${BASE_URL}/api/users/my-profile`, {
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
    setTimingParts(parseTimings(ownerInfo.timings));
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    const errors = [];

    // 1. Admin Name Validation
    if (!editForm.adminName || editForm.adminName.trim() === '') {
      errors.push("Admin name cannot be empty");
    }

    // 2. Phone Number Validation
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) {
      errors.push("Phone number must be exactly 10 digits");
    }

    // 3. Timing Validation
    const isValid = (h, m) => {
      const hh = parseInt(h);
      const mm = parseInt(m);
      return !isNaN(hh) && hh >= 1 && hh <= 12 && !isNaN(mm) && mm >= 0 && mm <= 59;
    };

    if (!isValid(timingParts.fromHour, timingParts.fromMinute)) {
      errors.push("Opening time must have hours (1-12) and minutes (0-59)");
    }
    if (!isValid(timingParts.toHour, timingParts.toMinute)) {
      errors.push("Closing time must have hours (1-12) and minutes (0-59)");
    }

    if (errors.length > 0) {
      // Show all errors in a single alert box
      showAlert("Validation Error", errors.join(". "), "warning");
      return;
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const payload = {
        canteenName: editForm.canteenName,
        adminName: editForm.adminName,
        phone: editForm.phone,
        timings: formatTimings(timingParts),
      };

      if (editForm.profilePhoto !== ownerInfo.profilePhoto) {
        payload.profilePhoto = editForm.profilePhoto ?? "";
      }

      if (editForm.razorpayMerchantKeyId?.trim()) {
        payload.razorpayMerchantKeyId = editForm.razorpayMerchantKeyId.trim();
      }

      if (editForm.razorpayMerchantKeySecret?.trim()) {
        payload.razorpayMerchantKeySecret = editForm.razorpayMerchantKeySecret.trim();
      }

      const response = await fetch(`${BASE_URL}/api/users/update-my-profile`, {
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
        setTimingParts(parseTimings(newInfo.timings));
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

  const handleTimingChange = (field, value) => {
    if (field.includes('Period')) {
      setTimingParts(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (value === "") {
      setTimingParts(prev => ({ ...prev, [field]: "" }));
      return;
    }

    let numValue = parseInt(value);
    if (isNaN(numValue)) return;

    if (field.includes('Hour')) {
      numValue = Math.max(1, Math.min(12, numValue));
    } else if (field.includes('Minute')) {
      numValue = Math.max(0, Math.min(59, numValue));
    }

    setTimingParts(prev => ({ ...prev, [field]: numValue }));
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
    <div className="flex min-h-screen flex-1 items-start justify-center bg-white px-4 pt-20 sm:px-6 sm:pt-24">
      
      {/* The Gray Card */}
      <div className="relative w-full max-w-2xl rounded-[32px] border border-gray-400 bg-[#e5e5e5] px-5 pb-8 pt-20 shadow-sm sm:px-12 sm:pb-12">
        
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
        <div className="mt-4 space-y-6 px-0 text-[1.15rem] text-gray-900 sm:px-6">
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="w-full font-medium sm:w-48 sm:shrink-0">Canteen Name :</span>
            {isEditing ? (
              <input type="text" name="canteenName" value={editForm.canteenName} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.canteenName}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="w-full font-medium sm:w-48 sm:shrink-0">Admin Name :</span>
            {isEditing ? (
              <input type="text" name="adminName" value={editForm.adminName} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.adminName}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="w-full font-medium sm:w-48 sm:shrink-0">Email :</span>
            <span className={isEditing ? "text-gray-500" : ""}>{ownerInfo.email}</span>
          </div>
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="w-full font-medium sm:w-48 sm:shrink-0">Phone No :</span>
            {isEditing ? (
              <input type="text" name="phone" value={editForm.phone} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{ownerInfo.phone}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="w-full font-medium sm:w-48 sm:shrink-0">Timings :</span>
            {isEditing ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-nowrap items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={timingParts.fromHour}
                      onChange={(e) => handleTimingChange('fromHour', e.target.value)}
                      onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                      className="w-10 text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="mx-0.5">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timingParts.fromMinute}
                      onChange={(e) => handleTimingChange('fromMinute', e.target.value)}
                      onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                      className="w-10 text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <select
                      value={timingParts.fromPeriod}
                      onChange={(e) => handleTimingChange('fromPeriod', e.target.value)}
                      className="ml-1 bg-transparent outline-none cursor-pointer font-medium"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <span className="text-gray-500 font-medium">to</span>
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={timingParts.toHour}
                      onChange={(e) => handleTimingChange('toHour', e.target.value)}
                      onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                      className="w-10 text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="mx-0.5">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timingParts.toMinute}
                      onChange={(e) => handleTimingChange('toMinute', e.target.value)}
                      onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                      className="w-10 text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <select
                      value={timingParts.toPeriod}
                      onChange={(e) => handleTimingChange('toPeriod', e.target.value)}
                      className="ml-1 bg-transparent outline-none cursor-pointer font-medium"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <span>{ownerInfo.timings}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
            <span className="w-full pt-1 font-medium sm:w-48 sm:shrink-0">Razorpay Key ID :</span>
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
            <div className="mt-14 flex flex-col gap-4 px-0 sm:flex-row sm:px-6">
              <button onClick={() => navigate('/owner/change-password')} className="cursor-pointer rounded-full bg-[#0f172a] px-8 py-3 font-medium text-white shadow-sm transition hover:bg-slate-900 sm:w-1/2">
                Change Password
              </button>
              <button onClick={handleEditClick} className="cursor-pointer rounded-full bg-[#0f172a] px-8 py-3 font-medium text-white shadow-sm transition hover:bg-slate-900 sm:w-1/2">
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
              }} className="w-full cursor-pointer rounded-full bg-[#C28813] px-14 py-3 text-lg font-medium text-white shadow-sm transition hover:bg-black sm:w-auto">
                Log Out
             </button>
            </div>
          </>
        ) : (
          // EDIT MODE
          <div className="mt-14 flex flex-col gap-4 px-0 sm:flex-row sm:px-6">
            <button onClick={handleCancelClick} className="cursor-pointer rounded-full bg-gray-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-gray-600 sm:w-1/2">
              Cancel
            </button>
            <button onClick={handleSaveClick} className="cursor-pointer rounded-full bg-[#0f172a] px-8 py-3 font-medium text-white shadow-sm transition hover:bg-slate-900 sm:w-1/2">
              Save Changes
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
