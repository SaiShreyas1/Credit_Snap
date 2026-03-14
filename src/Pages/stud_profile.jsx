import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function StudProfile() {
    const navigate = useNavigate();
  // Using the exact data from your mockup!
  const [studentInfo, setStudentInfo] = useState({
    name: "Shreyas",
    email: "Shreyas@iitk.ac.in",
    phone: "91+XXXXXXXXXX",
    rollNo: "24XXXX",
    roomNo: "A-513 , Hall 12"
  });

  return (
    // Added bg-white to match the clean white background behind the card in your design
    <div className="flex-1 h-full min-h-screen flex items-start justify-center pt-24 bg-white">
      
      {/* The Gray Card */}
      <div className="relative bg-[#e5e5e5] rounded-[32px] border border-gray-400 shadow-sm w-full max-w-2xl px-12 pt-20 pb-12">
        
        {/* The Overlapping Avatar Cutout */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#0f172a] rounded-full flex items-center justify-center w-32 h-32 border-[8px] border-white">
            <User className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-6 text-[1.15rem] text-gray-900 px-6 mt-4">
          <div className="flex items-center">
            <span className="w-40 font-medium">Name :</span>
            <span>{studentInfo.name}</span>
          </div>
          <div className="flex items-center">
            <span className="w-40 font-medium">Email :</span>
            <span>{studentInfo.email}</span>
          </div>
          <div className="flex items-center">
            <span className="w-40 font-medium">Phone No :</span>
            <span>{studentInfo.phone}</span>
          </div>
          <div className="flex items-center">
            <span className="w-40 font-medium">Roll No :</span>
            <span>{studentInfo.rollNo}</span>
          </div>
          <div className="flex items-center">
            <span className="w-40 font-medium">Room No :</span>
            <span>{studentInfo.roomNo}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-14 flex justify-between gap-4 px-6">
          <button className="cursor-pointer bg-[#262626] text-white px-8 py-3 rounded-full font-medium hover:bg-black transition shadow-sm w-1/2">
            Change Password
          </button>
          <button className="cursor-pointer bg-[#0f172a] text-white px-8 py-3 rounded-full font-medium hover:bg-slate-900 transition shadow-sm w-1/2">
            Edit Profile
          </button>
        </div>
        
        <div className="mt-6 flex justify-center">
            <button onClick={() => navigate('/')} className="cursor-pointer bg-[#ea580c] text-white px-14 py-3 rounded-full font-medium text-lg hover:bg-orange-700 transition shadow-sm">
                Log Out
            </button>
        </div>

      </div>
    </div>
  );
}