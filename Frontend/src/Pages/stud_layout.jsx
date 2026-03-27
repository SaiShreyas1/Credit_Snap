import { BASE_URL } from '../config';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, Utensils, Wallet, History, HelpCircle, Bell, UserCircle, Settings, LogOut, CheckCircle, XCircle, AlertTriangle, IndianRupee, X } from 'lucide-react';
import studentLogo from '../assets/Student_without_bg_logo.png';
import { io } from 'socket.io-client';

/**
 * StudLayout Component
 * This is the parent "wrapper" component for all student-facing pages.
 * It contains the persistent Sidebar, Top Navigation Bar, and the global Socket.IO
 * listener that catches real-time events (like order updates) no matter what page the user is on.
 */
export default function StudLayout() {
  const navigate = useNavigate();
  const location = useLocation(); 

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // User Data
  const [userProfile, setUserProfile] = useState(null); 
  
  // UI Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Notification System
  const [notifications, setNotifications] = useState([]); 
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // ==========================================
  // NOTIFICATION HELPERS
  // ==========================================

  /**
   * Pushes a new notification to the top of the list.
   * Wrapped in useCallback so it can be safely used inside the Socket useEffect 
   * without causing infinite re-renders. Limits history to the 20 most recent alerts.
   */
  const addNotification = useCallback((type, title, message) => {
    setNotifications(prev => [{
      id: Date.now(),
      type,      // 'success' | 'error' | 'warning' | 'info'
      title,
      message,
      time: new Date(),
      read: false
    }, ...prev].slice(0, 20)); 
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  // Maps notification types to specific colored icons
  const notifIcon = (type) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
    if (type === 'error')   return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />;
    return <IndianRupee className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  };

  // Formats timestamps into human-readable relative time (e.g., "5m ago")
  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };


  // ==========================================
  // GLOBAL SOCKET.IO LISTENERS
  // ==========================================
  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    // Connect to the global WebSocket server
    const socket = io(`${BASE_URL}`);

    socket.on('connect', () => socket.emit('join-student', user._id));

    // EVENT 1: Canteen owner accepts/rejects a food order
    socket.on('orderStatusUpdated', (order) => {
      const items = order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'your order';
      const canteen = order.canteen?.name || 'the canteen';
      if (order.status === 'accepted') {
        addNotification('success', 'Order Accepted! 🎉', `${items} from ${canteen} has been accepted.`);
      } else if (order.status === 'rejected') {
        addNotification('error', 'Order Rejected', `${items} from ${canteen} was rejected by the owner.`);
      }
    });

    // EVENT 2: User's debt changes (checks if they hit 80% or 100% of their limit)
    socket.on('debt-updated', async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/api/debts/my-debts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          data.data.forEach(d => {
            const pct = d.limit > 0 ? (d.amountOwed / d.limit) * 100 : 0;
            const canteen = d.canteen?.name || 'a canteen';
            
            if (pct >= 100) {
              addNotification('error', 'Debt Limit Reached! ⚠️', `You've hit your full ₹${d.limit} limit at ${canteen}. No more orders possible.`);
            } else if (pct >= 80) {
              addNotification('warning', 'Debt Warning (80%)', `Your debt at ${canteen} is ₹${d.amountOwed} — ${Math.round(pct)}% of your ₹${d.limit} limit.`);
            }
          });
        }
      } catch {}
    });

    // EVENT 3: Canteen owner manually clicks "Send Reminder" button
    socket.on('notify-student', ({ canteenName, amountOwed }) => {
      addNotification('info', 'Payment Reminder 💬', `${canteenName} reminds you to clear your ₹${amountOwed} pending debt.`);
    });

    // EVENT 4: Razorpay or Offline payment successfully processed
    socket.on('payment-successful', ({ amount, canteenName }) => {
      addNotification('success', 'Payment Successful! 💳', `Payment of ₹${amount} successfully processed to ${canteenName}.`);
    });

    // Cleanup: Disconnect when user logs out or leaves the layout entirely
    return () => socket.disconnect();
  }, [addNotification]);


  // ==========================================
  // PROFILE FETCH & UI EFFECTS
  // ==========================================

  // Fetch the latest profile data (like Avatar photo) whenever the route changes
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${BASE_URL}/api/users/my-profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
          setUserProfile(data.data.user);
        }
      } catch (error) {
        console.error('Failed to fetch profile for student layout:', error);
      }
    };
    
    fetchProfile();
  }, [location.pathname]);
  
  // Close dropdown menus if the user clicks anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setIsNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // ==========================================
  // NAVIGATION HANDLERS
  // ==========================================

  const toggleNotifications = () => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); };
  const toggleProfile = () => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); };
  
  // Checks if the current URL matches a sidebar link to highlight it
  const isActive = (path) => location.pathname.includes(path);

  /**
   * Smart routing based on notification clicks.
   * Redirects the user to the exact page/tab relevant to the alert they clicked.
   */
  const handleNotificationClick = (notif) => {
    // 1. Mark as read and close dropdown
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsNotificationsOpen(false);
    
    // 2. Route based on notification content keywords
    if (notif.title.includes('Payment Received')) {
      // Navigate to History and auto-open the Transaction tab
      navigate('/student/history', { state: { targetTab: 'debt' } });
    } else if (notif.title.includes('Debt') || notif.title.includes('Payment Reminder')) {
      navigate('/student/debts');
    } else if (notif.title.includes('Order')) {
      navigate('/student/dashboard');
    }
  };


  // ==========================================
  // RENDER UI
  // ==========================================

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <aside className={`${isSidebarOpen ? 'w-48' : 'w-20'} bg-linear-to-b from-[#0f172a] to-[#334f90] text-white flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out overflow-hidden`}>
        <div>
          {/* Hamburger Menu Icon */}
          <div className={`p-4 flex transition-all duration-300 ${isSidebarOpen ? 'justify-start ml-2' : 'justify-center'}`}>
            <Menu 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="w-8 h-8 cursor-pointer hover:text-orange-400 transition" 
            />
          </div>

          <nav className="mt-4 flex flex-col gap-2">
            
            <div onClick={() => navigate('/student/dashboard')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('dashboard') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Home className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Home</span>}
            </div>

            <div onClick={() => navigate('/student/canteens', { state: { reset: true } })} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('canteens') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Utensils className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Canteens</span>}
            </div>
            
            <div onClick={() => navigate('/student/debts')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('debts') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Wallet className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">View debts</span>}
            </div>

            <div onClick={() => navigate('/student/history')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('history') ? 'bg-[#f97316] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <History className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm whitespace-nowrap">History</span>}
            </div>

            <div onClick={() => navigate('/student/help')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('help') ? 'bg-[#ea580c] text-white shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <HelpCircle className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm whitespace-nowrap">Help</span>}
            </div>

          </nav>
        </div>
        
        <div 
          onClick={() => navigate('/student/about')} 
          className={`p-4 border-t border-slate-700 flex justify-center items-center cursor-pointer transition-all duration-300 ${isActive('about') ? 'bg-[#f97316] text-white' : 'hover:bg-slate-700 text-gray-300'}`}
        >
          {isSidebarOpen ? (
            <span className={`text-sm whitespace-nowrap ${isActive('about') ? 'font-semibold' : ''}`}>About us</span>
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-[#f4f7fb] border-b flex justify-between items-center px-4 shadow-sm z-50 shrink-0">
          
          {/* Top Left Logo */}
          <div className="flex items-center h-full">
             <img src={studentLogo} alt="CreditSnap Logo" 
                onClick={() => navigate('/student/dashboard')}
                className="h-full w-auto object-contain mix-blend-multiply scale-[1.1] origin-left ml-2 cursor-pointer hover:opacity-80 transition" 
             />
          </div>
          
          {/* Top Right Icons */}
          <div className="flex items-center gap-6 pr-2">
            
            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative" ref={notificationRef}>
              <Bell onClick={toggleNotifications} className="w-6 h-6 text-gray-700 cursor-pointer hover:text-orange-500 transition" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  
                  {/* Dropdown Header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="font-bold text-gray-800">Notifications</span>
                      {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {notifications.length > 0 && (
                        <>
                          <button onClick={markAllRead} className="text-xs text-orange-500 hover:text-orange-700 font-semibold cursor-pointer transition">Mark all read</button>
                          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition">Clear all</button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Dropdown List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm font-semibold text-gray-400">You're all caught up!</p>
                        <p className="text-xs text-gray-300 mt-1">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex gap-3 px-5 py-4 cursor-pointer transition-colors ${
                            notif.read ? 'bg-white hover:bg-gray-50' : 'bg-orange-50/60 hover:bg-orange-50'
                          }`}
                        >
                          {/* Left Icon */}
                          <div className="flex flex-col items-center">
                             {notifIcon(notif.type)}
                             {!notif.read && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5"></span>}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-gray-800 ${!notif.read ? 'text-gray-900' : ''}`}>{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">{timeAgo(notif.time)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE MENU DROPDOWN */}
            <div className="relative" ref={profileRef}>
              {userProfile && userProfile.profilePhoto ? (
                <img onClick={toggleProfile} src={userProfile.profilePhoto} alt="Profile" className="w-8 h-8 rounded-full object-cover cursor-pointer border border-gray-300 hover:border-orange-500 transition" />
              ) : (
                <UserCircle onClick={toggleProfile} className="w-8 h-8 text-gray-900 cursor-pointer hover:text-orange-500 transition" />
              )}
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-100">
                    <p className="font-bold text-gray-800">{userProfile ? userProfile.name : "Student Profile"}</p>
                    <p className="text-xs text-gray-500">Roll No: {userProfile ? userProfile.rollNo : "Loading..."}</p>
                  </div>
                  <div className="flex flex-col">
                    <div onClick={() => { navigate('/student/profile'); setIsProfileOpen(false); }} className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-sm text-gray-700 transition">
                      <Settings className="w-4 h-4" /> Account Settings
                    </div>
                    <div onClick={() => {
                      // Fully clear both local and session storage on logout
                      sessionStorage.removeItem('token');
                      sessionStorage.removeItem('user');
                      sessionStorage.removeItem('canteenId');
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      localStorage.removeItem('canteenId');
                      navigate('/');
                      setIsProfileOpen(false);
                    }} className="px-4 py-3 hover:bg-red-50 cursor-pointer flex items-center gap-3 text-sm text-red-600 font-medium transition border-t border-gray-100">
                      <LogOut className="w-4 h-4" /> Logout
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* CHILD ROUTE INJECTION POINT */}
        {/* The <Outlet /> renders whatever child component matches the current URL route */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
           <Outlet />
        </div>

      </div>
    </div>
  );
}