import { BASE_URL } from '../config';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, Edit, Wallet, BarChart2, History, HelpCircle, Bell, UserCircle, Settings, LogOut, ShoppingBag, CheckCircle, AlertTriangle, IndianRupee, X } from 'lucide-react';
import canteenLogo from '../assets/Canteen_without_bg_logo.png';
import { socket } from '../socket';

const NOTIFICATION_STORAGE_PREFIX = 'creditsnap:notifications';
const MAX_NOTIFICATIONS = 20;
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA_QUERY).matches
);

const getStoredUser = () => {
  try {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    if (!user?._id || !user?.role) return null;

    return user;
  } catch {
    return null;
  }
};

const getNotificationStorageKey = () => {
  const user = getStoredUser();
  if (!user) return null;

  return `${NOTIFICATION_STORAGE_PREFIX}:${user.role}:${user._id}`;
};

const normalizeNotifications = (notifications) => {
  if (!Array.isArray(notifications)) return [];

  return notifications
    .filter((notification) => (
      notification &&
      notification.id !== undefined &&
      typeof notification.title === 'string' &&
      typeof notification.message === 'string'
    ))
    .slice(0, MAX_NOTIFICATIONS);
};

const loadStoredNotifications = () => {
  const key = getNotificationStorageKey();
  if (!key) return [];

  try {
    const rawNotifications = sessionStorage.getItem(key);
    if (!rawNotifications) return [];

    return normalizeNotifications(JSON.parse(rawNotifications));
  } catch {
    return [];
  }
};

const saveStoredNotifications = (notifications) => {
  const key = getNotificationStorageKey();
  if (!key) return;

  try {
    sessionStorage.setItem(key, JSON.stringify(normalizeNotifications(notifications)));
  } catch {
    // Ignore storage failures so notifications continue working in memory.
  }
};

const clearStoredNotifications = () => {
  const key = getNotificationStorageKey();
  if (!key) return;

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures during logout cleanup.
  }
};

