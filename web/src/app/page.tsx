'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Users,
  Monitor,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  Wrench,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '@/lib/supabase';


export default function DashboardPage() {
  const [complaintData, setComplaintData] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeComplaints: 0,
    pendingRequests: 0,
    totalDesks: 0
  });
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // 1. Fetch Counts
      const [devRes, compRes, reqRes, dskRes] = await Promise.all([
        supabase.from('devices').select('status', { count: 'exact' }),
        supabase.from('complaints').select('created_at', { count: 'exact' }).eq('status', 'Open'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('desks').select('*', { count: 'exact', head: true })
      ]);

      // 2. Fetch Weekly Complaints Activity
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today

      const { data: recentActivity } = await supabase
        .from('complaints')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process Weekly Activity
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const activityMap = new Map();

      // Initialize last 7 days with 0
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        activityMap.set(dayName, 0);
      }

      (recentActivity as any[])?.forEach(item => {
        const d = new Date(item.created_at);
        const dayName = days[d.getDay()];
        if (activityMap.has(dayName)) {
          activityMap.set(dayName, activityMap.get(dayName) + 1);
        }
      });

      // Transform to array and reverse to show oldest to newest (optional, but usually charts go left-right time)
      // Actually, let's just map the static days array to ensure correct order if we wanted specific order,
      // but for "Last 7 Days" dynamic sliding window might be better. 
      // Let's stick to the map values for simplicity of the chart axis.
      // Better approach: Generate array of last 7 days in order.
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        // Lookup count from our data
        const count = (recentActivity as any[])?.filter(x => {
          const xd = new Date(x.created_at);
          return xd.getDate() === d.getDate() && xd.getMonth() === d.getMonth();
        }).length || 0;

        chartData.push({ name: dayName, count });
      }
      setComplaintData(chartData);

      // 3. Process Device Health
      const devices = devRes.data || [];
      const statusCounts = devices.reduce((acc: any, curr: any) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      const healthChartData = [
        { name: 'Good', value: statusCounts['Good'] || 0, color: '#10b981' }, // Emerald
        { name: 'Faulty', value: statusCounts['Faulty'] || 0, color: '#f43f5e' }, // Rose
        { name: 'In Repair', value: statusCounts['In Repair'] || 0, color: '#f59e0b' }, // Amber
        { name: 'Bad', value: statusCounts['Bad'] || 0, color: '#64748b' }, // Slate
      ].filter(item => item.value > 0);
      setHealthData(healthChartData);

      // 4. Recent Complaints List
      const { data: recentComp } = await supabase
        .from('complaints')
        .select('*, devices(barcode)')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalDevices: devRes.count || 0,
        activeComplaints: compRes.count || 0,
        pendingRequests: reqRes.count || 0,
        totalDesks: dskRes.count || 0
      });
      setRecentComplaints(recentComp || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facility Dashboard</h1>
          <p className="text-slate-500">Overview of IT assets and support status</p>
        </div>
        <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <React.Fragment>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Assets"
              value={stats.totalDevices}
              icon={<Monitor className="text-blue-600" />}
              trend="+2.5%"
              trendUp={true}
            />
            <StatCard
              title="Open Complaints"
              value={stats.activeComplaints}
              icon={<AlertCircle className="text-rose-600" />}
              trend="Low"
              trendUp={false}
              warning={stats.activeComplaints > 5}
            />
            <StatCard
              title="IT Requests"
              value={stats.pendingRequests}
              icon={<ClipboardList className="text-amber-600" />}
              trend="Pending"
              trendUp={true}
            />
            <StatCard
              title="Deployed Desks"
              value={stats.totalDesks}
              icon={<CheckCircle2 className="text-emerald-600" />}
              trend="Healthy"
              trendUp={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Complaint Activity (Weekly)</h2>
                <select className="text-sm border-none bg-slate-50 rounded-md py-1 px-2 text-slate-600 focus:ring-0">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complaintData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Device Health</h2>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900">92%</span>
                  <span className="text-xs text-slate-500 uppercase font-bold">Uptime</span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {healthData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Complaints</h2>
              <a href="/complaints" className="text-blue-600 text-sm font-bold hover:underline underline-offset-4">View All</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4">Reporter</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Device Barcode</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentComplaints.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.reporter_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ring-1 ring-inset ${item.category === 'Hardware' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                          item.category === 'Network' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                            'bg-slate-50 text-slate-700 ring-slate-600/20'
                          }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{item.devices?.barcode || 'N/A'}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {recentComplaints.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No recent complaints found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </React.Fragment>
      )}
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, trend, trendUp, warning }: any) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${warning ? 'ring-2 ring-rose-500/20 border-rose-200' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-slate-50 rounded-lg">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      {warning && (
        <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500" />
      )}
    </div>
  );
}
