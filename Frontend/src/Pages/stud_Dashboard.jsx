import { BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Formats a raw timestamp into a human-readable string.
 * Converts dates to "Today, HH:MM", "Yesterday, HH:MM", or falls back to "MM/DD/YYYY, HH:MM".
 */
const formatOrderDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  // Check if the date is exactly today
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  // Check if the date is exactly yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${timeString}`;
  if (isYesterday) return `Yesterday, ${timeString}`;
  return `${date.toLocaleDateString()}, ${timeString}`;
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

/**
 * Renders an individual order card.
 * If the order is 'pending', the card becomes clickable and expands to reveal action buttons.
 */
const ActiveOrderCard = ({ order, onCancelOrder, onChangeOrder }) => {
  // Controls the slide-down action menu for pending orders
  const [isExpanded, setIsExpanded] = useState(false);

  // Safe fallbacks in case populated data is missing
  const canteenName = order.canteen?.name || 'Unknown Canteen';
  const orderItems = order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Unknown Items';
  const isPending = order.status === 'pending';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border flex flex-col mb-4 transition-all duration-200 overflow-hidden
        ${isPending ? 'border-orange-100 hover:shadow-md hover:border-orange-200 cursor-pointer' : 'border-gray-100'}
        ${isExpanded ? 'shadow-md border-orange-200' : ''}
      `}
      onClick={() => isPending && setIsExpanded(!isExpanded)}
    >
      {/* Main Visible Row */}
      <div className="p-5 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{orderItems}</h3>
          <p className="text-gray-600 text-sm">
            {canteenName}, <span className="text-gray-500">{formatOrderDate(order.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Dynamic Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                order.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            {/* Dropdown chevron only shows for pending orders */}
            {isPending && (
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
          <span className="font-semibold text-blue-900">
            Price: <span className="text-blue-600">₹{order.totalAmount}</span>
          </span>
        </div>
      </div>

      {/* Slide-in Action Panel (Only renders if order is pending AND user clicked it) */}
      {isPending && isExpanded && (
        <div
          className="px-5 pb-4 pt-1 border-t border-orange-50 flex gap-3 bg-orange-50/40"
          onClick={(e) => e.stopPropagation()} // Prevents the card from collapsing when a button is clicked
        >
          <button
            onClick={() => onChangeOrder(order)}
            className="cursor-pointer px-5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 border border-indigo-100"
          >
            ✏️ Change Order
          </button>
          <button
            onClick={() => onCancelOrder(order._id)}
            className="cursor-pointer px-5 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 border border-red-100"
          >
            ✕ Cancel
          </button>
          <span className="ml-auto self-center text-xs text-gray-400 italic">Click card to close</span>
        </div>
      )}
    </div>
  );
};


// ==========================================
// MAIN COMPONENT
// ==========================================

export default function StudDashboard() {
  const { showAlert, showConfirm } = useNotifications();
  const navigate = useNavigate();

  // View State
  const [totalDebt, setTotalDebt] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------
  // DATA FETCHING
  // ------------------------------------------

  // Fetches the user's total active debt and generates limit warnings
  const fetchTotalDebt = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${BASE_URL}/api/debts/my-debts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        // Calculate total combined debt across all canteens
        const sum = res.data.data.reduce((total, d) => total + d.amountOwed, 0);
        setTotalDebt(sum);

        // Generate alert notifications if any individual canteen debt approaches the limit
        const generatedAlerts = [];
        res.data.data.forEach(d => {
          if (d.amountOwed >= 2400) { // 2400 is 80% of the assumed 3000 limit
            generatedAlerts.push({
              canteen: d.canteen?.name || "Unknown Canteen",
              message: `Debt is at ₹${d.amountOwed} (≥80% of ₹3000 limit)`
            });
          }
        });
        setAlerts(generatedAlerts);
      }
    } catch (err) {
      console.error('Failed to fetch debts:', err);
    }
  };

  // ------------------------------------------
  // LIFECYCLES & SOCKETS
  // ------------------------------------------

  // 1. Initial Load: Fetch orders and debt
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(`${BASE_URL}/api/orders/my-active-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.status === 'success') {
          const now = new Date();
          const fortyEightHoursMs = 48 * 60 * 60 * 1000;

          // Filter out system "payment" orders and orders older than 48 hours
          const recentActualOrders = res.data.data.filter(order => {
            // Because debt payments are logged as orders in the DB, we hide them from the dashboard list
            const isPayment = order.items && order.items.length > 0 &&
              (order.items[0].name === 'Offline Debt Payment' || order.items[0].name === 'Online Debt Payment');
            if (isPayment) return false;

            // Only show orders from the last 2 days
            const orderDate = new Date(order.createdAt);
            const isRecent = (now - orderDate) <= fortyEightHoursMs;
            return isRecent;
          });

          setCurrentOrders(recentActualOrders);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };

    fetchOrders();
    fetchTotalDebt();
  }, []);

  // 2. Real-time Socket Connection
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const userIdStr = user._id;

    // Connect to the WebSocket server
    const socket = io(`${BASE_URL}`);
    socket.on('connect', () => {
      socket.emit('join-student', userIdStr); // Join user-specific room for targeted notifications
    });

    // Listener: Updates the UI instantly when a canteen accepts/rejects an order
    socket.on('orderStatusUpdated', (updatedOrder) => {
      setCurrentOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );
    });

    // Listener: Refreshes the debt hero banner instantly if a payment is processed
    socket.on('debt-updated', () => {
      fetchTotalDebt();
    });

    // Cleanup: Disconnect when the user leaves the dashboard
    return () => {
      socket.disconnect();
    };
  }, []);

  // ------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------

  // Safely cancels an order via the API and updates local UI state
  const handleCancelOrder = (orderId) => {
    showConfirm(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      async () => {
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          await axios.patch(`${BASE_URL}/api/orders/${orderId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Update local state so UI updates without needing a full page refresh
          setCurrentOrders(prev => prev.map(o =>
            o._id === orderId ? { ...o, status: 'cancelled' } : o
          ));

          showAlert("Order Cancelled", "Your order has been successfully cancelled.", "success");
        } catch (err) {
          showAlert("Error", err.response?.data?.message || "Error cancelling order", "error");
        }
      }
    );
  };

  // Edit Order Workflow: Cancels current order, redirects to Canteen page, and pre-fills the cart
  const handleChangeOrder = async (order) => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      // 1. Cancel the existing order on the backend so they aren't charged double
      await axios.patch(`${BASE_URL}/api/orders/${order._id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Extract Canteen ID safely (handling populated vs unpopulated mongoose documents)
      const canteenId = typeof order.canteen === 'object' ? order.canteen._id : order.canteen;

      // 3. Navigate to the Canteens page, passing the old cart state so it opens automatically
      navigate('/student/canteens', {
        state: {
          isChangingOrder: true,
          canteenId: canteenId,
          cartItems: order.items
        }
      });

    } catch (err) {
      showAlert("Error", "Failed to change order. Please try again.", "error");
    }
  };

  // ------------------------------------------
  // RENDER UI
  // ------------------------------------------

  return (
    <main className="p-8 overflow-y-auto flex-1 bg-gray-50 min-h-screen">

      {/* --- TOP ROW: DEBT WIDGET & ALERTS --- */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">

        {/* Total Debt Hero Card */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-2xl p-6 text-white flex-1 shadow-lg h-40 flex flex-col justify-between">
          <div>
            <p className="text-lg opacity-90">Total Debt:</p>
            <h1 className="text-4xl font-bold tracking-tight">₹{totalDebt.toFixed(2)}</h1>
          </div>
          {totalDebt > 0 && (
            <div>
              <button onClick={() => navigate('/student/debts')} className="bg-[#f97316] hover:bg-orange-600 text-white px-6 py-1.5 rounded-full font-semibold shadow-md transition cursor-pointer">
                Pay Now
              </button>
            </div>
          )}
        </div>

        {/* Debt Limits / Alerts Card */}
        <div className="bg-white rounded-2xl p-4 flex-1 shadow-sm border border-gray-100 max-w-md flex flex-col h-40">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800">Alerts</h2>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm italic">You have no active alerts.</p>
            ) : (
              alerts.map((alert, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-lg border-l-4 border-orange-400 bg-orange-50/50">
                  <span className="font-medium text-gray-800">{alert.canteen}</span>
                  <span className="text-sm font-semibold text-red-800">{alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- BOTTOM ROW: RECENT ORDERS FEED --- */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Current Orders:</h2>
        <div className="space-y-4">
          {currentOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">You have no active orders. Go to Canteens to order some food!</p>
            </div>
          ) : (
            currentOrders.map((order) => (
              <ActiveOrderCard
                key={order._id}
                order={order}
                onCancelOrder={handleCancelOrder}
                onChangeOrder={handleChangeOrder}
              />
            ))
          )}
        </div>
      </div>

      {/* Note: Modals and Toasts are managed globally by NotificationContext */}
    </main>
  );
}