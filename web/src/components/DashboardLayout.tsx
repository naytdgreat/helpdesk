'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    Package,
    Monitor,
    Hammer,
    FileWarning,
    ClipboardList,
    Settings,
    LogOut,
    UserCircle,
    Building2,
    Users,

    Loader2,
    Bell,
    Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const SidebarItem = ({ icon: Icon, label, href, active = false }: any) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Link>
);

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, loading, signOut } = useAuth();

    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [showNotifications, setShowNotifications] = React.useState(false);

    React.useEffect(() => {
        if (profile?.id) {
            fetchNotifications();
            setupRealtimeSubscription();
            requestNotificationPermission();
        }
    }, [profile?.id]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    const role = profile?.role || 'IT_OFFICER';
    const hospitalName = profile?.hospitals?.name || 'Assigned Facility';



    async function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            await Notification.requestPermission();
        }
    }

    async function fetchNotifications() {
        if (!profile?.id) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10);

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }

    function setupRealtimeSubscription() {
        if (!profile?.id) return;

        const channel = supabase
            .channel('notifications_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                (payload) => {
                    const newNotification = payload.new;
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Trigger Browser Push Notification
                    if (Notification.permission === 'granted') {
                        new Notification('Helpdesk: ' + newNotification.title, {
                            body: newNotification.message,
                            icon: '/favicon.ico'
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    async function handleNotificationClick(notification: any) {
        if (!notification.is_read) {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notification.id);

            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setShowNotifications(false);
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4">
                <div className="flex items-center gap-3 px-2 mb-8">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Monitor className="text-white" size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Helpdesk</h1>
                </div>

                <nav className="flex-1 space-y-1">
                    <SidebarItem icon={LayoutDashboard} label="Overview" href="/" />
                    <SidebarItem icon={Package} label="Inventory" href="/inventory" />
                    <SidebarItem icon={Monitor} label="Desks" href="/desks" />
                    <SidebarItem icon={Hammer} label="Maintenance" href="/maintenance" />
                    <SidebarItem icon={FileWarning} label="Complaints" href="/complaints" />
                    <SidebarItem icon={ClipboardList} label="Requests" href="/requests" />

                    {['ADMIN', 'SUPER_ADMIN'].includes(role) && (
                        <div className="pt-4 mt-4 border-t border-slate-100">
                            <p className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Tools</p>
                            <SidebarItem icon={Building2} label="Manage Hierarchy" href="/admin/hierarchy" />
                            <SidebarItem icon={Users} label="Manage Users" href="/admin/users" />
                        </div>
                    )}
                </nav>

                <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            {role === 'SUPER_ADMIN' ? 'Super Admin Dashboard' : role === 'ADMIN' ? 'Facility Admin Dashboard' : 'IT Officer Dashboard'}
                        </h2>
                        {role === 'IT_OFFICER' && (
                            <p className="text-xs text-blue-600 font-bold uppercase">{hospitalName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all relative"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                            <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
                                            {unreadCount > 0 && (
                                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                                            )}
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-slate-500 text-sm">
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                <>
                                                    {notifications.map(notification => (
                                                        <Link
                                                            key={notification.id}
                                                            href={notification.link || '#'}
                                                            onClick={() => handleNotificationClick(notification)}
                                                            className={`block p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                                                                <div>
                                                                    <p className={`text-sm ${!notification.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                    <Link
                                                        href="/notifications"
                                                        onClick={() => setShowNotifications(false)}
                                                        className="block p-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 bg-slate-50/50 transition-colors"
                                                    >
                                                        See all notifications...
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-2xl">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900 line-clamp-1">{profile?.name || profile?.email?.split('@')[0] || 'User'}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{role}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                                <UserCircle className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
