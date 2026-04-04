import { BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, LabelList
} from 'recharts';

export default function Owneranalytics() {
  const [analytics, setAnalytics] = useState({
    earningsData: [],
    popularOrdersData: [],
    weeklyOrdersData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // ⭐ NEW: Catches errors to prevent white screens!

  // Retrieve grouped statistical metrics from backend to populate visual chart elements
  const fetchAnalytics = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/analytics/owner`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        setAnalytics(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fire data retrieval on initial mount and setup corresponding socket listeners for live changes
  // Initial fetch
  useEffect(() => {
    fetchAnalytics();

    // 🔌 SOCKET.IO: Live-refresh charts when new orders or payments arrive
    const canteenId = sessionStorage.getItem('canteenId');
    if (!canteenId) return;

    const socket = io(`${BASE_URL}`);
    socket.on('connect', () => socket.emit('join-canteen', canteenId));

    // Whenever a new order lands OR a debt is paid, re-fetch the analytics
    socket.on('newOrder', () => fetchAnalytics());
    socket.on('debt-updated', () => fetchAnalytics());
    socket.on('orderStatusUpdated', () => fetchAnalytics());

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-xl font-medium">Loading Analytics...</div>;
  }

  // ⭐ CRASH PREVENTION: Show the error nicely on the screen!
  if (error) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl max-w-lg border border-red-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-3">Analytics Not Ready</h2>
          <p className="font-medium text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Format numeric strings strictly into valid Indian Rupee representation
  // Safe Formatter to prevent `.toLocaleString()` from crashing on empty data
  const formatCurrency = (value) => value ? `₹${Number(value).toLocaleString()}` : '₹0';

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      {/* TOP SECTION: Earnings Area Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-[300px]">
        <div className="flex justify-end items-start mb-0 shrink-0 -mt-1">
          <p className="text-xs text-gray-400 italic">
            *This graph only presents the data collected from the orders done through our website
          </p>
        </div>

        <div className="flex-1 w-full flex flex-row min-h-0">
          <div className="flex flex-col justify-center items-center w-8 shrink-0 pb-6">
            <span className="-rotate-90 text-gray-400 font-medium tracking-widest text-sm whitespace-nowrap">
              Earnings
            </span>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.earningsData} margin={{ top: 35, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                  <YAxis 
                    axisLine={true} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip formatter={formatCurrency} />
                  <Area type="linear" dataKey="earnings" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full text-center mt-1 shrink-0">
              <span className="text-gray-400 font-medium tracking-widest text-sm">Month</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Two Charts */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-[300px]">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-h-0">
          <h3 className="text-[#38BDF8] font-semibold text-lg mb-1 shrink-0">Most Popular Orders</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.popularOrdersData}
                  cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" paddingAngle={5}
                  dataKey="value" stroke="none"
                >
                  {analytics.popularOrdersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 w-full text-[14px] text-[#6B7280] pt-3">
                        {payload.map((entry, index) => (
                          <li key={`item-${index}`} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                            <span className="truncate">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-h-0">
          <h3 className="text-[#A78BFA] font-semibold text-lg mb-1 shrink-0">Number of Orders</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeklyOrdersData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={true} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="orders" fill="#93C5FD" radius={[10, 10, 10, 10]} maxBarSize={40}>
                  {analytics.weeklyOrdersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#8B5CF6" />
                  ))}
                  <LabelList dataKey="orders" position="center" fill="white" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
