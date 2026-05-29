/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    BarChart2, Download, Calendar, Filter, RefreshCw,
    Package, Wrench, FileWarning, ClipboardList, Monitor,
    TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportType = 'inventory' | 'deployments' | 'maintenance' | 'complaints' | 'requests';

interface ReportConfig {
    id: ReportType;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
}

const REPORT_TYPES: ReportConfig[] = [
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'blue', description: 'Device stock levels and status breakdown' },
    { id: 'deployments', label: 'Deployments', icon: Monitor, color: 'indigo', description: 'Deployed vs available devices over time' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'orange', description: 'Repair logs and parts replaced' },
    { id: 'complaints', label: 'Complaints', icon: FileWarning, color: 'rose', description: 'Issue reports and resolution rates' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, color: 'emerald', description: 'Supply requests and approval status' },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toCSV(rows: Record<string, any>[], columns: string[]): string {
    const header = columns.join(',');
    const body = rows.map(r =>
        columns.map(c => {
            const v = r[c] ?? '';
            const s = String(v).replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${s}"` : s;
        }).join(',')
    );
    return [header, ...body].join('\n');
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
    const palette: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        orange: 'bg-orange-50 text-orange-600',
        rose: 'bg-rose-50 text-rose-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        slate: 'bg-slate-100 text-slate-600',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${palette[color] ?? palette.slate}`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    // Device status
    Available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Deployed: 'bg-blue-50 text-blue-700 border border-blue-200',
    Faulty: 'bg-rose-50 text-rose-700 border border-rose-200',
    Disposal: 'bg-slate-100 text-slate-600 border border-slate-200',
    // Complaint status
    Open: 'bg-orange-50 text-orange-700 border border-orange-200',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Escalated: 'bg-purple-50 text-purple-700 border border-purple-200',
    // Request status
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Approved: 'bg-blue-50 text-blue-700 border border-blue-200',
    Fulfilled: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
    // Parts
    None: 'bg-slate-50 text-slate-400 border border-slate-200',
};

const STATUS_COLS = new Set(['Status']);
const MONO_COLS = new Set(['Barcode', 'Serial Number', 'Date', 'Deployed At', 'Moved From On', 'IP Address', 'MAC Address']);
const WRAP_COLS = new Set(['Description', 'Activity', 'Parts Replaced', 'Items']);
const LOC_COLS = new Set(['Current Location', 'Previous Location']);