export default function OwnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = useState({ name: "Loading...", role: "Canteen Owner" });
  const [notifications, setNotifications] = useState(() => loadStoredNotifications());

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // --- ORDER TOAST STATES ---
  const [orderToast, setOrderToast] = useState(null); // { title, message }
  const orderToastTimer = useRef(null);
  
  // Track current path for conditional popups
  const pathRef = useRef(location.pathname);
  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  const showOrderToast = useCallback((title, message) => {
    if (orderToastTimer.current) clearTimeout(orderToastTimer.current);
    setOrderToast({ title, message });
    orderToastTimer.current = setTimeout(() => setOrderToast(null), 6000);
  }, []);

  // --- PAYMENT TOAST STATES ---
  const [paymentToast, setPaymentToast] = useState(null);
  const paymentToastTimer = useRef(null);
  const recentNotificationKeysRef = useRef(new Map());

  const showPaymentToast = useCallback((studentName, amount) => {
    if (paymentToastTimer.current) clearTimeout(paymentToastTimer.current);
    setPaymentToast({ studentName, amount });
    paymentToastTimer.current = setTimeout(() => setPaymentToast(null), 5000);
  }, []);

  // Manage array of short-lived notification objects for displaying real-time UI alerts
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

  const shouldSkipDuplicateNotification = useCallback((key, ttlMs = 5000) => {
    const now = Date.now();
    const recentNotificationKeys = recentNotificationKeysRef.current;

    for (const [storedKey, timestamp] of recentNotificationKeys.entries()) {
      if (now - timestamp > ttlMs) {
        recentNotificationKeys.delete(storedKey);
      }
    }

    if (recentNotificationKeys.has(key)) {
      return true;
    }

    recentNotificationKeys.set(key, now);
    return false;
  }, []);

  // Socket.IO: Live owner notifications
  useEffect(() => {
    let isCancelled = false;

    const fetchProfileAndJoinSocket = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${BASE_URL}/api/users/my-profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (isCancelled) return;

        if (data.status === 'success') {
          const user = data.data.user;
          const canteen = data.data.canteen;

          setUserProfile({
            name: canteen?.name || user.name || "Admin",
            role: "Canteen Owner",
            profilePhoto: user.profilePhoto || null
          });

          if (canteen?._id) {
            sessionStorage.setItem('canteenId', canteen._id);
            localStorage.setItem('canteenId', canteen._id);
          }

          const canteenId = canteen?._id;
          if (canteenId) {
            socket.connect();

            const handleConnect = () => socket.emit('join-canteen', canteenId);
            socket.on('connect', handleConnect);
            if (socket.connected) handleConnect();

            socket.on('newOrder', (order) => {
              const firstItemName = order.items?.[0]?.name;
              const isDebtPayment =
                firstItemName === 'Offline Debt Payment' ||
                firstItemName === 'Online Debt Payment';
              if (isDebtPayment) return;
              if (order?._id && shouldSkipDuplicateNotification(`new-order:${order._id}`)) return;

              const studentName = order.student?.name || 'A student';
              const items = order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'an order';

              const title = `New Order 🛍️`;
              const message = `${studentName} placed: ${items} (₹${order.totalAmount})`;

              addNotification('info', title, message);
              
              // Only drop down the toast if they are NOT actively looking at the dashboard
              if (!pathRef.current.includes('/dashboard')) {
                showOrderToast(title, message);
              }
            });

            socket.on('debt-threshold', ({ studentName, pct, amountOwed, limit }) => {
              if (pct >= 100) {
                addNotification('error', 'Debt Limit Reached!', `${studentName} has hit the ₹${limit} limit (₹${amountOwed} owed). No new orders possible.`);
              } else if (pct >= 80) {
                addNotification('warning', 'Debt Warning (80%+)', `${studentName} is at ₹${amountOwed} — ${Math.round(pct)}% of the ₹${limit} limit.`);
              }
            });

            socket.on('payment-received', (data) => {
              addNotification('success', `Payment Received 💰`, `${data.studentName} paid ₹${data.amount} online.`);
              showPaymentToast(data.studentName, data.amount);
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile for layout:', error);
      }
    };

    fetchProfileAndJoinSocket();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname, addNotification, showPaymentToast, showOrderToast, shouldSkipDuplicateNotification]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktopViewport);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setIsNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleViewportChange = (event) => {
      setIsSidebarOpen(event.matches);
    };

    handleViewportChange(mediaQuery);
    mediaQuery.addEventListener?.('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleViewportChange);
    };
  }, []);

  const toggleNotifications = () => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); };
  const toggleProfile = () => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); };
  const handleSidebarNavigate = (path) => {
    navigate(path);
    if (!isDesktopViewport()) {
      setIsSidebarOpen(false);
    }
  };
  const isActive = (path) => location.pathname.includes(path);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  const handleNotificationClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsNotificationsOpen(false);

    if (notif.title.includes('New Order')) {
      navigate('/owner/dashboard');
    } else if (notif.title.includes('Payment Received')) {
      navigate('/owner/history');
    } else if (notif.title.includes('Debt')) {
      navigate('/owner/debts');
    }
  };

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  const notifIcon = (type) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
    if (type === 'error') return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />;
    return <ShoppingBag className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />;
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] bg-gray-50 font-sans overflow-hidden">

      {/* --- MOBILE OVERLAY BACKDROP --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <aside className={`absolute top-0 left-0 md:relative z-[70] h-[100dvh] md:h-full ${isSidebarOpen ? 'w-48 translate-x-0' : '-translate-x-full md:translate-x-0 w-20'} bg-[#1e293b] text-white flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out overflow-hidden`}>
        <div>
          <div className={`p-4 flex transition-all duration-300 ${isSidebarOpen ? 'justify-start ml-2' : 'justify-center'}`}>
            <Menu
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-8 h-8 cursor-pointer hover:text-[#eab308] transition hidden md:block"
            />
            {/* Close button for mobile */}
            <X 
              onClick={() => setIsSidebarOpen(false)}
              className="w-8 h-8 cursor-pointer hover:text-[#eab308] transition md:hidden"
            />
          </div>

          <nav className="mt-4 flex flex-col gap-2">

            <div onClick={() => handleSidebarNavigate('/owner/dashboard')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('dashboard') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Home className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Home</span>}
            </div>

            <div onClick={() => handleSidebarNavigate('/owner/editmenu')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('editmenu') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Edit className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Edit Menu</span>}
            </div>

            <div onClick={() => handleSidebarNavigate('/owner/debts')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('debts') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <Wallet className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Active Debts</span>}
            </div>

            <div onClick={() => handleSidebarNavigate('/owner/analytics')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('analytics') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <BarChart2 className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">Analytics</span>}
            </div>

            <div onClick={() => handleSidebarNavigate('/owner/history')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('history') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <History className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm whitespace-nowrap">History</span>}
            </div>

            <div onClick={() => handleSidebarNavigate('/owner/help')} className={`mx-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isActive('help') ? 'bg-[#eab308] text-[#1e293b] shadow-lg' : 'text-gray-300 hover:text-white opacity-70'}`}>
              <HelpCircle className={`w-6 h-6 transition-all duration-300 ${isSidebarOpen ? 'mb-1' : ''}`} />
              {isSidebarOpen && <span className="text-sm whitespace-nowrap">Help</span>}
            </div>
          </nav>
        </div>

        <div
          onClick={() => handleSidebarNavigate('/owner/about')}
          className={`p-4 border-t border-slate-700 flex justify-center items-center cursor-pointer transition-all duration-300 ${isActive('about') ? 'bg-[#eab308] text-[#1e293b]' : 'hover:bg-slate-700 text-gray-300'}`}
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

        <header className="relative h-16 bg-[#f4f7fb] border-b flex justify-between items-center px-3 sm:px-4 shadow-sm z-50 shrink-0">
          <div className="flex items-center h-full gap-2">
            <Menu className="w-6 h-6 md:hidden cursor-pointer text-slate-800" onClick={() => setIsSidebarOpen(true)} />
            <img src={canteenLogo} alt="CreditSnap Logo"
              onClick={() => navigate('/owner/dashboard')}
              className="h-full max-w-[9.5rem] sm:max-w-none w-auto object-contain mix-blend-multiply scale-[1.1] origin-left ml-2 cursor-pointer hover:opacity-80 transition"
              onError={(e) => e.target.src = "https://via.placeholder.com/150x50?text=Logo+Here"}
            />
          </div>

          {/* ── PAYMENT TOAST ── centered between logo and bell ── */}
          <div className="pointer-events-none absolute top-full left-2 right-2 mt-2 md:static md:mt-0 md:flex-1 md:flex md:justify-center md:items-center">
            <div
              className={`pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-[#eab308]/50 bg-[#1e293b] px-4 py-2.5 shadow-lg transition-all duration-500 md:min-w-[260px] md:max-w-[380px] ${paymentToast
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-3 scale-95 pointer-events-none'
                }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#eab308]/20 shrink-0">
                <IndianRupee className="w-4 h-4 text-[#eab308]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#eab308] tracking-wide uppercase">Payment Received 💰</p>
                <p className="text-sm text-white font-medium truncate">
                  {paymentToast?.studentName} paid <span className="text-[#eab308] font-bold">₹{paymentToast?.amount}</span>
                </p>
              </div>
              <button
                onClick={() => { setPaymentToast(null); clearTimeout(paymentToastTimer.current); }}
                className="text-gray-400 hover:text-white transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 pr-0 sm:pr-2">

            <div className="relative" ref={notificationRef}>
              <Bell onClick={toggleNotifications} className="w-6 h-6 text-gray-700 cursor-pointer hover:text-[#eab308] transition" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}

              {/* --- NEW ORDER TOAST POPUP (Low Opacity, Anchored) --- */}
              <div
                onClick={() => {
                   navigate('/owner/dashboard');
                   setOrderToast(null);
                   clearTimeout(orderToastTimer.current);
                }}
                className={`fixed top-20 left-2 right-2 z-[60] pointer-events-auto flex items-start gap-3 bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-2xl rounded-2xl p-4 transition-all duration-500 ease-out sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-3 sm:w-80 cursor-pointer hover:bg-gray-50 ${
                  orderToast
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fefce8] shrink-0 mt-0.5">
                  <ShoppingBag className="w-5 h-5 text-[#eab308]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{orderToast?.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">{orderToast?.message}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setOrderToast(null); clearTimeout(orderToastTimer.current); }}
                  className="text-gray-400 hover:text-gray-700 transition shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* ------------------------------------------------ */}

              {isNotificationsOpen && (
                <div className="fixed top-20 left-2 right-2 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-4 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="font-bold text-gray-800">Notifications</span>
                      {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {notifications.length > 0 && (
                        <>
                          <button onClick={markAllRead} className="text-xs text-[#eab308] hover:text-yellow-600 font-semibold cursor-pointer transition">Mark all read</button>
                          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition">Clear all</button>
                        </>
                      )}
                    </div>
                  </div>
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
                          className={`flex gap-3 px-5 py-4 cursor-pointer transition-colors ${notif.read ? 'bg-white hover:bg-gray-50' : 'bg-yellow-50/60 hover:bg-yellow-50'
                            }`}
                        >
                          {notifIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-gray-800 ${!notif.read ? 'text-gray-900' : ''}`}>{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">{timeAgo(notif.time)}</p>
                          </div>
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-[#eab308] shrink-0 mt-1.5"></span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              {userProfile && userProfile.profilePhoto ? (
                <img onClick={toggleProfile} src={userProfile.profilePhoto} alt="Profile" className="w-8 h-8 rounded-full object-cover cursor-pointer border border-gray-300 hover:border-[#eab308] transition" />
              ) : (
                <UserCircle onClick={toggleProfile} className="w-8 h-8 text-gray-900 cursor-pointer hover:text-[#eab308] transition" />
              )}
              {isProfileOpen && (
                <div className="fixed top-20 left-2 right-2 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-4 sm:w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-100">
                    <p className="font-bold text-gray-800">{userProfile ? userProfile.name : "Admin Profile"}</p>
                    <p className="text-xs text-gray-500">{userProfile ? userProfile.role : "Loading..."}</p>
                  </div>
                  <div className="flex flex-col">
                    <div onClick={() => { navigate('/owner/profile'); setIsProfileOpen(false); }} className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-sm text-gray-700 transition">
                      <Settings className="w-4 h-4" /> Canteen Settings
                    </div>
                    <div onClick={() => {
                      clearStoredNotifications();
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


        <div className="flex-1 overflow-y-auto bg-[#f4f7f6] relative">
          <Outlet />
        </div>

      </div>
    </div>
  );
}
