'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Bell,
    CheckCheck,
    Loader2,
    ExternalLink,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function NotificationsPage() {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (profile) {
            fetchNotifications();
        }
    }, [profile, currentPage]);

    async function fetchNotifications() {
        try {
            setLoading(true);
            const user_id = profile?.id;
            if (!user_id) return;

            // 1. Get Count
            const { count, error: countError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user_id);

            if (countError) throw countError;
            setTotalItems(count || 0);

            // 2. Get Data
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user_id)
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true } as any)
            .eq('id', id);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        }
    }

    async function markAllAsRead() {
        try {
            setMarkingAllAsRead(true);
            const user_id = profile?.id;
            if (!user_id) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true } as any)
                .eq('user_id', user_id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            // Option to refresh unread count in global state might be needed if context isn't used
        } catch (error: any) {
            alert(`Failed to mark all as read: ${error.message}`);
        } finally {
            setMarkingAllAsRead(false);
        }
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="text-blue-600" size={24} />
                        Notifications History
                    </h1>
                    <p className="text-slate-500">View and manage all your system alerts and updates.</p>
                </div>
                <button
                    onClick={markAllAsRead}
                    disabled={markingAllAsRead || notifications.every(n => n.is_read)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {markingAllAsRead ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <CheckCheck size={18} className="text-emerald-500" />
                    )}
                    Mark All as Read
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-slate-500">
                        <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
                        <p className="font-medium">Loading your notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-20 text-center text-slate-500">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="text-slate-300" size={32} />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">All caught up!</p>
                        <p>You don't have any notifications at the moment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-6 flex flex-col sm:flex-row justify-between gap-4 transition-colors ${!n.is_read ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className={`text-base ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                {n.title}
                                            </h3>
                                            {!n.is_read && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 uppercase">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm ${!n.is_read ? 'text-slate-700' : 'text-slate-600'} leading-relaxed max-w-2xl`}>
                                            {n.message}
                                        </p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                <Clock size={14} />
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </div>
                                            {n.is_read && (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                                                    <CheckCircle2 size={14} />
                                                    Read
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                                    {n.link && (
                                        <Link
                                            href={n.link}
                                            onClick={() => markAsRead(n.id)}
                                            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                        >
                                            <ExternalLink size={14} />
                                            View Details
                                        </Link>
                                    )}
                                    {!n.is_read && (
                                        <button
                                            onClick={() => markAsRead(n.id)}
                                            className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {totalItems > itemsPerPage && (
                <div className="mt-8">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalItems / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={totalItems}
                    />
                </div>
            )}
        </DashboardLayout>
    );
}
