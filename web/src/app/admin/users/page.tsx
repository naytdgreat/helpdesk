'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Users,
    UserPlus,
    Shield,
    Building2,
    Search,
    MoreHorizontal,
    Loader2,
    X,
    CheckCircle2,
    Trash2,
    Pencil
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function UserManagementPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'IT_OFFICER',
        hospital_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (profile && !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            router.push('/');
        } else if (profile) {
            fetchUsers();
            fetchHospitals();
            if (profile.role === 'ADMIN' && profile.hospital_id) {
                setFormData(prev => ({ ...prev, hospital_id: profile.hospital_id! }));
            }
        }
    }, [profile]);

    async function fetchUsers() {
        try {
            setLoading(true);
            let query = supabase
                .from('profiles')
                .select('*, hospitals(name)')
                .order('created_at', { ascending: false });

            // If Hospital Admin, filter by their hospital
            if (profile?.role === 'ADMIN' && profile.hospital_id) {
                query = query.eq('hospital_id', profile.hospital_id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchHospitals() {
        const { data } = await supabase.from('hospitals').select('*').order('name');
        setHospitals(data || []);
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage(null);

        try {
            // Note: We create a temporary, non-persisting client for the signUp call.
            // This prevents the current admin's browser session from being logged out or switched.
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhhexzchqaanraydnmgh.supabase.co';
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DD40Ypi1G-f9kCerDogpVg_xZVjfT4v';
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false
                }
            });

            // signUp will create user in auth.users and trigger handle_new_user
            const { data, error: signUpError } = await tempClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: formData.role,
                        hospital_id: formData.hospital_id || null
                    } as any
                }
            });

            if (signUpError) throw signUpError;

            // Direct update to Profile as a fallback/backup to ensure data is correct
            if (data.user) {
                await (supabase
                    .from('profiles') as any)
                    .update({
                        name: formData.name,
                        role: formData.role as any,
                        hospital_id: formData.hospital_id || null
                    })
                    .eq('id', data.user.id);
            }

            setSuccessMessage(`User ${formData.email} created successfully!`);
            setSuccessMessage(`User ${formData.email} created successfully!`);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'IT_OFFICER',
                hospital_id: profile?.role === 'ADMIN' ? profile.hospital_id || '' : ''
            });
            fetchUsers();
            setTimeout(() => {
                setShowAddModal(false);
                setSuccessMessage(null);
            }, 2000);
        } catch (error: any) {
            console.error('Error creating user:', error);
            alert(error.message || 'Failed to create user.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUpdateUser(e: React.FormEvent) {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);

        try {
            const { error } = await (supabase
                .from('profiles') as any)
                .update({
                    name: editingUser.name,
                    role: editingUser.role,
                    hospital_id: editingUser.hospital_id || null
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setShowEditModal(false);
            fetchUsers();
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert(error.message || 'Failed to update user.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteUser() {
        if (!deletingUserId) return;

        try {
            setIsDeleting(true);
            const { error } = await supabase.from('profiles').delete().eq('id', deletingUserId);
            if (error) throw error;
            setShowDeleteModal(false);
            setDeletingUserId(null);
            fetchUsers();
        } catch (error: any) {
            alert(error.message || 'Failed to delete user.');
        } finally {
            setIsDeleting(false);
        }
    }

    const openDeleteModal = (id: string) => {
        setDeletingUserId(id);
        setShowDeleteModal(true);
    };

    const filteredUsers = users.filter(u =>
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.hospitals?.name || 'Global').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage IT Officers and System Administrators</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <UserPlus size={20} />
                    Add New User
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID, role, or hospital..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Assigned Facility</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin inline-block mr-2" /> Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No users found</td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 line-clamp-1 text-sm">{u.name || 'Unnamed User'}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-700/10' :
                                                u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-700/10' :
                                                    'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <Building2 size={16} className="text-slate-400" />
                                                {u.hospitals?.name || 'Global Access'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(u);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(u.id)}
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteUser}
                title="Delete User Account"
                message="Are you sure you want to delete this staff account? This will permanently remove their access to the system and delete their profile data."
                isDeleting={isDeleting}
            />

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Add New Staff</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {successMessage ? (
                            <div className="p-12 flex flex-col items-center text-center">
                                <CheckCircle2 className="text-emerald-500 mb-4" size={64} />
                                <h4 className="text-xl font-bold text-slate-900 mb-2">Success!</h4>
                                <p className="text-slate-500">{successMessage}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAddUser} className="p-8 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="user@example.com"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Initial Password</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Min 6 characters"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">System Role</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="IT_OFFICER">IT Officer</option>
                                            {['SUPER_ADMIN', 'ADMIN'].includes(profile?.role || '') && (
                                                <option value="ADMIN">Facility Admin</option>
                                            )}
                                            {profile?.role === 'SUPER_ADMIN' && (
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Facility</label>
                                        <select
                                            disabled={profile?.role === 'ADMIN'}
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400"
                                            value={formData.hospital_id}
                                            onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
                                        >
                                            <option value="">{profile.role === 'SUPER_ADMIN' ? 'Select Facility' : 'Global/None'}</option>
                                            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:bg-slate-300"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                    Create Staff Account
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Edit Staff Account</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-8 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1 text-slate-400">User ID (Permanent)</label>
                                <div className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 font-mono text-xs text-slate-500">
                                    {editingUser.id}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium"
                                    value={editingUser.name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">System Role</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-medium text-sm"
                                        value={editingUser.role}
                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                        disabled={editingUser.role === 'SUPER_ADMIN' && profile.role !== 'SUPER_ADMIN'}
                                    >
                                        <option value="IT_OFFICER">IT Officer</option>
                                        {['SUPER_ADMIN', 'ADMIN'].includes(profile?.role || '') && (
                                            <option value="ADMIN">Facility Admin</option>
                                        )}
                                        {profile?.role === 'SUPER_ADMIN' && (
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Facility</label>
                                    <select
                                        disabled={profile?.role === 'ADMIN'}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm disabled:bg-slate-50 disabled:text-slate-400"
                                        value={editingUser.hospital_id || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, hospital_id: e.target.value })}
                                    >
                                        <option value="">{profile.role === 'SUPER_ADMIN' ? 'Select Facility' : 'Global/None'}</option>
                                        {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:bg-slate-300"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
