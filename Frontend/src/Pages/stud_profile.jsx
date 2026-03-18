import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudProfile() {
  const navigate = useNavigate();
  
  // 1. Master State
  const [studentInfo, setStudentInfo] = useState({
    name: "Shreyas",
    email: "Shreyas@iitk.ac.in",
    phone: "91+XXXXXXXXXX",
    rollNo: "24XXXX",
    roomNo: "A-513 , Hall 12"
  });

  // 2. Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(studentInfo);

  // 3. Handlers
  const handleEditClick = () => {
    setEditForm(studentInfo); // reset form to current data
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    setStudentInfo(editForm); // save the new data
    setIsEditing(false);
    // TODO: Send data to backend here!
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
            <span className="w-40 font-medium shrink-0">Name :</span>
            {isEditing ? (
              <input type="text" name="name" value={editForm.name} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{studentInfo.name}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Email :</span>
            <span className={isEditing ? "text-gray-500" : ""}>{studentInfo.email}</span>
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Phone No :</span>
            {isEditing ? (
              <input type="text" name="phone" value={editForm.phone} onChange={handleChange} className="bg-white border border-gray-300 rounded-lg px-3 py-1 w-full max-w-sm outline-none focus:border-[#0f172a] shadow-sm transition" />
            ) : (
              <span>{studentInfo.phone}</span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="w-40 font-medium shrink-0">Roll No :</span>
            <span className={isEditing ? "text-gray-500" : ""}>{studentInfo.rollNo}</span>
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

        {/* Action Buttons */}
        {!isEditing ? (
          // VIEW MODE
          <>
            <div className="mt-14 flex justify-between gap-4 px-6">
              <button onClick={() => navigate('/student/change-password')} className="cursor-pointer bg-[#262626] text-white px-8 py-3 rounded-full font-medium hover:bg-black transition shadow-sm w-1/2">
                Change Password
              </button>
              <button onClick={handleEditClick} className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
                Edit Profile
              </button>
            </div>
            <div className="mt-6 flex justify-center">
              <button onClick={() => navigate('/')} className="cursor-pointer bg-[#ea580c] text-white px-14 py-3 rounded-full font-medium text-lg hover:bg-orange-700 transition shadow-sm">
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