'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Search,
    Plus,
    CheckCircle2,
    XCircle,
    ShoppingBag,
    Loader2,
    X,
    Trash2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Pagination from '@/components/Pagination';

export default function RequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Form State
    const [reporterName, setReporterName] = useState('');
    const [requestItems, setRequestItems] = useState<{ item_type: string; quantity: number }[]>([
        { item_type: '', quantity: 1 }
    ]);

    useEffect(() => {
        fetchRequests();
    }, [currentPage]);

    async function fetchRequests() {
        try {
            setLoading(true);

            // 1. Get Count
            const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true });
            setTotalItems(count || 0);

            // 2. Get Data
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error } = await supabase
                .from('requests')
                .select(`
                    *,
                    request_items (
                        id,
                        item_type,
                        quantity,
                        fulfilled_quantity,
                        status
                    )
                `)
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Integrity Check: Auto-fix requests that should be 'Fulfilled'
            const pendingToFix = (data || []).filter(r =>
                r.status === 'Pending' &&
                r.request_items?.length > 0 &&
                r.request_items.every((i: any) => i.status === 'Fulfilled')
            );

            if (pendingToFix.length > 0) {
                console.log(`[Integrity] Fixing ${pendingToFix.length} anomalous requests`);
                await Promise.all(pendingToFix.map(r =>
                    supabase.from('requests').update({ status: 'Fulfilled' } as any).eq('id', r.id)
                ));
                // Refetch to show clean data
                const { data: cleanData } = await supabase
                    .from('requests')
                    .select('*, request_items(*)')
                    .range(from, to)
                    .order('created_at', { ascending: false });
                setRequests(cleanData || []);
            } else {
                setRequests(data || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    }

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedRequestIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedRequestIds(newSet);
    };

    // Form Handlers
    const addItem = () => {
        setRequestItems([...requestItems, { item_type: '', quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (requestItems.length === 1) return;
        const newItems = [...requestItems];
        newItems.splice(index, 1);
        setRequestItems(newItems);
    };

    const updateItem = (index: number, field: 'item_type' | 'quantity', value: string | number) => {
        const newItems = [...requestItems];
        // @ts-ignore
        newItems[index][field] = value;
        setRequestItems(newItems);
    };

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!reporterName || requestItems.some(i => !i.item_type)) return;

        try {
            setIsSubmitting(true);

            // 1. Create Request
            const { data: requestData, error: requestError } = await supabase
                .from('requests')
                .insert([{ reporter_name: reporterName, status: 'Pending' }])
                .select()
                .single();

            if (requestError) throw requestError;

            // 2. Create Request Items
            const itemsToInsert = requestItems.map(item => ({
                request_id: requestData.id,
                item_type: item.item_type,
                quantity: item.quantity,
                status: 'Pending'
            }));

            const { error: itemsError } = await supabase
                .from('request_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            setShowModal(false);
            setReporterName('');
            setRequestItems([{ item_type: '', quantity: 1 }]);
            fetchRequests();
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Failed to log request.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'fulfilled': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            case 'partially fulfilled': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-orange-100 text-orange-800 border-orange-200';
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Inventory Requests</h1>
                    <p className="text-slate-500">Manage item requests from facility sections and offices</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Log New Request
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-bottom border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by reporter..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10"></th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reporter</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items Summary</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-blue-500" size={24} />
                                            <span>Loading requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No requests found</td>
                                </tr>
                            ) : (
                                requests.map((request) => (
                                    <React.Fragment key={request.id}>
                                        <tr
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRequestIds.has(request.id) ? 'bg-slate-50' : ''}`}
                                            onClick={() => toggleExpand(request.id)}
                                        >
                                            <td className="px-6 py-4 text-slate-400">
                                                {expandedRequestIds.has(request.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 font-mono">
                                                    {format(new Date(request.created_at), 'MMM dd, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{request.reporter_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <ShoppingBag size={14} className="text-slate-400" />
                                                    {request.request_items?.length || 0} items requested
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedRequestIds.has(request.id) && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="px-6 py-4 border-t border-slate-100 shadow-inner">
                                                    <div className="ml-10">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Requested Items</h4>
                                                        <div className="space-y-2">
                                                            {request.request_items?.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                                            {item.quantity}x
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-slate-800">{item.item_type}</div>
                                                                            <div className="text-xs text-slate-500">
                                                                                Fulfilled: {item.fulfilled_quantity || 0} / {item.quantity}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusBadge(item.status)}`}>
                                                                            {item.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Log Item Request</h3>
                                <p className="text-sm text-slate-500">Add multiple items to this request</p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Reporter / Staff Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Who is requesting these items?"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-slate-700">Items List</label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus size={14} /> Add Another Item
                                    </button>
                                </div>

                                {requestItems.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex-1 space-y-1">
                                            <input
                                                required
                                                type="text"
                                                placeholder="Item Type (e.g. Monitor)"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                value={item.item_type}
                                                onChange={(e) => updateItem(index, 'item_type', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-[1px]"
                                            disabled={requestItems.length === 1}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 disabled:bg-slate-400"
                            >
                                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                Log Request
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
}
