'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
    Search,
    MapPin,
    Plus,
    MoreHorizontal,
    Building2,
    Users,
    Monitor,
    Loader2,
    X,
    Pencil,
    Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Pagination from '@/components/Pagination';

export default function DesksPage() {
    const { profile } = useAuth();
    const [desks, setDesks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [wings, setWings] = useState<any[]>([]);
    const [offices, setOffices] = useState<any[]>([]);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDeskId, setDeletingDeskId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [formData, setFormData] = useState({
        hospital_id: '',
        wing_id: '',
        office_id: '',
        name: '',
        assigned_to_user: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingDeskId, setEditingDeskId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Device List Modal State
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [activeDeskForDevices, setActiveDeskForDevices] = useState<any>(null);
    const [deskDevices, setDeskDevices] = useState<any[]>([]);

    const userRole = profile?.role || 'IT_OFFICER';

    useEffect(() => {
        if (profile) {
            console.log('DesksPage: Profile loaded:', profile);
            fetchDesks();
            fetchInitialData();
        }
    }, [profile, currentPage]);

    async function fetchDesks() {
        try {
            setLoading(true);

            // 1. Get Count
            const { count } = await supabase.from('desks').select('*', { count: 'exact', head: true });
            setTotalItems(count || 0);

            // 2. Get Data
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error } = await supabase
                .from('desks')
                .select(`
                    *,
                    offices (
                        id,
                        name,
                        wing_id,
                        wings (
                            id,
                            name,
                            hospital_id,
                            hospitals (id, name)
                        )
                    ),
                    devices (id)
                `)
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDesks(data || []);
        } catch (error) {
            console.error('Error fetching desks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchInitialData() {
        if (!profile) return;

        // Fetch hospitals for privileged users
        if (['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            const { data } = await supabase.from('hospitals').select('*').order('name');
            setHospitals(data || []);
        }

        // Always fetch wings if user has an assigned hospital
        const hid = profile.hospital_id;
        if (hid) {
            setFormData(prev => ({ ...prev, hospital_id: hid }));
            fetchWings(hid);
        }
    }

    async function fetchWings(hospitalId: string, keepSelection = false) {
        if (!hospitalId) {
            setWings([]);
            return;
        }
        try {
            const { data, error } = await supabase.from('wings').select('*').eq('hospital_id', hospitalId).order('name');
            if (error) throw error;
            setWings(data || []);

            if (!keepSelection) {
                setOffices([]);
                setFormData(prev => ({ ...prev, wing_id: '', office_id: '' }));
            }
        } catch (error) {
            console.error('Error fetching wings:', error);
            alert('Failed to load sections for the selected facility.');
        }
    }

    async function fetchOffices(wingId: string, keepSelection = false) {
        if (!wingId) {
            setOffices([]);
            return;
        }
        try {
            const { data, error } = await supabase.from('offices').select('*').eq('wing_id', wingId).order('name');
            if (error) throw error;
            setOffices(data || []);

            if (!keepSelection) {
                setFormData(prev => ({ ...prev, office_id: '' }));
            }
        } catch (error) {
            console.error('Error fetching offices:', error);
            alert('Failed to load offices for the selected section.');
        }
    }

    const openModal = () => {
        setIsEditing(false);
        setEditingDeskId(null);
        setFormData({
            hospital_id: profile?.hospital_id || '',
            wing_id: '',
            office_id: '',
            name: '',
            assigned_to_user: ''
        });
        setShowModal(true);
        fetchInitialData();
    };

    const openEditModal = (desk: any) => {
        setIsEditing(true);
        setEditingDeskId(desk.id);

        // Find hierarchy ancestors
        // Note: We now fetch offices(wing_id, wings(hospital_id))
        // The query is: offices -> wings -> hospitals
        const hospitalId = desk.offices?.wings?.hospitals?.id || desk.offices?.wings?.hospital_id || '';
        const wingId = desk.offices?.wing_id || '';

        setFormData({
            hospital_id: hospitalId,
            wing_id: wingId,
            office_id: desk.office_id,
            name: desk.name,
            assigned_to_user: desk.assigned_to_user || ''
        });

        fetchWings(hospitalId, true);
        fetchOffices(wingId, true);
        setShowModal(true);
    };

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.office_id || !formData.name) {
            alert('Please fill in required fields.');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                office_id: formData.office_id,
                name: formData.name,
                assigned_to_user: formData.assigned_to_user || null
            };

            const { error } = isEditing
                ? await (supabase.from('desks').update(payload).eq('id', editingDeskId) as any)
                : await (supabase.from('desks').insert([payload]) as any);

            if (error) throw error;

            setShowModal(false);
            fetchDesks();
        } catch (error: any) {
            alert(`Failed to save desk: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteDesk() {
        if (!deletingDeskId) return;
        try {
            setIsDeleting(true);

            // 1. First, unassign and reset all devices attached to this desk
            const { error: deviceUpdateError } = await (supabase
                .from('devices')
                .update({
                    status: 'Available',
                    location_status: 'Central Store',
                    desk_id: null,
                    office_id: null
                } as any)
                .eq('desk_id', deletingDeskId) as any);

            if (deviceUpdateError) {
                console.error('Error unassigning devices:', deviceUpdateError);
                throw new Error(`Failed to unassign devices: ${deviceUpdateError.message}`);
            }

            // 2. Now delete the desk
            const { error } = await supabase.from('desks').delete().eq('id', deletingDeskId);
            if (error) throw error;

            setShowDeleteModal(false);
            setDeletingDeskId(null);
            fetchDesks();
        } catch (error: any) {
            alert(`Failed: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    }

    const openDeleteModal = (id: string) => {
        setDeletingDeskId(id);
        setShowDeleteModal(true);
    };

    const openDeviceList = async (desk: any) => {
        setActiveDeskForDevices(desk);
        setShowDeviceModal(true);
        setDeskDevices([]);
        try {
            const { data, error } = await supabase
                .from('devices')
                .select('id, barcode, brand, model, serial_number, status, physical_condition, device_categories(name)')
                .eq('desk_id', desk.id);

            if (error) throw error;
            setDeskDevices(data || []);
        } catch (error) {
            console.error('Error fetching desk devices:', error);
            alert('Failed to load devices.');
        }
    };

    const filteredDesks = desks.filter(desk =>
        (desk.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (desk.assigned_to_user?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (desk.offices?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Facility Desks</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500">Manage deployment locations and user assignments</p>
                        {profile && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200 uppercase">
                                Role: {profile.role} | Facility: {profile.hospital_id || 'None'}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={openModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    New Desk
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-bottom border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search desks, users, or offices..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Desk Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Devices</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-blue-500" size={24} />
                                            <span>Loading desks...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDesks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No desks found</td>
                                </tr>
                            ) : (
                                filteredDesks.map((desk) => (
                                    <tr key={desk.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <Monitor size={16} />
                                                </div>
                                                <span className="font-medium text-slate-900">{desk.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-sm text-slate-900 font-medium">
                                                    <Building2 size={14} className="text-slate-400" />
                                                    {desk.offices?.name}
                                                </div>
                                                <div className="text-xs text-slate-500 ml-5">
                                                    {desk.offices?.wings?.hospitals?.name} • {desk.offices?.wings?.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Users size={16} className="text-slate-400" />
                                                {desk.assigned_to_user || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => openDeviceList(desk)}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors"
                                            >
                                                {desk.devices?.length || 0} Devices
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(desk)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(desk.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteDesk}
                title="Delete Desk"
                message="Are you sure you want to delete this desk? This will remove the location and any device assignments associated with it."
                isDeleting={isDeleting}
            />

            {/* Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Desk' : 'Add New Desk'}</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {profile?.role === 'SUPER_ADMIN' ? (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Facility</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                                        value={formData.hospital_id}
                                        onChange={(e) => {
                                            const hid = e.target.value;
                                            console.log('Selected Facility ID:', hid);
                                            setFormData({ ...formData, hospital_id: hid });
                                            fetchWings(hid);
                                        }}
                                    >
                                        <option value="">Select Facility</option>
                                        {hospitals.length === 0 ? (
                                            <option disabled>No facilities found</option>
                                        ) : (
                                            hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)
                                        )}
                                    </select>
                                    {hospitals.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">No facilities found. Add one in the Facility Hierarchy page first.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                                    <Building2 className="text-blue-500" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-blue-600/60 uppercase">Managing Facility</p>
                                        <p className="text-sm font-bold text-blue-900">
                                            {profile?.hospitals?.name || profile?.hospital_id || 'Assigned Facility'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Section</label>
                                    <select
                                        required
                                        disabled={!formData.hospital_id}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 disabled:bg-slate-50"
                                        value={formData.wing_id}
                                        onChange={(e) => {
                                            setFormData({ ...formData, wing_id: e.target.value });
                                            fetchOffices(e.target.value);
                                        }}
                                    >
                                        <option value="">Select Section</option>
                                        {wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Office</label>
                                    <select
                                        required
                                        disabled={!formData.wing_id}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 disabled:bg-slate-50"
                                        value={formData.office_id}
                                        onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                                    >
                                        <option value="">Select Office</option>
                                        {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Desk Name/ID</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Desk 01, Reception-01"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Assigned To (User Name)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Dr. John Doe"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                    value={formData.assigned_to_user}
                                    onChange={(e) => setFormData({ ...formData, assigned_to_user: e.target.value })}
                                />
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
                                {isEditing ? 'Save Changes' : 'Create Desk'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Device List Modal */}
            {showDeviceModal && activeDeskForDevices && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeviceModal(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Attached Devices</h3>
                                <p className="text-sm text-slate-500">Desk: {activeDeskForDevices.name}</p>
                            </div>
                            <button onClick={() => setShowDeviceModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0">
                            {deskDevices.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Monitor size={48} className="mx-auto text-slate-300 mb-3" />
                                    <p>No devices attached to this desk.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                            <th className="px-6 py-3">Asset Tag</th>
                                            <th className="px-6 py-3">Device</th>
                                            <th className="px-6 py-3">Serial</th>
                                            <th className="px-6 py-3">Condition</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {deskDevices.map((device: any) => (
                                            <tr key={device.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 font-mono text-xs text-blue-600 font-semibold">{device.barcode}</td>
                                                <td className="px-6 py-3 text-sm text-slate-700">
                                                    <span className="text-slate-500 mr-1">{device.device_categories?.name} -</span>
                                                    <span className="font-semibold">{device.brand}</span> {device.model}
                                                </td>
                                                <td className="px-6 py-3 text-xs text-slate-500 font-mono">{device.serial_number || '-'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${device.status === 'Good' ? 'bg-emerald-50 text-emerald-700' :
                                                        device.status === 'Faulty' ? 'bg-rose-50 text-rose-700' :
                                                            device.status === 'In Repair' ? 'bg-amber-50 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {device.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button
                                onClick={() => setShowDeviceModal(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
