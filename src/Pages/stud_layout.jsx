import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, Utensils, Wallet, History, HelpCircle, Bell, UserCircle, Settings, LogOut } from 'lucide-react';
import studentLogo from '../assets/Student_without_bg_logo.png';

export default function StudLayout() {
  const navigate = useNavigate();
  const location = useLocation(); 

  const [userProfile, setUserProfile] = useState(null); 
  const [notifications, setNotifications] = useState([]); 
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- NEW: Refs for detecting clicks outside ---
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // --- NEW: Listener for clicks outside the dropdowns ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleNotifications = () => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); };
  const toggleProfile = () => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); };

  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-48 bg-[#1e293b] text-white flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4"><Menu className="w-8 h-8 cursor-pointer hover:text-orange-400 transition" /></div>
          <nav className="mt-4 flex flex-col gap-2">
            
            <div onClick={() => navigate('/student/dashboard')} className={`mx-2 py-3 px-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${isActive('dashboard') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Home className="w-6 h-6 mb-1" /><span className="text-sm font-semibold">Home</span>
            </div>

            <div onClick={() => navigate('/student/canteens')} className={`mx-2 py-3 px-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${isActive('canteens') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Utensils className="w-6 h-6 mb-1" /><span className="text-sm font-semibold">Canteens</span>
            </div>
            
            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <Wallet className="w-6 h-6 mb-1" /><span className="text-sm">View debts</span>
            </div>
            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <History className="w-6 h-6 mb-1" /><span className="text-sm">History</span>
            </div>
            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <HelpCircle className="w-6 h-6 mb-1" /><span className="text-sm">Help</span>
            </div>

          </nav>
        </div>
        <div className="p-4 border-t border-slate-700 text-center cursor-pointer hover:bg-slate-700 transition">
          <span className="text-sm text-gray-300">About us</span>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-[#f4f7fb] border-b flex justify-between items-center px-4 shadow-sm z-10 shrink-0">
          <div className="flex items-center h-full">
             <img src={studentLogo} alt="CreditSnap Logo" className="h-full w-auto object-contain mix-blend-multiply scale-[1.1] origin-left ml-2" />
          </div>
          
          <div className="flex items-center gap-6 pr-2">
            
            {/* --- Added ref={notificationRef} here --- */}
            <div className="relative" ref={notificationRef}>
              <Bell onClick={toggleNotifications} className="w-6 h-6 text-gray-700 cursor-pointer hover:text-orange-500 transition" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                  <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 flex justify-between">
                    <span>Notifications</span>
                    {notifications.length > 0 && <span className="text-xs text-orange-600 cursor-pointer hover:underline">Mark all read</span>}
                  </div>
                  <div className="p-4 space-y-3">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2 italic">You have no new notifications.</p>
                    ) : (
                      notifications.map((notif, index) => (
                        <div key={index} className="text-sm border-l-4 border-orange-400 pl-3">
                          <p className="font-semibold text-gray-800">{notif.title}</p>
                          <p className="text-gray-500 text-xs">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- Added ref={profileRef} here --- */}
            <div className="relative" ref={profileRef}>
              <UserCircle onClick={toggleProfile} className="w-8 h-8 text-gray-900 cursor-pointer hover:text-orange-500 transition" />
              {isProfileOpen && (
                <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-100">
                    <p className="font-bold text-gray-800">{userProfile ? userProfile.name : "Student Profile"}</p>
                    <p className="text-xs text-gray-500">Roll No: {userProfile ? userProfile.rollNo : "Loading..."}</p>
                  </div>
                  <div className="flex flex-col">
                    <div onClick={() => navigate('/student/profile')} className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-sm text-gray-700 transition">
                      <Settings className="w-4 h-4" /> Account Settings
                    </div>
                    <div onClick={() => navigate('/')} className="px-4 py-3 hover:bg-red-50 cursor-pointer flex items-center gap-3 text-sm text-red-600 font-medium transition border-t border-gray-100">
                      <LogOut className="w-4 h-4" /> Logout
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <Outlet />

      </div>
    </div>
  );
}