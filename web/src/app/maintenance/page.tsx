'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    History,
    Search,
    Filter,
    Wrench,
    Calendar,
    User,
    ExternalLink,
    X,
    Activity,
    MapPin,
    Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Pagination from '@/components/Pagination';

export default function MaintenancePage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [showDeviceModal, setShowDeviceModal] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        fetchLogs();
    }, [currentPage]);

    async function fetchLogs() {
        try {
            setLoading(true);

            // 1. Get Count
            const { count } = await supabase.from('maintenance_logs').select('*', { count: 'exact', head: true });
            setTotalItems(count || 0);

            // 2. Get Data
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error } = await supabase
                .from('maintenance_logs')
                .select(`
          *,
          devices (
            id,
            barcode,
            brand,
            model,
            serial_number,
            status,
            deployment_status,
            physical_condition,
            device_categories (
              name
            ),
            hospitals (
              name
            ),
            desks (
              name
            ),
            offices (
                name
            )
          )
        `)
                .range(from, to)
                .order('performed_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.devices?.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Maintenance History</h1>
                    <p className="text-slate-500">Track device repairs and service logs</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors"
                >
                    Refresh Data
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-bottom border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by barcode or description..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white bg-slate-50 transition-all">
                        <Filter size={18} />
                        Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Device</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parts Replaced</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No maintenance records found</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                {format(new Date(log.performed_at), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div
                                                onClick={() => { setSelectedDevice(log.devices); setShowDeviceModal(true); }}
                                                className="flex flex-col cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {log.devices?.brand} {log.devices?.model}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {log.devices?.barcode}
                                                    </span>
                                                    {log.devices?.device_categories?.name && (
                                                        <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                            {log.devices.device_categories.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-700">
                                                {log.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {log.parts_replaced ? log.parts_replaced.split(',').map((part: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold uppercase border border-orange-100">
                                                        {part.trim()}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-slate-400">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                                    IT
                                                </div>
                                                Officer
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalItems / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={totalItems}
                />
            )}

            {/* Pagination */}
            {totalItems > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalItems / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={totalItems}
                />
            )}

            {/* Device Details Modal */}
            {
                showDeviceModal && selectedDevice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeviceModal(false)} />
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        {selectedDevice.brand} {selectedDevice.model}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedDevice.barcode}</p>
                                </div>
                                <button type="button" onClick={() => setShowDeviceModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto">
                                {/* Key Stats */}
                                <div className="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
                                    <div className="bg-white p-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${selectedDevice.deployment_status === 'Deployed' ? 'bg-blue-50 text-blue-700' :
                                            selectedDevice.deployment_status === 'Archived' ? 'bg-amber-50 text-amber-700' :
                                                'bg-emerald-50 text-emerald-700'
                                            }`}>
                                            {selectedDevice.deployment_status || 'Available'}
                                        </span>
                                    </div>
                                    <div className="bg-white p-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Condition</div>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${selectedDevice.physical_condition === 'Good' ? 'bg-emerald-50 text-emerald-700' :
                                            'bg-rose-50 text-rose-700'
                                            }`}>
                                            {selectedDevice.physical_condition || 'Good'}
                                        </span>
                                    </div>
                                    <div className="bg-white p-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Category</div>
                                        <div className="font-semibold text-slate-700">{selectedDevice.device_categories?.name || 'Uncategorized'}</div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="p-6 grid grid-cols-2 gap-6 border-b border-slate-100">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Hash size={12} /> Serial Number
                                            </div>
                                            <div className="font-mono text-sm text-slate-700 break-all">{selectedDevice.serial_number || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <MapPin size={12} /> Location
                                            </div>
                                            <div className="text-sm text-slate-700">
                                                <div className="font-semibold">{selectedDevice.hospitals?.name || 'No Facility'}</div>
                                                {selectedDevice.desks?.name && <div className="text-slate-500 mt-0.5">{selectedDevice.desks.name} ({selectedDevice.offices?.name})</div>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Asset Tag</div>
                                            <div className="font-mono text-sm text-slate-700 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200">
                                                {selectedDevice.barcode}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Maintenance History */}
                                <div className="p-6 bg-slate-50/50">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <History size={16} className="text-slate-400" />
                                        Recent Maintenance
                                    </h4>
                                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                        {logs.filter(l => l.devices?.id === selectedDevice.id).slice(0, 5).length > 0 ? (
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                                                        <th className="px-4 py-2">Date</th>
                                                        <th className="px-4 py-2">Activity</th>
                                                        <th className="px-4 py-2">Performer</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {logs.filter(l => l.devices?.id === selectedDevice.id).slice(0, 5).map(log => (
                                                        <tr key={log.id} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2 whitespace-nowrap text-slate-600 font-mono text-xs">
                                                                {format(new Date(log.performed_at), 'MMM dd, yyyy')}
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-700">
                                                                {log.description}
                                                                {log.parts_replaced && (
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {log.parts_replaced.split(',').map((part: string, i: number) => (
                                                                            <span key={i} className="px-1 py-px rounded bg-orange-50 text-orange-600 text-[9px] border border-orange-100">
                                                                                {part.trim()}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-500 text-xs">
                                                                {log.performer_name || 'Staff'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-4 text-center text-slate-500 text-sm">No maintenance history recorded</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
                                <button
                                    onClick={() => setShowDeviceModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </DashboardLayout >
    );
}
