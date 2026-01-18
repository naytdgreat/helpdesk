'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    ArrowUpDown,
    Laptop,
    MousePointer2,
    Keyboard,
    Wifi,
    MoreVertical,
    Monitor,
    Loader2,
    Building2,
    X,
    Pencil,
    Trash2,
    Send,
    Archive,
    RotateCcw,
    Wrench,
    History,
    ShoppingBag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Pagination from '@/components/Pagination';

const generateBarcode = () => {
    const prefix = 'ICT';
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    const randomChars = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${prefix}-${dateStr}-${randomChars}`;
};

const CategoryIcon = ({ cat }: { cat: string }) => {
    const c = cat.toLowerCase();
    if (c.includes('cpu')) return <Laptop className="text-blue-500" size={18} />;
    if (c.includes('mouse')) return <MousePointer2 className="text-purple-500" size={18} />;
    if (c.includes('keyboard')) return <Keyboard className="text-orange-500" size={18} />;
    if (c.includes('router') || c.includes('wifi')) return <Wifi className="text-emerald-500" size={18} />;
    if (c.includes('monitor')) return <Monitor className="text-blue-400" size={18} />;
    return <Plus className="text-slate-400" size={18} />;
};

export default function Inventory() {
    const { profile } = useAuth();
    const [devices, setDevices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Advanced Filters
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterHospitalId, setFilterHospitalId] = useState('');


    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Modal Form State
    const [formData, setFormData] = useState({
        hospital_id: '',
        barcode: '',
        brand: '',
        model: '',
        category_id: '',
        serial_number: '',
        status: 'Good' as any,
        physical_condition: 'Good' as any,
        deployment_status: 'Available' as any,
        has_network_info: false,
        ip_address: '',
        mac_address: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Lifecycle Modals
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDeploymentHistoryModal, setShowDeploymentHistoryModal] = useState(false);
    const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
    const [deploymentLogs, setDeploymentLogs] = useState<any[]>([]);
    const [activeDevice, setActiveDevice] = useState<any>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const [maintenanceForm, setMaintenanceForm] = useState({
        description: '',
        parts_replaced: '',
        performer_type: 'Staff' as 'Staff' | 'Vendor',
        performer_name: '',
        update_condition: 'Good' as any
    });

    const [updateCondition, setUpdateCondition] = useState('Good');
    const [pendingRequestItems, setPendingRequestItems] = useState<any[]>([]);

    const userRole = profile?.role || 'IT_OFFICER';

    useEffect(() => {
        if (profile) {
            fetchData();
        }
    }, [profile, currentPage]);

    async function fetchData() {
        if (!profile) return;
        setLoading(true);
        try {
            // 1. Fetch Categories (Critical for the dropdown)
            const { data: catData, error: catError } = await supabase
                .from('device_categories')
                .select('*')
                .order('name');

            if (catError) console.error('Inventory Categories Error:', catError);
            if (catData) setCategories(catData);

            // 2. Fetch Hospitals
            let hospQuery = supabase.from('hospitals').select('*').order('name');
            if (!['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
                if (profile.hospital_id) {
                    hospQuery = supabase.from('hospitals').select('*').eq('id', profile.hospital_id);
                } else {
                    hospQuery = (supabase.from('hospitals').select('*') as any).limit(0);
                }
            }
            const { data: hospData, error: hospError } = await hospQuery;
            if (hospError) console.error('Inventory Hospitals Error:', hospError);
            if (hospData) setHospitals(hospData);

            // 3. Fetch Devices
            // First get count
            const { count } = await supabase
                .from('devices')
                .select('*', { count: 'exact', head: true });

            setTotalItems(count || 0);

            // Calculate range
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data: devData, error: devError } = await supabase
                .from('devices')
                .select('*, device_categories(name), desks(name), offices(name), hospitals(name)')
                .range(from, to)
                .order('created_at', { ascending: false });

            if (devError) console.error('Inventory Devices Error:', devError);
            if (devData) setDevices(devData);

            // Set default hospital for IT Officers
            if (profile.role === 'IT_OFFICER' && profile.hospital_id) {
                setFormData(prev => ({ ...prev, hospital_id: profile.hospital_id }));
            }
        } catch (error) {
            console.error('Unexpected error in fetchData:', error);
        } finally {
            setLoading(false);
        }
    }

    async function logDeployment(deviceId: string, type: string, status: string, options: {
        hospital_id?: string,
        office_id?: string | null,
        desk_id?: string | null,
        notes?: string
    }) {
        try {
            await (supabase.from('deployment_logs').insert([{
                device_id: deviceId,
                type,
                status,
                hospital_id: options.hospital_id || formData.hospital_id,
                office_id: options.office_id || null,
                desk_id: options.desk_id || null,
                performer_id: profile?.id,
                notes: options.notes || null
            } as any]) as any);
        } catch (err) {
            console.error('History logging failed:', err);
        }
    }

    async function handleSaveDevice(e: React.FormEvent) {
        e.preventDefault();
        // For new devices, we'll generate the barcode if missing
        const finalBarcode = isEditing ? formData.barcode : (formData.barcode || generateBarcode());

        if (!finalBarcode || !formData.category_id || !formData.hospital_id) return;

        try {
            setIsSubmitting(true);
            const payload = {
                hospital_id: formData.hospital_id,
                barcode: finalBarcode,
                brand: formData.brand,
                model: formData.model,
                category_id: formData.category_id,
                serial_number: formData.serial_number || null,
                status: formData.status,
                physical_condition: formData.status,
                deployment_status: formData.deployment_status,
                // Only save network info if checkbox is checked
                ip_address: formData.has_network_info ? formData.ip_address : null,
                mac_address: formData.has_network_info ? formData.mac_address : null
            };

            const { data, error } = isEditing
                ? await (supabase.from('devices').update(payload as any).eq('id', editingDeviceId).select() as any)
                : await (supabase.from('devices').insert([payload as any]).select() as any);

            if (error) throw error;

            // Log initialization if new
            if (!isEditing && data && data[0]) {
                await logDeployment(data[0].id, 'Initialize', payload.deployment_status, {
                    hospital_id: payload.hospital_id
                });
            }

            setShowAddModal(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving device:', error);
            alert(`Failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteDevice() {
        if (!deletingDeviceId) return;
        try {
            setIsDeleting(true);
            const { error } = await (supabase.from('devices').delete().eq('id', deletingDeviceId) as any);
            if (error) throw error;
            setShowDeleteModal(false);
            setDeletingDeviceId(null);
            fetchData();
        } catch (error: any) {
            alert(`Failed to delete: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    }

    const openDeleteModal = (id: string) => {
        setDeletingDeviceId(id);
        setShowDeleteModal(true);
    };

    const openModal = () => {
        setIsEditing(false);
        setEditingDeviceId(null);
        const newBarcode = generateBarcode();
        setFormData({
            hospital_id: profile?.hospital_id || '',
            barcode: newBarcode,
            brand: '',
            model: '',
            category_id: '',
            serial_number: '',
            status: 'Good',
            physical_condition: 'Good',
            deployment_status: 'Available',
            has_network_info: false,
            ip_address: '',
            mac_address: ''
        });
        setShowAddModal(true);
    };

    const openEditModal = (device: any) => {
        setIsEditing(true);
        setEditingDeviceId(device.id);
        setFormData({
            hospital_id: device.hospital_id || '',
            barcode: device.barcode || '',
            brand: device.brand || '',
            model: device.model || '',
            category_id: device.category_id || '',
            serial_number: device.serial_number || '',
            status: device.physical_condition || 'Good',
            physical_condition: device.physical_condition || 'Good',
            deployment_status: device.deployment_status || 'Available',
            has_network_info: !!(device.ip_address || device.mac_address),
            ip_address: device.ip_address || '',
            mac_address: device.mac_address || ''
        });
        setShowAddModal(true);
    };

    const filteredDevices = devices.filter(d => {
        const matchesSearch = (d.barcode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (d.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (d.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (d.hospitals?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategoryId ? d.category_id === filterCategoryId : true;

        let matchesHospital = true;
        // If user is SuperAdmin and has selected a filter
        if (userRole === 'SUPER_ADMIN' && filterHospitalId) {
            matchesHospital = d.hospital_id === filterHospitalId;
        }

        return matchesSearch && matchesCategory && matchesHospital;
    });

    const [showDeployModal, setShowDeployModal] = useState(false);
    const [deployData, setDeployData] = useState({
        device_id: '',
        hospital_id: '',
        wing_id: '',
        office_id: '',
        desk_id: '',
        request_item_id: ''
    });
    const [deployHierarchy, setDeployHierarchy] = useState({
        wings: [] as any[],
        offices: [] as any[],
        desks: [] as any[]
    });

    async function fetchPendingRequests() {
        // Fetch all pending request items to optionally link
        const { data } = await supabase
            .from('request_items')
            .select(`
                id,
                item_type,
                quantity,
                fulfilled_quantity,
                requests (
                    reporter_name,
                    created_at
                )
            `)
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        setPendingRequestItems(data || []);
    }

    async function fetchDeployWings(hId: string) {
        const { data } = await supabase.from('wings').select('*').eq('hospital_id', hId).order('name');
        setDeployHierarchy(prev => ({ ...prev, wings: data || [], offices: [], desks: [] }));
        setDeployData(prev => ({ ...prev, wing_id: '', office_id: '', desk_id: '' }));
    }

    async function fetchDeployOffices(wId: string) {
        const { data } = await supabase.from('offices').select('*').eq('wing_id', wId).order('name');
        setDeployHierarchy(prev => ({ ...prev, offices: data || [], desks: [] }));
        setDeployData(prev => ({ ...prev, office_id: '', desk_id: '' }));
    }

    async function fetchDeployDesks(oId: string) {
        const { data } = await supabase.from('desks').select('*').eq('office_id', oId).order('name');
        setDeployHierarchy(prev => ({ ...prev, desks: data || [] }));
        setDeployData(prev => ({ ...prev, desk_id: '' }));
    }

    const openDeployModal = (device: any) => {
        setDeployData({
            device_id: device.id,
            hospital_id: device.hospital_id || '',
            wing_id: '',
            office_id: '',
            desk_id: '',
            request_item_id: ''
        });
        if (device.hospital_id) fetchDeployWings(device.hospital_id);
        fetchPendingRequests();
        setShowDeployModal(true);
    };


    async function handleDeploy(e: React.FormEvent) {
        e.preventDefault();
        if (!deployData.desk_id) return;
        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('devices').update({
                desk_id: deployData.desk_id,
                office_id: deployData.office_id,
                deployment_status: 'Deployed'
            } as any).eq('id', deployData.device_id) as any);

            if (error) throw error;

            // Link to Request Item if selected
            // @ts-ignore
            if (deployData.request_item_id) {
                // @ts-ignore
                const item = pendingRequestItems.find(i => i.id === deployData.request_item_id);
                if (item) {
                    const currentFulfilled = parseInt(String(item.fulfilled_quantity || 0), 10);
                    const totalQty = parseInt(String(item.quantity || 1), 10);
                    const newFulfilled = currentFulfilled + 1;
                    const newStatus = newFulfilled >= totalQty ? 'Fulfilled' : 'Pending';

                    console.log(`Updating Request Item ${item.id}: ${currentFulfilled} -> ${newFulfilled} / ${totalQty} (${newStatus})`);

                    // Update Item
                    const { error: reqError } = await supabase
                        .from('request_items')
                        .update({
                            fulfilled_quantity: newFulfilled,
                            status: newStatus as any
                        })
                        .eq('id', item.id);

                    if (reqError) {
                        console.error('Request Item Update Failed:', reqError);
                        alert(`Warning: Device deployed, but request status update failed: ${reqError.message}`);
                    }

                    // Check if all sibling items are fulfilled
                    if (item.request_id) {
                        const { data: siblings } = await supabase
                            .from('request_items')
                            .select('status')
                            .eq('request_id', item.request_id);

                        const allFulfilled = siblings?.every(s =>
                            (s.id === item.id ? newStatus : s.status) === 'Fulfilled'
                        );

                        if (allFulfilled) {
                            await supabase
                                .from('requests')
                                .update({ status: 'Fulfilled' } as any)
                                .eq('id', item.request_id);
                        }
                    }
                }
            }

            // Log history
            await logDeployment(deployData.device_id, 'Deploy', 'Deployed', {
                hospital_id: deployData.hospital_id,
                office_id: deployData.office_id,
                desk_id: deployData.desk_id
            });

            // Trigger Notification to ALL users in the hospital
            try {
                // 1. Get Desk Name
                const { data: deskData } = await supabase
                    .from('desks')
                    .select('name')
                    .eq('id', deployData.desk_id)
                    .single();

                // 2. Get all users in the hospital
                if (deployData.hospital_id) {
                    const { data: hospitalUsers } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('hospital_id', deployData.hospital_id);

                    if (hospitalUsers && hospitalUsers.length > 0) {
                        const notifications = hospitalUsers.map(user => ({
                            user_id: user.id,
                            title: 'Device Deployment Alert',
                            message: `A device has been deployed to ${deskData?.name || 'a desk'} in your hospital.`,
                            link: `/desks`
                        }));

                        await supabase.from('notifications').insert(notifications);
                    }
                }
            } catch (notifyError) {
                console.error('Failed to send notifications:', notifyError);
            }

            setShowDeployModal(false);
            fetchData();
        } catch (error: any) {
            alert(`Deployment failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleArchiveDevice(e: React.FormEvent) {
        e.preventDefault();
        if (!activeDevice) return;
        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('devices').update({
                deployment_status: 'Archived',
                status: updateCondition,
                physical_condition: updateCondition,
                desk_id: null,
                office_id: null
            } as any).eq('id', activeDevice.id) as any);

            if (error) throw error;

            // Log history
            await logDeployment(activeDevice.id, 'Archive', 'Archived', {
                hospital_id: activeDevice.hospital_id,
                notes: `Archived. Condition: ${updateCondition}`
            });
            setShowArchiveModal(false);
            fetchData();
        } catch (error: any) {
            alert(`Archiving failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSaveMaintenance(e: React.FormEvent) {
        e.preventDefault();
        if (!activeDevice || !maintenanceForm.description) return;
        try {
            setIsSubmitting(true);

            // 1. Create Log Entry
            const { error: logError } = await (supabase.from('maintenance_logs').insert([{
                device_id: activeDevice.id,
                it_officer_id: maintenanceForm.performer_type === 'Staff' ? profile?.id : null,
                description: maintenanceForm.description,
                parts_replaced: maintenanceForm.parts_replaced || null,
                performer_type: maintenanceForm.performer_type,
                performer_name: maintenanceForm.performer_name || (maintenanceForm.performer_type === 'Staff' ? profile?.email : 'External Vendor'),
                update_condition: maintenanceForm.update_condition
            } as any]) as any);

            if (logError) throw logError;

            // 2. Update Device Condition
            const { error: devError } = await (supabase.from('devices').update({
                physical_condition: maintenanceForm.update_condition
            } as any).eq('id', activeDevice.id) as any);

            if (devError) throw devError;

            setShowMaintenanceModal(false);
            setMaintenanceForm({
                description: '',
                parts_replaced: '',
                performer_type: 'Staff',
                performer_name: '',
                update_condition: 'Good'
            });
            fetchData();
        } catch (error: any) {
            alert(`Maintenance log failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const openArchiveModal = (device: any) => {
        setActiveDevice(device);
        setUpdateCondition(device.physical_condition || 'Good');
        setShowArchiveModal(true);
    };

    const openMaintenanceModal = (device: any) => {
        setActiveDevice(device);
        setMaintenanceForm(prev => ({
            ...prev,
            update_condition: device.physical_condition || 'Good'
        }));
        setShowMaintenanceModal(true);
        setOpenDropdownId(null);
    };

    const openHistoryModal = async (device: any) => {
        setActiveDevice(device);
        setOpenDropdownId(null);
        try {
            const { data, error } = await supabase
                .from('maintenance_logs')
                .select('*')
                .eq('device_id', device.id)
                .order('performed_at', { ascending: false });

            if (error) throw error;
            setMaintenanceLogs(data || []);
            setShowHistoryModal(true);
        } catch (error: any) {
            alert(`Failed to fetch history: ${error.message}`);
        }
    };

    const openDeploymentHistoryModal = async (device: any) => {
        setActiveDevice(device);
        setOpenDropdownId(null);
        try {
            const { data, error } = await supabase
                .from('deployment_logs')
                .select('*, hospitals(name), offices(name), desks(name)')
                .eq('device_id', device.id)
                .order('performed_at', { ascending: false });

            if (error) throw error;
            setDeploymentLogs(data || []);
            setShowDeploymentHistoryModal(true);
        } catch (error: any) {
            alert(`Failed to fetch history: ${error.message}`);
        }
    };

    const toggleDropdown = (id: string) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 text-left">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 text-left">Inventory Management</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-slate-500">Track and manage hardware assets for {['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? 'all facilities' : 'your facility'}.</p>
                            {profile && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200 uppercase">
                                    Role: {profile.role} | Facility: {profile.hospital_id || 'None'}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={openModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Register Device
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Barcode, Model, or Facility..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-sm"
                            value={filterCategoryId}
                            onChange={(e) => setFilterCategoryId(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Facility Filter (Super Admin Only) */}
                    {userRole === 'SUPER_ADMIN' && (
                        <div className="w-full md:w-64">
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-sm"
                                value={filterHospitalId}
                                onChange={(e) => setFilterHospitalId(e.target.value)}
                            >
                                <option value="">All Facilities</option>
                                {hospitals.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Asset Table Container - Definitive clipping fix using internal spacing and smart positioning */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-6 py-4">Device Details</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Network Info</th>
                                    <th className="px-6 py-4">Status & Condition</th>
                                    <th className="px-6 py-4 text-right pr-12">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin text-blue-500" size={24} />
                                                <span>Loading assets...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredDevices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No assets found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDevices.map((device, i) => (
                                        <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <CategoryIcon cat={device.device_categories?.name || 'Other'} />
                                                    <div>
                                                        <button
                                                            onClick={() => openHistoryModal(device)}
                                                            className="text-xs font-bold text-blue-600 uppercase tracking-tight hover:underline text-left block"
                                                        >
                                                            {device.device_categories?.name || 'Uncategorized'}
                                                        </button>
                                                        <div className="font-bold text-slate-900">{device.brand} {device.model}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{device.serial_number || 'No Serial'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-900">{device.desks?.name || (['Available', 'Retrieved'].includes(device.deployment_status) ? 'Main Store' : device.deployment_status)}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{device.hospitals?.name} • {device.offices?.name || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(device.ip_address || device.mac_address) ? (
                                                    <div className="flex flex-col gap-1.5 align-middle justify-center">
                                                        {device.ip_address && (
                                                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                                                <span className="font-bold text-slate-400 select-none">IP</span>
                                                                {device.ip_address}
                                                            </div>
                                                        )}
                                                        {device.mac_address && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 px-1">
                                                                <span className="font-bold text-slate-400 select-none">MAC</span>
                                                                {device.mac_address}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic opacity-50">No Network Info</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 space-y-2">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${device.deployment_status === 'Deployed' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                    device.deployment_status === 'Archived' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                                                        device.deployment_status === 'Disposal' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' :
                                                            'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                    }`}>
                                                    {device.deployment_status || 'Available'}
                                                </span>
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${device.physical_condition === 'Good' ? 'bg-emerald-100 text-emerald-700' :
                                                    device.physical_condition === 'Faulty' ? 'bg-rose-100 text-rose-700' :
                                                        device.physical_condition === 'In Repair' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {device.physical_condition || 'Good'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => toggleDropdown(device.id)}
                                                        className={`p-2 rounded-lg transition-all ${openDropdownId === device.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <MoreVertical size={20} />
                                                    </button>

                                                    {openDropdownId === device.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-[60]"
                                                                onClick={() => setOpenDropdownId(null)}
                                                            />
                                                            <div
                                                                className={`absolute right-6 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[70] animate-in fade-in zoom-in duration-150 text-left
                                                                    ${i >= filteredDevices.length - 3 && filteredDevices.length > 3 ? 'bottom-full mb-2' : 'top-12'}
                                                                `}
                                                            >
                                                                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Actions</p>

                                                                {/* Maintenance History */}
                                                                <button
                                                                    onClick={() => openHistoryModal(device)}
                                                                    className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <History size={16} className="text-slate-400" />
                                                                    <span>Maint. History</span>
                                                                </button>

                                                                {/* Deployment History */}
                                                                <button
                                                                    onClick={() => openDeploymentHistoryModal(device)}
                                                                    className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <Send size={16} className="text-emerald-400" />
                                                                    <span>Deploy. History</span>
                                                                </button>

                                                                <div className="my-1 border-t border-slate-50" />

                                                                {/* Maintenance Log */}
                                                                <button
                                                                    onClick={() => openMaintenanceModal(device)}
                                                                    className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <Wrench size={16} className="text-blue-500" />
                                                                    <span>Log Maintenance</span>
                                                                </button>

                                                                <div className="my-1 border-t border-slate-50" />

                                                                {/* Deployment Action */}
                                                                {device.deployment_status === 'Available' && (
                                                                    <button
                                                                        onClick={() => openDeployModal(device)}
                                                                        className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                    >
                                                                        <Send size={16} className="text-emerald-500" />
                                                                        <span>Deploy Asset</span>
                                                                    </button>
                                                                )}

                                                                {/* Archive Action */}
                                                                {device.deployment_status !== 'Archived' && (
                                                                    <button
                                                                        onClick={() => openArchiveModal(device)}
                                                                        className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                    >
                                                                        <Archive size={16} className="text-amber-500" />
                                                                        <span>Move to Archive</span>
                                                                    </button>
                                                                )}

                                                                <div className="my-1 border-t border-slate-50" />

                                                                <button
                                                                    onClick={() => { setOpenDropdownId(null); openEditModal(device); }}
                                                                    className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <Pencil size={16} className="text-slate-400" />
                                                                    <span>Edit Details</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => { setOpenDropdownId(null); openDeleteModal(device.id); }}
                                                                    className="w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    <span>Delete Asset</span>
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Internal Spacer to ensure enough vertical room for dropdowns at the bottom of a large list */}
                        <div className="h-48" />
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
                    onConfirm={handleDeleteDevice}
                    title="Delete Device"
                    message="Are you sure you want to delete this device from the inventory? This will permanently remove the asset record and its deployment history."
                    isDeleting={isDeleting}
                />
            </div>

            {/* Deploy Modal */}
            {showDeployModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeployModal(false)} />
                    <form onSubmit={handleDeploy} className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Send className="text-emerald-600" size={24} />
                                Deploy Asset
                            </h3>
                            <button type="button" onClick={() => setShowDeployModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-4 text-left">
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                    <ShoppingBag size={14} /> Link to Request (Optional)
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-md border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500/20 bg-white"
                                    // @ts-ignore
                                    value={deployData.request_item_id || ''}
                                    // @ts-ignore
                                    onChange={(e) => setDeployData({ ...deployData, request_item_id: e.target.value })}
                                >
                                    <option value="">-- None --</option>
                                    {pendingRequestItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.requests?.reporter_name} - {item.item_type} ({item.fulfilled_quantity}/{item.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>


                            <div className="space-y-1.5 font-medium">
                                <label className="text-sm text-slate-700">Section</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                                    value={deployData.wing_id}
                                    onChange={(e) => {
                                        setDeployData({ ...deployData, wing_id: e.target.value });
                                        fetchDeployOffices(e.target.value);
                                    }}
                                >
                                    <option value="">Select Section</option>
                                    {deployHierarchy.wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 font-medium">
                                <label className="text-sm text-slate-700">Office</label>
                                <select
                                    disabled={!deployData.wing_id}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                                    value={deployData.office_id}
                                    onChange={(e) => {
                                        setDeployData({ ...deployData, office_id: e.target.value });
                                        fetchDeployDesks(e.target.value);
                                    }}
                                >
                                    <option value="">Select Office</option>
                                    {deployHierarchy.offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 font-medium">
                                <label className="text-sm text-slate-700">Desk</label>
                                <select
                                    disabled={!deployData.office_id}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                                    value={deployData.desk_id}
                                    onChange={(e) => setDeployData({ ...deployData, desk_id: e.target.value })}
                                >
                                    <option value="">Select Desk</option>
                                    {deployHierarchy.desks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button type="button" onClick={() => setShowDeployModal(false)} className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !deployData.desk_id}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:bg-slate-400"
                            >
                                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                Complete Deployment
                            </button>
                        </div>
                    </form>
                </div >
            )
            }

            {/* Registration Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                        <form onSubmit={handleSaveDevice} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{isEditing ? 'Edit Device' : 'Register New Device'}</h3>
                                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6 text-left">
                                {userRole === 'ADMIN' ? (
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Facility Owner</label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.hospital_id}
                                            onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
                                        >
                                            <option value="">Select Facility</option>
                                            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="px-4 py-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                                        <Building2 className="text-blue-500" size={20} />
                                        <div>
                                            <p className="text-xs font-bold text-blue-600/60 uppercase">Registering for Facility</p>
                                            <p className="text-sm font-bold text-blue-900">{profile?.hospitals?.name}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Visualization Header for Editing */}
                                {isEditing && (
                                    <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded shadow-sm">
                                                <Wifi className="text-slate-400" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Asset Barcode</p>
                                                <p className="text-sm font-mono font-bold text-slate-700">{formData.barcode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Status</p>
                                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{formData.deployment_status}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Deployment Status</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.deployment_status}
                                            onChange={(e) => setFormData({ ...formData, deployment_status: e.target.value as any })}
                                        >
                                            <option value="Available">Available</option>
                                            <option value="Deployed">Deployed</option>
                                            <option value="Retrieved">Retrieved</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Device Category</label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Barcode / Asset Tag</label>
                                        <input
                                            readOnly
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
                                            value={formData.barcode}
                                        />
                                        <p className="text-[10px] text-blue-500 font-medium">Unique Asset Identifier (Auto-generated)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Serial Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SN12345678"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.serial_number}
                                            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Device Status</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        >
                                            <option value="Good">Good</option>
                                            <option value="Faulty">Faulty</option>
                                            <option value="In Repair">In Repair</option>
                                            <option value="Bad">Bad</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                            checked={formData.has_network_info}
                                            onChange={(e) => setFormData({ ...formData, has_network_info: e.target.checked })}
                                        />
                                        <span className="font-bold text-sm text-slate-700 group-hover:text-blue-700">Has Network Capability?</span>
                                    </label>

                                    {formData.has_network_info && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-1.5 font-medium">
                                                <label className="text-sm text-slate-700">IP Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 192.168.1.100"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                                    value={formData.ip_address}
                                                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5 font-medium">
                                                <label className="text-sm text-slate-700">MAC Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 00:1A:2B:3C:4D:5E"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                                    value={formData.mac_address}
                                                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Brand</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. HP, Dell"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 font-medium">
                                        <label className="text-sm text-slate-700">Model Name/Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. EliteDesk 800 G4"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:bg-slate-400"
                                >
                                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                    {isEditing ? 'Save Changes' : 'Register Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }


            {/* Archive Modal */}
            {
                showArchiveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowArchiveModal(false)} />
                        <form onSubmit={handleArchiveDevice} className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Archive className="text-amber-600" size={24} />
                                    Archive Asset
                                </h3>
                                <button type="button" onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-4 text-left">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Moving this asset to the <strong>Archive Store</strong>. This is typically for faulty or old equipment.
                                </p>
                                <div className="space-y-1.5 font-medium">
                                    <label className="text-sm text-slate-700">Set Final Condition</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500/20"
                                        value={updateCondition}
                                        onChange={(e) => setUpdateCondition(e.target.value)}
                                    >
                                        <option value="Good">Good</option>
                                        <option value="Faulty">Faulty</option>
                                        <option value="In Repair">In Repair</option>
                                        <option value="Scrapped">Scrapped</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button type="button" onClick={() => setShowArchiveModal(false)} className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-amber-200 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                    Move to Archive
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Maintenance Modal */}
            {
                showMaintenanceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMaintenanceModal(false)} />
                        <form onSubmit={handleSaveMaintenance} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Wrench className="text-blue-600" size={24} />
                                    Maintenance Log
                                </h3>
                                <button type="button" onClick={() => setShowMaintenanceModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-5 text-left max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Performer Type</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={maintenanceForm.performer_type}
                                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performer_type: e.target.value as any })}
                                        >
                                            <option value="Staff">IT Staff</option>
                                            <option value="Vendor">External Vendor</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Update Condition</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={maintenanceForm.update_condition}
                                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, update_condition: e.target.value })}
                                        >
                                            <option value="Good">Good (Working)</option>
                                            <option value="Faulty">Faulty (Needs Attention)</option>
                                            <option value="In Repair">In Repair</option>
                                            <option value="Scrapped">Scrapped</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Performer Name</label>
                                    <input
                                        type="text"
                                        placeholder={maintenanceForm.performer_type === 'Staff' ? profile?.email || 'Your name' : 'Service Vendor Name'}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={maintenanceForm.performer_name}
                                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performer_name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Work Description</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="What maintenance was performed?"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 resize-none"
                                        value={maintenanceForm.description}
                                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Parts Replaced (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. RAM, SSD, Screen"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                        value={maintenanceForm.parts_replaced}
                                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, parts_replaced: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button type="button" onClick={() => setShowMaintenanceModal(false)} className="px-6 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !maintenanceForm.description}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                    Save Log
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }
            {/* Maintenance History Modal */}
            {
                showHistoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <History className="text-slate-600" size={24} />
                                        Maintenance History
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {activeDevice?.brand} {activeDevice?.model} • {activeDevice?.serial_number}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8">
                                {maintenanceLogs.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Wrench className="mx-auto text-slate-300 mb-4" size={48} />
                                        <p className="text-slate-500 font-medium">No maintenance history recorded for this asset.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                        {maintenanceLogs.map((log, idx) => (
                                            <div key={log.id} className="relative pl-12">
                                                {/* Dot */}
                                                <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${log.performer_type === 'Staff' ? 'bg-blue-500' : 'bg-amber-500'
                                                    }`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 hover:border-slate-200 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.performer_type === 'Staff' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {log.performer_type}
                                                            </span>
                                                            <h4 className="font-bold text-slate-900 mt-1">{log.performer_name || 'System User'}</h4>
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-400">
                                                            {new Date(log.performed_at).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                                                        "{log.description}"
                                                    </p>

                                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200/50">
                                                        {log.parts_replaced && (
                                                            <div>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parts Replaced</p>
                                                                <p className="text-xs font-semibold text-slate-700">{log.parts_replaced}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Post-Maint.</p>
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                                                                {log.update_condition || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowHistoryModal(false)}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                                >
                                    Close History
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Deployment History Modal */}
            {
                showDeploymentHistoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeploymentHistoryModal(false)} />
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <Send className="text-emerald-600" size={24} />
                                        Deployment History
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        Track movements and assignments for {activeDevice?.brand} {activeDevice?.model}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowDeploymentHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                                            <th className="px-6 py-4 whitespace-nowrap">Date</th>
                                            <th className="px-6 py-4">Action</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Location</th>
                                            <th className="px-6 py-4">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {deploymentLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Send className="text-slate-200" size={48} />
                                                        <p className="text-slate-500 font-medium italic">No deployment history found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            deploymentLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs font-bold text-slate-900">{new Date(log.performed_at).toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-500">{new Date(log.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.type === 'Deploy' ? 'bg-emerald-100 text-emerald-700' :
                                                            log.type === 'Retrieve' ? 'bg-indigo-100 text-indigo-700' :
                                                                log.type === 'Archive' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{log.status}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-bold text-slate-900">{log.desks?.name || log.offices?.name || 'Main Store'}</div>
                                                        <div className="text-[10px] text-slate-500 tracking-tight">{log.hospitals?.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-600 leading-relaxed italic max-w-xs">{log.notes || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowDeploymentHistoryModal(false)}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </DashboardLayout >
    );
}