function TableCell({ col, val }: { col: string; val: any }) {
    const str = String(val ?? '');

    if (STATUS_COLS.has(col) && STATUS_COLORS[str]) {
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${STATUS_COLORS[str]}`}>
                {str}
            </span>
        );
    }
    if (MONO_COLS.has(col)) {
        return <span className="font-mono text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700">{str}</span>;
    }
    if (LOC_COLS.has(col)) {
        if (str === '—' || str === '') return <span className="text-slate-300 text-sm">—</span>;
        const isCurrentCol = col === 'Current Location';
        return (
            <span className={`text-sm font-medium whitespace-nowrap ${isCurrentCol ? 'text-blue-700' : 'text-slate-400'
                }`}>
                {str}
            </span>
        );
    }
    if (WRAP_COLS.has(col)) {
        return <span className="text-slate-700 text-sm leading-relaxed max-w-sm block">{str}</span>;
    }
    return <span className="text-slate-700 whitespace-nowrap">{str}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

    const [reportType, setReportType] = useState<ReportType>('inventory');
    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<Record<string, any>>({});
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    // ── Pagination ─────────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Reset to page 1 whenever data or pageSize changes
    React.useEffect(() => { setCurrentPage(1); }, [data, pageSize]);

    // Auto-load inventory on first mount
    React.useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                await fetchInventoryAll();
                setGenerated(true);
            } finally {
                setLoading(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    async function fetchDeployments() {
        // Pull deployment_history with full location chain
        const { data: history } = await supabase
            .from('deployment_history')
            .select(`
                id,
                deployed_at,
                removed_at,
                device_id,
                devices (
                    id, barcode, brand, model, deployment_status,
                    device_categories ( name ),
                    hospitals ( name )
                ),
                desks (
                    id, name,
                    offices (
                        id, name,
                        wings (
                            id, name,
                            hospitals ( name )
                        )
                    )
                )
            `)
            .gte('deployed_at', startDate)
            .lte('deployed_at', endDate + 'T23:59:59')
            .order('deployed_at', { ascending: false });

        const rows = history || [];

        // Group by device_id → pick current (removed_at IS NULL) & previous
        const byDevice: Record<string, { current: any; previous: any; device: any }> = {};
        rows.forEach(h => {
            const devId = h.device_id;
            if (!byDevice[devId]) byDevice[devId] = { current: null, previous: null, device: h.devices };
            if (!h.removed_at && !byDevice[devId].current) {
                byDevice[devId].current = h;
            } else if (h.removed_at && !byDevice[devId].previous) {
                byDevice[devId].previous = h;
            }
        });

        const locationLabel = (h: any) => {
            if (!h?.desks) return '—';
            const desk = h.desks?.name ?? '';
            const office = h.desks?.offices?.name ?? '';
            if (desk && office) return `${desk} (${office})`;
            return desk || office || '—';
        };

        // Chart: count by deployment status
        const statusCount: Record<string, number> = {};
        Object.values(byDevice).forEach(({ device }) => {
            const s = (device as any)?.deployment_status ?? 'Unknown';
            statusCount[s] = (statusCount[s] || 0) + 1;
        });
        setChartData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

        const devList = Object.values(byDevice);
        setStats({
            total: devList.length,
            deployed: devList.filter(d => (d.device as any)?.deployment_status === 'Deployed').length,
            available: devList.filter(d => (d.device as any)?.deployment_status === 'Available').length,
            faulty: devList.filter(d => (d.device as any)?.deployment_status === 'Faulty').length,
        });

        setData(devList.map(({ current, previous, device }) => ({
            Barcode: (device as any)?.barcode ?? '',
            Brand: (device as any)?.brand ?? '',
            Model: (device as any)?.model ?? '',
            Category: (device as any)?.device_categories?.name ?? '',
            Status: (device as any)?.deployment_status ?? '',
            'Current Location': locationLabel(current),
            'Deployed At': current ? format(parseISO(current.deployed_at), 'yyyy-MM-dd') : '—',
            'Previous Location': locationLabel(previous),
            'Moved From On': previous?.removed_at ? format(parseISO(previous.removed_at), 'yyyy-MM-dd') : '—',
        })));
    }

    function buildInventoryRows(devices: any[]) {
        const catCount: Record<string, number> = {};
        devices.forEach(d => {
            const cat = d.device_categories?.name ?? 'Uncategorized';
            catCount[cat] = (catCount[cat] || 0) + 1;
        });
        setChartData(Object.entries(catCount).map(([name, value]) => ({ name, value })));
        setStats({
            total: devices.length,
            available: devices.filter(d => d.status === 'Available').length,
            deployed: devices.filter(d => d.status === 'Deployed').length,
            faulty: devices.filter(d => d.status === 'Faulty').length,
        });
        setData(devices.map(d => ({
            Barcode: d.barcode,
            'Serial Number': d.serial_number ?? '',
            Brand: d.brand ?? '',
            Model: d.model ?? '',
            Status: d.status,
            Category: d.device_categories?.name ?? '',
            Facility: d.hospitals?.name ?? '',
            'IP Address': d.ip_address ?? '',
            'MAC Address': d.mac_address ?? '',
            'Added On': format(parseISO(d.created_at), 'yyyy-MM-dd'),
        })));
    }

    // Load ALL inventory (no date filter) — used on initial mount
    async function fetchInventoryAll() {
        const { data: devices } = await supabase
            .from('devices')
            .select('id, barcode, brand, model, status, serial_number, ip_address, mac_address, created_at, device_categories(name), hospitals(name)');
        buildInventoryRows(devices || []);
    }

    // Load inventory filtered by date range
    async function fetchInventory() {
        const { data: devices } = await supabase
            .from('devices')
            .select('id, barcode, brand, model, status, serial_number, ip_address, mac_address, created_at, device_categories(name), hospitals(name)')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        buildInventoryRows(devices || []);
    }

    async function fetchMaintenance() {
        const { data: logs } = await supabase
            .from('maintenance_logs')
            .select('id, description, parts_replaced, performed_at, devices(barcode, brand, model, hospitals(name))')
            .gte('performed_at', startDate)
            .lte('performed_at', endDate + 'T23:59:59')
            .order('performed_at', { ascending: false });

        const rows = logs || [];
        // group by month
        const byMonth: Record<string, number> = {};
        rows.forEach(l => {
            const m = format(parseISO(l.performed_at), 'MMM yyyy');
            byMonth[m] = (byMonth[m] || 0) + 1;
        });
        setChartData(Object.entries(byMonth).map(([name, count]) => ({ name, count })));
        setStats({ total: rows.length, withParts: rows.filter(l => l.parts_replaced).length });
        setData(rows.map(l => ({
            Date: format(parseISO(l.performed_at), 'yyyy-MM-dd'),
            Barcode: (l.devices as any)?.barcode ?? '',
            Device: `${(l.devices as any)?.brand ?? ''} ${(l.devices as any)?.model ?? ''}`.trim(),
            Facility: (l.devices as any)?.hospitals?.name ?? '',
            Activity: l.description,
            'Parts Replaced': l.parts_replaced ?? 'None',
        })));
    }

    async function fetchComplaints() {
        const { data: complaints } = await supabase
            .from('complaints')
            .select('id, reporter_name, description, category, status, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .order('created_at', { ascending: false });

        const rows = complaints || [];
        const byStatus: Record<string, number> = {};
        rows.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
        setChartData(Object.entries(byStatus).map(([name, value]) => ({ name, value })));
        setStats({
            total: rows.length,
            open: rows.filter(c => c.status === 'Open').length,
            resolved: rows.filter(c => c.status === 'Resolved').length,
            inProgress: rows.filter(c => c.status === 'In Progress').length,
        });
        setData(rows.map(c => ({
            Date: format(parseISO(c.created_at), 'yyyy-MM-dd'),
            Reporter: c.reporter_name,
            Category: c.category,
            Status: c.status,
            Description: c.description,
        })));
    }

    async function fetchRequests() {
        const { data: requests } = await supabase
            .from('requests')
            .select(`
                id, 
                reporter_name, 
                status, 
                created_at,
                request_items ( item_type, quantity, status )
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59')
            .order('created_at', { ascending: false });

        const rows = requests || [];
        const byStatus: Record<string, number> = {};
        rows.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
        setChartData(Object.entries(byStatus).map(([name, value]) => ({ name, value })));
        setStats({
            total: rows.length,
            pending: rows.filter(r => r.status === 'Pending').length,
            approved: rows.filter(r => r.status === 'Approved').length,
            fulfilled: rows.filter(r => r.status === 'Fulfilled').length,
            rejected: rows.filter(r => r.status === 'Rejected').length,
        });
        setData(rows.map(r => {
            const itemsList = r.request_items?.map((i: any) => `${i.item_type} (${i.quantity})`).join(', ') || 'No items';
            const totalQty = r.request_items?.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0) || 0;
            return {
                Date: format(parseISO(r.created_at), 'yyyy-MM-dd'),
                Reporter: r.reporter_name,
                Items: itemsList,
                'Total Qty': totalQty,
                Status: r.status,
            };
        }));
    }

    // ── Generate ───────────────────────────────────────────────────────────────
    async function generateReport() {
        setLoading(true);
        setGenerated(false);
        try {
            if (reportType === 'inventory') await fetchInventory();
            if (reportType === 'deployments') await fetchDeployments();
            if (reportType === 'maintenance') await fetchMaintenance();
            if (reportType === 'complaints') await fetchComplaints();
            if (reportType === 'requests') await fetchRequests();
            setGenerated(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // ── Export ─────────────────────────────────────────────────────────────────
    function handleExport() {
        if (!data.length) return;
        const cols = Object.keys(data[0]);
        const csv = toCSV(data, cols);
        downloadCSV(csv, `${reportType}_report_${startDate}_to_${endDate}.csv`);
    }

    const cfg = REPORT_TYPES.find(r => r.id === reportType)!;
    const isBar = reportType === 'maintenance';

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BarChart2 className="text-blue-600" size={26} />
                        Reports
                    </h1>
                    <p className="text-slate-500 mt-1">Generate and export data reports with custom date filters</p>
                </div>
                {generated && (
                    <button
                        onClick={handleExport}
                        disabled={!data.length}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-blue-200 transition-all disabled:opacity-40"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                )}
            </div>

            {/* Report Type Picker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {REPORT_TYPES.map(r => {
                    const Icon = r.icon;
                    const active = reportType === r.id;
                    const palette: Record<string, string> = {
                        blue: active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50',
                        indigo: active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50',
                        orange: active ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50',
                        rose: active ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/50',
                        emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50',
                    };
                    return (
                        <button
                            key={r.id}
                            onClick={() => { setReportType(r.id); setGenerated(false); }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${palette[r.color]}`}
                        >
                            <Icon size={22} />
                            <span className="text-sm font-semibold">{r.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12} /> Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12} /> End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            max={today}
                            onChange={e => setEndDate(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />}
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                    {cfg.description}
                </p>
            </div>

            {/* Results */}
            {generated && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {reportType === 'deployments' || reportType === 'inventory' ? (
                            <>
                                <StatCard label="Total Devices" value={stats.total} icon={Package} color="blue" />
                                <StatCard label="Deployed" value={stats.deployed} icon={Monitor} color="indigo" />
                                <StatCard label="Available" value={stats.available} icon={CheckCircle2} color="emerald" />
                                <StatCard label="Faulty" value={stats.faulty} icon={AlertTriangle} color="rose" />
                            </>
                        ) : reportType === 'maintenance' ? (
                            <>
                                <StatCard label="Total Logs" value={stats.total} icon={Wrench} color="orange" />
                                <StatCard label="Parts Replaced" value={stats.withParts} icon={TrendingUp} color="blue" />
                            </>
                        ) : reportType === 'complaints' ? (
                            <>
                                <StatCard label="Total" value={stats.total} icon={FileWarning} color="rose" />
                                <StatCard label="Open" value={stats.open} icon={AlertTriangle} color="orange" />
                                <StatCard label="In Progress" value={stats.inProgress} icon={Clock} color="blue" />
                                <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="emerald" />
                            </>
                        ) : (
                            <>
                                <StatCard label="Total" value={stats.total} icon={ClipboardList} color="emerald" />
                                <StatCard label="Pending" value={stats.pending} icon={Clock} color="orange" />
                                <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="blue" />
                                <StatCard label="Fulfilled" value={stats.fulfilled} icon={TrendingUp} color="indigo" />
                            </>
                        )}
                    </div>

                    {/* Chart */}
                    {chartData.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                                {cfg.label} Breakdown
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    {isBar ? (
                                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={90}
                                                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {chartData.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    {cfg.label} Data — {data.length} Record{data.length !== 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">{startDate} → {endDate}</p>
                            </div>
                            <button
                                onClick={handleExport}
                                disabled={!data.length}
                                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                            >
                                <Download size={14} />
                                Export CSV
                            </button>
                        </div>
                        {data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <XCircle size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">No records found for this date range</p>
                                <p className="text-sm mt-1">Try adjusting the start or end date</p>
                            </div>
                        ) : (() => {
                            const totalPages = Math.ceil(data.length / pageSize);
                            const paginated = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                            return (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {Object.keys(data[0]).map(col => (
                                                        <th key={col} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginated.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                        {Object.entries(row).map(([col, val]: [string, any], j) => (
                                                            <td key={j} className="px-5 py-3.5 align-top">
                                                                <TableCell col={col} val={val} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span>Rows per page:</span>
                                            <select
                                                value={pageSize}
                                                onChange={e => setPageSize(Number(e.target.value))}
                                                className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                            >
                                                {[10, 25, 50, 100].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <span className="text-slate-400">
                                                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} of {data.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                                className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors text-xs font-bold"
                                            >«</button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors text-sm"
                                            >Prev</button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                                const page = start + i;
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                            page === currentPage
                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                : 'text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                    >{page}</button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors text-sm"
                                            >Next</button>
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors text-xs font-bold"
                                            >»</button>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </>
            )}

            {/* Empty state before generation */}
            {!generated && !loading && (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-16 text-center">
                    <BarChart2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600">Select a report type and date range</h3>
                    <p className="text-slate-400 text-sm mt-1">Click <strong>Generate Report</strong> to load and visualize data</p>
                </div>
            )}
        </DashboardLayout>
    );
}
