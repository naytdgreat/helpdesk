'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    AlertCircle,
    MapPin,
    Plus,
    CheckCircle,
    Clock,
    Monitor,
    User,
    Loader2,
    X,
    Edit2,
    Trash2,
    FileText,
    RefreshCw,
    UserPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Pagination from '@/components/Pagination';
import { useSearchParams } from 'next/navigation';

function ComplaintsPageContent() {
    const searchParams = useSearchParams();
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [complaintToDelete, setComplaintToDelete] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [desks, setDesks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form data for editing complaint details
    const [editComplaintData, setEditComplaintData] = useState({
        reporter_name: '',
        description: '',
        category: 'Hardware' as any,
        device_id: '',
        desk_id: ''
    });

    // Form data for updating status
    const [statusFormData, setStatusFormData] = useState({
        status: '',
        notes: ''
    });

    // Form data for assigning user
    const [assignFormData, setAssignFormData] = useState({
        assigned_to_id: ''
    });

    const [formData, setFormData] = useState({
        reporter_name: '',
        description: '',
        category: 'Hardware' as any,
        device_id: '',
        desk_id: '',
        status: 'Open' as any
    });

    useEffect(() => {
        fetchComplaints();
        fetchSelectionData();
        fetchUsers();
    }, [activeTab, currentPage]);

    // Deep Linking Handler
    useEffect(() => {
        const complaintId = searchParams.get('id');
        if (complaintId && complaints.length > 0) {
            const targetComplaint = complaints.find(c => c.id === complaintId);
            if (targetComplaint) {
                handleUpdateStatus(targetComplaint);
            }
        }
    }, [searchParams, complaints]);

    async function fetchComplaints() {
        try {
            setLoading(true);

            // 1. Get Count
            const { count } = await supabase.from('complaints').select('*', { count: 'exact', head: true });
            setTotalItems(count || 0);

            // 2. Get Data
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error } = await supabase
                .from('complaints')
                .select(`
          *,
          devices (barcode, brand, model),
          desks (name)
        `)
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComplaints(data || []);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSelectionData() {
        const [devRes, dskRes] = await Promise.all([
            supabase.from('devices').select('id, barcode, brand, model').order('barcode'),
            supabase.from('desks').select('id, name').order('name')
        ]);
        setDevices(devRes.data || []);
        setDesks(dskRes.data || []);
    }

    async function fetchUsers() {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: profile } = (await supabase
                .from('profiles')
                .select('hospital_id')
                .eq('id', user.id)
                .single()) as any;

            if (!profile?.hospital_id) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('hospital_id', profile.hospital_id)
                .in('role', ['ADMIN', 'IT_OFFICER']);

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    // Handler for editing complaint details
    async function handleEditComplaint(complaint: any) {
        setSelectedComplaint(complaint);
        setEditComplaintData({
            reporter_name: complaint.reporter_name,
            description: complaint.description,
            category: complaint.category,
            device_id: complaint.device_id || '',
            desk_id: complaint.desk_id || ''
        });
        setShowEditModal(true);
    }

    // Handler for updating complaint status
    async function handleUpdateStatus(complaint: any) {
        setSelectedComplaint(complaint);
        setStatusFormData({
            status: complaint.status,
            notes: complaint.notes || ''
        });
        setShowStatusModal(true);
    }

    // Handler for assigning user
    async function handleAssignUser(complaint: any) {
        setSelectedComplaint(complaint);
        setAssignFormData({
            assigned_to_id: complaint.assigned_to_id || ''
        });
        setShowAssignModal(true);
    }

    // Submit edited complaint details
    async function submitEditComplaint(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedComplaint) return;

        try {
            setIsSubmitting(true);
            const { error } = await (supabase
                .from('complaints') as any)
                .update({
                    reporter_name: editComplaintData.reporter_name,
                    description: editComplaintData.description,
                    category: editComplaintData.category,
                    device_id: editComplaintData.device_id || null,
                    desk_id: editComplaintData.desk_id || null
                })
                .eq('id', selectedComplaint.id);

            if (error) throw error;

            setShowEditModal(false);
            setSelectedComplaint(null);
            fetchComplaints();
        } catch (error) {
            console.error('Error updating complaint:', error);
            alert('Failed to update complaint.');
        } finally {
            setIsSubmitting(false);
        }
    }

    // Submit status update
    async function submitStatusUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedComplaint) return;

        try {
            setIsSubmitting(true);
            const { error } = await (supabase
                .from('complaints') as any)
                .update({
                    status: statusFormData.status,
                    notes: statusFormData.notes || null
                })
                .eq('id', selectedComplaint.id);

            if (error) throw error;

            setShowStatusModal(false);
            setSelectedComplaint(null);
            fetchComplaints();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status.');
        } finally {
            setIsSubmitting(false);
        }
    }

    // Submit user assignment
    async function submitUserAssignment(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedComplaint) return;

        try {
            setIsSubmitting(true);
            const { error } = await (supabase
                .from('complaints') as any)
                .update({
                    assigned_to_id: assignFormData.assigned_to_id || null
                })
                .eq('id', selectedComplaint.id);

            if (error) throw error;

            // Insert notification record
            if (assignFormData.assigned_to_id) {
                await supabase.from('notifications').insert({
                    user_id: assignFormData.assigned_to_id,
                    title: 'New Complaint Assigned',
                    message: `You have been assigned to handle a complaint regarding ${selectedComplaint.description.substring(0, Math.min(selectedComplaint.description.length, 30))}...`,
                    link: `/complaints?id=${selectedComplaint.id}`
                });
            }

            setShowAssignModal(false);
            setSelectedComplaint(null);
            fetchComplaints();
        } catch (error) {
            console.error('Error assigning user:', error);
            alert('Failed to assign user.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!complaintToDelete) return;

        try {
            setIsSubmitting(true);
            const { error } = await supabase
                .from('complaints')
                .delete()
                .eq('id', complaintToDelete.id);

            if (error) throw error;

            setShowDeleteModal(false);
            setComplaintToDelete(null);
            fetchComplaints();
        } catch (error) {
            console.error('Error deleting complaint:', error);
            alert('Failed to delete complaint.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.reporter_name || !formData.description) return;

        try {
            setIsSubmitting(true);
            const { error } = await (supabase
                .from('complaints') as any)
                .insert([{
                    reporter_name: formData.reporter_name,
                    description: formData.description,
                    category: formData.category,
                    device_id: formData.device_id || null,
                    desk_id: formData.desk_id || null,
                    status: 'Open'
                }]);

            if (error) throw error;

            setShowModal(false);
            setFormData({ reporter_name: '', description: '', category: 'Hardware', device_id: '', desk_id: '', status: 'Open' });
            fetchComplaints();
        } catch (error) {
            console.error('Error creating complaint:', error);
            alert('Failed to log complaint.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'open': return 'bg-red-50 text-red-700 border-red-100';
            case 'in progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'resolved': return 'bg-green-50 text-green-700 border-green-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const filteredComplaints = complaints.filter(c => {
        if (activeTab === 'open') return c.status.toLowerCase() === 'open';
        if (activeTab === 'resolved') return c.status.toLowerCase() === 'resolved';
        return true;
    });

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">End-User Complaints</h1>
                    <p className="text-slate-500">Log and track issues reported by facility staff</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                >
                    <Plus size={20} />
                    New Complaint
                </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200">
                {['All', 'Open', 'Resolved'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === tab.toLowerCase()
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                        {activeTab === tab.toLowerCase() && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                        <span>Loading complaints...</span>
                    </div>
                ) : filteredComplaints.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
                        <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No complaints found</h3>
                        <p className="text-slate-500">Looks like everything is running smoothly!</p>
                    </div>
                ) : (
                    filteredComplaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <div className={`p-2 rounded-lg ${getStatusColor(complaint.status)} border`}>
                                        {complaint.status.toLowerCase() === 'resolved' ? <CheckCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{complaint.reporter_name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span>{format(new Date(complaint.created_at), 'MMM dd, hh:mm a')}</span>
                                            <span>•</span>
                                            <span className="font-semibold uppercase text-blue-600/80">{complaint.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(complaint.status)}`}>
                                        {complaint.status}
                                    </span>
                                    <button
                                        onClick={() => handleEditComplaint(complaint)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"
                                        title="Edit Complaint"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(complaint)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded transition-colors"
                                        title="Update Status"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleAssignUser(complaint)}
                                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-1.5 rounded transition-colors"
                                        title="Assign User"
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setComplaintToDelete(complaint); setShowDeleteModal(true); }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                {complaint.description}
                            </p>

                            {complaint.notes && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <FileText size={14} className="text-amber-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-900 mb-1">Notes:</p>
                                            <p className="text-xs text-amber-800">{complaint.notes}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                                {complaint.devices && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                        <Monitor size={14} className="text-slate-400" />
                                        {complaint.devices.brand} {complaint.devices.model} ({complaint.devices.barcode})
                                    </div>
                                )}
                                {complaint.desks && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                        <MapPin size={14} className="text-slate-400" />
                                        {complaint.desks.name}
                                    </div>
                                )}
                                {complaint.assigned_to_id && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 ml-auto">
                                        <User size={14} className="text-slate-400" />
                                        Assigned: <span className="text-slate-900">
                                            {users.find(u => u.id === complaint.assigned_to_id)?.name || complaint.assigned_to_id}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
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

            {/* Create Complaint Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">Log New Complaint</h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Reporter Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Staff Name"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={formData.reporter_name}
                                            onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Category</label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        >
                                            <option value="Hardware">Hardware</option>
                                            <option value="Software">Software</option>
                                            <option value="Network">Network</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Description of Issue</label>
                                    <textarea
                                        required
                                        placeholder="Describe the problem in detail..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 h-24 resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            <Monitor size={14} className="text-slate-400" />
                                            Link to Device (Optional)
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                                            value={formData.device_id}
                                            onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                                        >
                                            <option value="">No Device Linked</option>
                                            {devices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.barcode})</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            Link to Desk (Optional)
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                                            value={formData.desk_id}
                                            onChange={(e) => setFormData({ ...formData, desk_id: e.target.value })}
                                        >
                                            <option value="">No Desk Linked</option>
                                            {desks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
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
                                    Log Complaint
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Edit Complaint Modal */}
            {
                showEditModal && selectedComplaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                        <form onSubmit={submitEditComplaint} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">Edit Complaint Details</h3>
                                <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Reporter Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={editComplaintData.reporter_name}
                                        onChange={(e) => setEditComplaintData({ ...editComplaintData, reporter_name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Category</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={editComplaintData.category}
                                        onChange={(e) => setEditComplaintData({ ...editComplaintData, category: e.target.value as any })}
                                    >
                                        <option value="Hardware">Hardware</option>
                                        <option value="Software">Software</option>
                                        <option value="Network">Network</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Description</label>
                                    <textarea
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 h-24 resize-none"
                                        value={editComplaintData.description}
                                        onChange={(e) => setEditComplaintData({ ...editComplaintData, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Device (Optional)</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={editComplaintData.device_id}
                                        onChange={(e) => setEditComplaintData({ ...editComplaintData, device_id: e.target.value })}
                                    >
                                        <option value="">No Device Linked</option>
                                        {devices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.barcode})</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Desk (Optional)</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={editComplaintData.desk_id}
                                        onChange={(e) => setEditComplaintData({ ...editComplaintData, desk_id: e.target.value })}
                                    >
                                        <option value="">No Desk Linked</option>
                                        {desks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Update Status Modal */}
            {
                showStatusModal && selectedComplaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
                        <form onSubmit={submitStatusUpdate} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">Update Complaint Status</h3>
                                <button type="button" onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={statusFormData.status}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Escalated">Escalated</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
                                    <textarea
                                        placeholder="Add any notes or comments..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 h-24 resize-none"
                                        value={statusFormData.notes}
                                        onChange={(e) => setStatusFormData({ ...statusFormData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowStatusModal(false)}
                                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Assign User Modal */}
            {
                showAssignModal && selectedComplaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
                        <form onSubmit={submitUserAssignment} className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">Assign User</h3>
                                <button type="button" onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Assign To</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={assignFormData.assigned_to_id}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, assigned_to_id: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name || u.id}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && complaintToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                                <h3 className="text-xl font-bold text-red-900">Delete Complaint</h3>
                                <button type="button" onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <p className="text-slate-700">
                                    Are you sure you want to delete this complaint from <span className="font-bold">{complaintToDelete.reporter_name}</span>?
                                </p>
                                <p className="text-sm text-slate-500 mt-2">This action cannot be undone.</p>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </DashboardLayout>
    );
}

export default function ComplaintsPage() {
    return (
        <React.Suspense fallback={
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span>Loading complaints...</span>
            </div>
        }>
            <ComplaintsPageContent />
        </React.Suspense>
    );
}
