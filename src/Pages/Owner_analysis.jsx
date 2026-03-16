import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, LabelList
} from 'recharts';

// --- MOCK DATA ---
const earningsData = [
  { month: 'Sep', earnings: 210000 },
  { month: 'Oct', earnings: 295000 },
  { month: 'Nov', earnings: 305000 },
  { month: 'Dec', earnings: 20000 },
  { month: 'Jan', earnings: 205000 },
  { month: 'Feb', earnings: 285000 },
  { month: 'Mar', earnings: 265000 },
];

const popularOrdersData = [
  { name: 'Cheese Maggie', value: 30, color: '#A78BFA' },
  { name: 'Masala Maggie', value: 25, color: '#FF8A8A' },
  { name: 'Chicken Biryani', value: 20, color: '#38BDF8' },
  { name: 'Burger', value: 15, color: '#FB923C' },
  { name: 'Others', value: 10, color: '#60A5FA' },
];

const weeklyOrdersData = [
  { day: 'Mon', orders: 167 },
  { day: 'Tue', orders: 182 },
  { day: 'Wed', orders: 140 },
  { day: 'Thu', orders: 189 },
  { day: 'Fri', orders: 162 },
  { day: 'Sat', orders: 223 },
  { day: 'Sun', orders: 247 },
];

export default function Owneranalytics() {
  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      {/* TOP SECTION: Earnings Area Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-[300px]">
        
        {/* Top Right Note (Pulled closer to the top) */}
        <div className="flex justify-end items-start mb-0 shrink-0 -mt-1">
          <p className="text-xs text-gray-400 italic">
            *This graph only presents the data collected from the orders done Through our website
          </p>
        </div>

        {/* Wrapper holding the Label and the Chart side-by-side */}
        <div className="flex-1 w-full flex flex-row min-h-0">
          
          {/* Left Y-Axis Label (Vertically Centered) */}
          <div className="flex flex-col justify-center items-center w-8 shrink-0 pb-6">
            <span className="-rotate-90 text-gray-400 font-medium tracking-widest text-sm whitespace-nowrap">
              Earnings
            </span>
          </div>

          {/* Chart Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {/* Notice the top margin is now 35 to push the graph down */}
                <AreaChart data={earningsData} margin={{ top: 35, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={true} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                  
                  {/* Notice the explicit domain and ticks array to force the 5 values! */}
                  <YAxis 
                    axisLine={true} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                    domain={[0, 400000]}
                    ticks={[0, 100000, 200000, 300000, 400000]}
                  />
                  
                  <Tooltip />
                  <Area type="linear" dataKey="earnings" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Bottom X-Axis Label */}
            <div className="w-full text-center mt-1 shrink-0">
              <span className="text-gray-400 font-medium tracking-widest text-sm">Month</span>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM SECTION: Two Charts */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-[300px]">
        {/* Bottom Left: Popular Orders Donut Chart */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-h-0">
          <h3 className="text-[#38BDF8] font-semibold text-lg mb-1 shrink-0">Most Popular Orders</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={popularOrdersData}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="80%"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {popularOrdersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {
                  <Legend 
                  verticalAlign="bottom" 
                  height={40} 
                  iconType="circle"
                  wrapperStyle={{ 
                    width: '100%', 
                    fontSize: '14px', 
                    color: '#6B7280',
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '10px'
                  }}
                  />
                
                /* <Legend 
                  verticalAlign="bottom" 
                  height={30} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#6B7280' }}
                /> */}
                
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Right: Number of Orders Bar Chart */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-h-0">
          <h3 className="text-[#A78BFA] font-semibold text-lg mb-1 shrink-0">Number of Orders</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyOrdersData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={true} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="orders" fill="#93C5FD" radius={[10, 10, 10, 10]} maxBarSize={40}>
                  {
                    weeklyOrdersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#8B5CF6" />
                    ))
                  }
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