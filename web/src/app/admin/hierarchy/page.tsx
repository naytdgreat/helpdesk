'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Plus,
    Building2,
    Layers,
    DoorOpen,
    Loader2,
    ChevronRight,
    Trash2,
    Monitor,
    Pencil,
    X,
    Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function HierarchyPage() {
    const { profile } = useAuth();
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [wings, setWings] = useState<any[]>([]);
    const [offices, setOffices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);
    const [activeWingId, setActiveWingId] = useState<string | null>(null);

    const [newHospName, setNewHospName] = useState('');
    const [newWingName, setNewWingName] = useState('');
    const [newOfficeName, setNewOfficeName] = useState('');
    const [newCatName, setNewCatName] = useState('');

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteType, setDeleteType] = useState<'HOSPITAL' | 'WING' | 'OFFICE' | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        fetchHospitals();
        fetchCategories();
    }, []);

    async function fetchHospitals() {
        setLoading(true);
        const { data } = await supabase.from('hospitals').select('*').order('name');
        const hospitals = (data || []) as any[];
        setHospitals(hospitals);
        setLoading(false);

        // Auto-select if only one facility (e.g. Admin view)
        if (hospitals.length === 1) {
            fetchWings(hospitals[0].id);
        }
    }

    async function fetchWings(hospitalId: string) {
        setActiveHospitalId(hospitalId);
        setActiveWingId(null);
        setOffices([]);
        const { data } = await supabase.from('wings').select('*').eq('hospital_id', hospitalId).order('name');
        setWings(data || []);
    }

    async function fetchOffices(wingId: string) {
        setActiveWingId(wingId);
        const { data } = await supabase.from('offices').select('*').eq('wing_id', wingId).order('name');
        setOffices(data || []);
    }

    async function fetchCategories() {
        const { data } = await supabase.from('device_categories').select('*').order('name');
        setCategories(data || []);
    }

    async function addHospital() {
        if (!newHospName) return;
        const { error } = await supabase.from('hospitals').insert([{ name: newHospName }] as any);
        if (!error) {
            setNewHospName('');
            fetchHospitals();
        }
    }

    async function addWing() {
        if (!newWingName || !activeHospitalId) return;
        const { error } = await supabase.from('wings').insert([{ name: newWingName, hospital_id: activeHospitalId }] as any);
        if (!error) {
            setNewWingName('');
            fetchWings(activeHospitalId);
        }
    }

    async function addOffice() {
        if (!newOfficeName || !activeWingId) return;
        const { error } = await supabase.from('offices').insert([{ name: newOfficeName, wing_id: activeWingId }] as any);
        if (!error) {
            setNewOfficeName('');
            fetchOffices(activeWingId);
        }
    }

    async function addCategory() {
        if (!newCatName) return;
        const { error } = await supabase.from('device_categories').insert([{ name: newCatName }] as any);
        if (!error) {
            setNewCatName('');
            fetchCategories();
        }
    }

    async function deleteCategory(id: string) {
        const { error } = await supabase.from('device_categories').delete().eq('id', id);
        if (!error) {
            fetchCategories();
        }
    }

    // --- Deletion Logic ---
    const confirmDelete = (type: 'HOSPITAL' | 'WING' | 'OFFICE', id: string) => {
        setDeleteType(type);
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteId || !deleteType) return;
        setIsDeleting(true);
        try {
            let table = '';
            if (deleteType === 'HOSPITAL') table = 'hospitals';
            if (deleteType === 'WING') table = 'wings';
            if (deleteType === 'OFFICE') table = 'offices';

            const { error } = await (supabase.from as any)(table).delete().eq('id', deleteId);
            if (error) throw error;

            // Refresh data based on type
            if (deleteType === 'HOSPITAL') {
                fetchHospitals();
                if (activeHospitalId === deleteId) {
                    setActiveHospitalId(null);
                    setWings([]);
                    setOffices([]);
                }
            } else if (deleteType === 'WING') {
                if (activeHospitalId) fetchWings(activeHospitalId);
                if (activeWingId === deleteId) {
                    setActiveWingId(null);
                    setOffices([]);
                }
            } else if (deleteType === 'OFFICE') {
                if (activeWingId) fetchOffices(activeWingId);
            }
            setShowDeleteModal(false);
        } catch (error: any) {
            alert(`Failed to delete: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Edit Logic ---
    const startEditing = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = async (type: 'HOSPITAL' | 'WING', id: string) => {
        if (!editName.trim()) return;
        try {
            const table = type === 'HOSPITAL' ? 'hospitals' : 'wings';
            const { error } = await (supabase.from as any)(table).update({ name: editName }).eq('id', id);

            if (error) throw error;

            if (type === 'HOSPITAL') {
                fetchHospitals();
            } else {
                if (activeHospitalId) fetchWings(activeHospitalId);
            }
            setEditingId(null);
        } catch (error: any) {
            alert(`Failed to update: ${error.message}`);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Infrastructure Hierarchy</h1>
                <p className="text-slate-500">Manage facilities, sections, offices, and device categories</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Facilities */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">1. Facilities</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            {profile?.role === 'SUPER_ADMIN' ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add Facility..."
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        value={newHospName}
                                        onChange={(e) => setNewHospName(e.target.value)}
                                    />
                                    <button
                                        onClick={addHospital}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic">
                                    You are managing: <span className="font-semibold text-slate-700">{profile?.hospitals?.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {loading ? (
                                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
                            ) : hospitals.map(h => (
                                <div
                                    key={h.id}
                                    onClick={() => fetchWings(h.id)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors group ${activeHospitalId === h.id ? 'bg-blue-50/50 border-r-4 border-blue-600' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        {editingId === h.id ? (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                />
                                                <button onClick={() => saveEdit('HOSPITAL', h.id)} className="text-emerald-600 hover:text-emerald-700">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-500">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-sm font-semibold truncate block ${activeHospitalId === h.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {h.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {profile?.role === 'SUPER_ADMIN' && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEditing(h.id, h.name); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); confirmDelete('HOSPITAL', h.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                        <ChevronRight size={16} className={activeHospitalId === h.id ? 'text-blue-400' : 'text-slate-300'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 2: Sections */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">2. Sections</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex gap-2">
                                <input
                                    disabled={!activeHospitalId}
                                    type="text"
                                    placeholder={activeHospitalId ? "Add Section..." : "Select Facility First"}
                                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                                    value={newWingName}
                                    onChange={(e) => setNewWingName(e.target.value)}
                                />
                                <button
                                    disabled={!activeHospitalId}
                                    onClick={addWing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:bg-slate-300"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {!activeHospitalId ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Select a facility to see sections</div>
                            ) : wings.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No sections found for this facility</div>
                            ) : wings.map(w => (
                                <div
                                    key={w.id}
                                    onClick={() => fetchOffices(w.id)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors group ${activeWingId === w.id ? 'bg-blue-50/50 border-r-4 border-blue-600' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        {editingId === w.id ? (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                />
                                                <button onClick={() => saveEdit('WING', w.id)} className="text-emerald-600 hover:text-emerald-700">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-500">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-sm font-semibold truncate block ${activeWingId === w.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {w.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startEditing(w.id, w.name); }}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); confirmDelete('WING', w.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className={activeWingId === w.id ? 'text-blue-400' : 'text-slate-300'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 3: Offices */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DoorOpen className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">3. Offices</h2>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex gap-2">
                                <input
                                    disabled={!activeWingId}
                                    type="text"
                                    placeholder={activeWingId ? "Add Office..." : "Select Section First"}
                                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                                    value={newOfficeName}
                                    onChange={(e) => setNewOfficeName(e.target.value)}
                                />
                                <button
                                    disabled={!activeWingId}
                                    onClick={addOffice}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:bg-slate-300"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {!activeWingId ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Select a section to see offices</div>
                            ) : offices.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No offices found in this section</div>
                            ) : offices.map(o => (
                                <div
                                    key={o.id}
                                    className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-sm font-semibold text-slate-700">{o.name}</span>
                                    <button
                                        onClick={() => confirmDelete('OFFICE', o.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Device Categories */}
            <div className="mt-12 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Monitor className="text-blue-600" size={20} />
                    <h2 className="text-lg font-bold text-slate-800">Device Categories</h2>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add New Category (e.g. Printer, Tablet)..."
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                            />
                            <button
                                onClick={addCategory}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-bold text-sm"
                            >
                                Add Category
                            </button>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {categories.map(cat => (
                            <div key={cat.id} className="p-3 px-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                <span className="text-sm text-slate-700 font-medium">{cat.name}</span>
                                <button
                                    onClick={() => deleteCategory(cat.id)}
                                    className="text-slate-300 hover:text-red-600 transition-opacity opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={`Delete ${deleteType === 'HOSPITAL' ? 'Facility' : deleteType === 'WING' ? 'Section' : 'Office'}`}
                message={`Are you sure you want to delete this ${deleteType === 'HOSPITAL' ? 'facility' : deleteType === 'WING' ? 'section' : 'office'}? This action cannot be undone.`}
                isDeleting={isDeleting}
            />
        </DashboardLayout>
    );
}
