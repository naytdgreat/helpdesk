import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, TextInput, ActivityIndicator, Modal } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import {
    LayoutDashboard,
    ScanLine,
    Package,
    Hammer,
    AlertTriangle,
    ChevronRight,
    Info,
    Network,
    Monitor,
    ClipboardList,
    Settings,
    LogOut,
    Building,
    Lock,
    Mail,
    ArrowRight,
    Shield,
    Loader2,
    Bell,
    Clock,
    History,
    User,
    MapPin,
    Plus,
    X,
    Save,
    Trash2,
    Archive,
    Calendar,
    ChevronLeft
} from 'lucide-react-native';
import { supabase } from './lib/supabase';
import { initDB, getDB } from './lib/db';
import { SyncService } from './lib/sync';
import Scanner from './components/Scanner';

// --- Auth Component ---

function LoginScreen({ onLogin }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            onLogin(data.session);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={[styles.drawerLogo, { width: 80, height: 80, borderRadius: 20 }]}>
                    <Shield color="#fff" size={48} />
                </View>
                <Text style={[styles.welcomeText, { marginTop: 16, fontSize: 28 }]}>Helpdesk</Text>
                <Text style={styles.subWelcome}>Authorized Personnel Portal</Text>
            </View>

            <View style={styles.menuList}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Mail color="#64748b" size={20} />
                    <TextInput
                        style={{ flex: 1, height: 40, fontSize: 16, color: '#0f172a' }}
                        placeholder="Email Address"
                        placeholderTextColor="#94a3b8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>
                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Lock color="#64748b" size={20} />
                    <TextInput
                        style={{ flex: 1, height: 40, fontSize: 16, color: '#0f172a' }}
                        placeholder="Password"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.scanActionCard, { marginTop: 12, opacity: loading ? 0.7 : 1 }]}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" style={{ flex: 1 }} />
                ) : (
                    <>
                        <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>Sign In</Text>
                        <ArrowRight color="#fff" size={24} />
                    </>
                )}
            </TouchableOpacity>
        </SafeAreaView>
    );
}

// --- App Navigation & Logic ---

function InventoryScreen({ navigation }: any) {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync(`
            SELECT d.*, c.name as category_name, o.name as office_name 
            FROM devices d 
            LEFT JOIN device_categories c ON d.category_id = c.id
            LEFT JOIN offices o ON d.office_id = o.id
            ORDER BY d.created_at DESC
        `);
        setDevices(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPadding}>
                <Text style={styles.sectionTitle}>Hardware Inventory</Text>
                <Text style={styles.subWelcome}>Track all registered assets ({devices.length})</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {devices.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No items synced yet.</Text></View>
                ) : (
                    devices.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('Overview', { screen: 'DeviceDetails', params: { device: item } })}
                        >
                            <View style={[styles.menuItemLeft, { flex: 1, paddingRight: 8 }]}>
                                <View style={styles.iconCircleSmall}>
                                    <Monitor color="#64748b" size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuLabel} numberOfLines={1} ellipsizeMode="tail">
                                        {item.brand} {item.model}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#475569', marginBottom: 2 }} numberOfLines={1}>
                                        {item.category_name || 'Asset'}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1} ellipsizeMode="tail">
                                        ID: {item.barcode}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1} ellipsizeMode="tail">
                                        {item.office_name || 'Main Store'}
                                    </Text>
                                </View>
                            </View>
                            <StatusBadge status={item.status} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function DesksScreen() {
    const [desks, setDesks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync(`
            SELECT d.*, o.name as office_name, w.name as wing_name
            FROM desks d
            LEFT JOIN offices o ON d.office_id = o.id
            LEFT JOIN wings w ON o.wing_id = w.id
            ORDER BY d.name ASC
        `);
        setDesks(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPadding}>
                <Text style={styles.sectionTitle}>Facility Desks</Text>
                <Text style={styles.subWelcome}>Deployment locations ({desks.length})</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {desks.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No desks found.</Text></View>
                ) : (
                    desks.map(desk => (
                        <View key={desk.id} style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={styles.iconCircleSmall}>
                                    <LayoutDashboard color="#64748b" size={20} />
                                </View>
                                <View>
                                    <Text style={styles.menuLabel}>{desk.name}</Text>
                                    <Text style={{ fontSize: 12, color: '#64748b' }}>{desk.wing_name} • {desk.office_name}</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: 'bold' }}>{desk.assigned_to_user || 'Unassigned'}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function MaintenanceScreen() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync(`
            SELECT l.*, d.brand, d.model, d.barcode
            FROM maintenance_logs l
            LEFT JOIN devices d ON l.device_id = d.id
            ORDER BY l.performed_at DESC
        `);
        setLogs(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPadding}>
                <Text style={styles.sectionTitle}>Maintenance Logs</Text>
                <Text style={styles.subWelcome}>Equipment repair history ({logs.length})</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {logs.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No recent logs.</Text></View>
                ) : (
                    logs.map(log => (
                        <View key={log.id} style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{log.brand} {log.model}</Text>
                                <Text style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(log.performed_at).toLocaleDateString()}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#64748b' }}>{log.description}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const StatusBadge = ({ status }: { status: string }) => {
    let bg = '#f1f5f9';
    let text = '#64748b';

    const s = status?.toLowerCase();

    if (s === 'good' || s === 'available' || s === 'resolved' || s === 'approved') {
        bg = '#dcfce7'; text = '#166534';
    } else if (s === 'faulty' || s === 'bad' || s === 'emergency' || s === 'rejected' || s === 'open' || s === 'scrapped') {
        bg = '#fee2e2'; text = '#991b1b';
    } else if (s === 'fair' || s === 'pending') {
        bg = '#ffedd5'; text = '#9a3412';
    } else if (s === 'in progress' || s === 'deployed' || s === 'in repair') {
        bg = '#fef9c3'; text = '#854d0e';
    } else if (s === 'archived' || s === 'disposal') {
        bg = '#f1f5f9'; text = '#64748b';
    }


    return (
        <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: text }}>{(status || 'N/A').toUpperCase()}</Text>
        </View>
    );
};

function ComplaintsScreen({ navigation }: any) {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync('SELECT * FROM complaints ORDER BY created_at DESC');
        setComplaints(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPadding}>
                <Text style={styles.sectionTitle}>User Complaints</Text>
                <Text style={styles.subWelcome}>Track reported faculty issues ({complaints.length})</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {complaints.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>All systems healthy.</Text></View>
                ) : (
                    complaints.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}
                            onPress={() => navigation.navigate('Overview', { screen: 'ComplaintDetails', params: { complaint: item } })}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.reporter_name}</Text>
                                <StatusBadge status={item.status} />
                            </View>
                            <Text style={{ fontSize: 12, color: '#3b82f6', marginBottom: 4, fontWeight: '600' }}>{item.category || 'Hardware'}</Text>
                            <Text style={{ fontSize: 14, color: '#64748b' }} numberOfLines={2}>{item.description}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    backgroundColor: '#ef4444', // Red for complaints/issues
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5
                }}
                onPress={() => navigation.navigate('Overview', { screen: 'NewComplaint' })}
            >
                <Plus color="#fff" size={32} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

function RequestsScreen({ navigation }: any) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync('SELECT * FROM requests ORDER BY created_at DESC');
        setRequests(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPadding}>
                <Text style={styles.sectionTitle}>Inventory Requests</Text>
                <Text style={styles.subWelcome}>Hardware request logbook ({requests.length})</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {requests.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No pending requests.</Text></View>
                ) : (
                    requests.map(item => (
                        <View key={item.id} style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.iconCircleSmall, { backgroundColor: '#e0f2fe' }]}>
                                        <Package color="#0284c7" size={18} />
                                    </View>
                                    <Text style={[styles.menuLabel, { fontSize: 16 }]}>{item.item_type} (x{item.quantity})</Text>
                                </View>
                                <StatusBadge status={item.status} />
                            </View>
                            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                "{item.reason}"
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                                <Text style={{ fontSize: 12, color: '#94a3b8' }}>By: {item.reporter_name}</Text>
                                <Text style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    backgroundColor: '#3b82f6',
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5
                }}
                onPress={() => navigation.navigate('Overview', { screen: 'NewRequest' })}
            >
                <Plus color="#fff" size={32} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC');
        setNotifications(results);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
        }, [fetchItems])
    );

    const markAllRead = async () => {
        const db = await getDB();
        await db.runAsync('UPDATE notifications SET is_read = 1');
        // Track change for sync
        SyncService.trackChange('UPDATE', 'notifications_all_read', { is_read: true });
        fetchItems();
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.headerPadding, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <Text style={styles.subWelcome}>Stay updated on system activity</Text>
                </View>
                <TouchableOpacity onPress={markAllRead}>
                    <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 12 }}>Mark all read</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {notifications.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No notifications.</Text></View>
                ) : (
                    notifications.map(n => (
                        <View key={n.id} style={[styles.menuItem, { opacity: n.is_read ? 0.6 : 1, flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />}
                                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{n.title}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#64748b' }}>{n.message}</Text>
                            <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>{new Date(n.created_at).toLocaleString()}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingsScreen() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [queueCount, setQueueCount] = useState(0);

    const fetchQueue = async () => {
        const db = await getDB();
        const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue');
        setQueueCount(result?.count || 0);
    };

    const fetchMetadata = async () => {
        const db = await getDB();
        const meta: any = await db.getFirstAsync("SELECT last_pulled_at FROM sync_metadata WHERE table_name = 'hospitals'");
        if (meta) setLastSync(new Date(meta.last_pulled_at).toLocaleString());
    };

    useEffect(() => {
        fetchMetadata();
        fetchQueue();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await SyncService.pushAll();
            await SyncService.pullAll();
            setLastSync(new Date().toLocaleString());
            fetchQueue();
            alert('Sync Successful!');
        } catch (error: any) {
            alert(`Sync Failed: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const clearQueue = async () => {
        const db = await getDB();
        await db.runAsync('DELETE FROM sync_queue');
        alert('Sync queue cleared.');
        fetchQueue();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>App Info</Text>
                <View style={styles.menuList}>
                    <MenuLink icon={Info} label="Version" count="1.1.0" />
                    <MenuLink icon={Network} label="Network Status" count="Auto-Sync Enabled" />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Synchronization</Text>
                <View style={[styles.infoCard, { marginBottom: 16 }]}>
                    <DetailItem label="Last Sync" value={lastSync || 'Never'} />
                    <View style={styles.divider} />
                    <DetailItem label="Pending Changes" value={queueCount.toString()} />
                </View>

                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: syncing ? '#94a3b8' : '#3b82f6', marginBottom: 12 }]}
                    onPress={handleSync}
                    disabled={syncing}
                >
                    {syncing ? (
                        <ActivityIndicator color="#fff" size="small" style={{ flex: 1 }} />
                    ) : (
                        <>
                            <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>Force Manual Sync</Text>
                            <ArrowRight color="#fff" size={24} />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#ef4444', height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center' }]}
                    onPress={clearQueue}
                >
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>Clear Sync Queue</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center', marginBottom: 20 }}>
                    Warning: Use this only if synchronization is stuck. It will delete all unsynced local changes.
                </Text>


                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ef4444', height: 48, borderRadius: 12, justifyContent: 'center' }]}
                    onPress={async () => {
                        if (syncing) return;
                        setSyncing(true);
                        try {
                            const db = await getDB();
                            // Clear all data
                            await db.runAsync('DELETE FROM sync_queue');
                            await db.runAsync('DELETE FROM maintenance_logs');
                            await db.runAsync('DELETE FROM deployment_logs');
                            await db.runAsync('DELETE FROM devices');
                            await db.runAsync('DELETE FROM complaints');
                            await db.runAsync('DELETE FROM requests');
                            await db.runAsync('DELETE FROM notifications');
                            await db.runAsync('DELETE FROM profiles');
                            // Re-init by pulling
                            await SyncService.pullAll();
                            fetchQueue();
                            alert('Local data reset complete.');
                        } catch (e: any) {
                            alert('Error resetting: ' + e.message);
                        } finally {
                            setSyncing(false);
                            fetchQueue();
                        }
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Reset Local Data (Hard Resync)</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                    Deletes ALL local data and re-downloads from server. Use if data is mismatched.
                </Text>

            </ScrollView>
        </SafeAreaView>
    );
}

function HomeScreen({ navigation }: any) {
    const [stats, setStats] = useState({ inventory: 0, issues: 0, maintenance: 0 });

    const fetchStats = useCallback(async () => {
        const db = await getDB();
        const invCount: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM devices');
        const issueCount: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM complaints WHERE status != 'Resolved'");
        const maintCount: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM maintenance_logs');

        setStats({
            inventory: invCount?.count || 0,
            issues: issueCount?.count || 0,
            maintenance: maintCount?.count || 0
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [fetchStats])
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.welcomeText}>Helpdesk</Text>
                        <Text style={styles.subWelcome}>IT Department Portal</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.openDrawer()}
                        style={styles.avatarPlaceholder}
                    >
                        <LayoutDashboard color="#fff" size={24} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.scanActionCard}
                    onPress={() => navigation.navigate('Scanner')}
                >
                    <View style={styles.iconCircleLarge}>
                        <ScanLine color="#fff" size={32} />
                    </View>
                    <View style={{ marginLeft: 20, flex: 1 }}>
                        <Text style={styles.cardTitleWhite}>Quick Scan</Text>
                        <Text style={styles.cardSubWhite}>Deploy or Verify Asset</Text>
                    </View>
                    <ChevronRight color="rgba(255,255,255,0.6)" size={24} />
                </TouchableOpacity>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Package color="#3b82f6" size={20} />
                        <Text style={styles.statValue}>{stats.inventory}</Text>
                        <Text style={styles.statLabel}>Total Assets</Text>
                    </View>
                    <View style={styles.statBox}>
                        <AlertTriangle color="#f59e0b" size={20} />
                        <Text style={styles.statValue}>{stats.issues}</Text>
                        <Text style={styles.statLabel}>Open Issues</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Operations</Text>
                <View style={styles.menuList}>
                    <MenuLink
                        icon={Package}
                        label="Inventory"
                        count={stats.inventory.toString()}
                        onPress={() => navigation.navigate('Inventory')}
                    />
                    <MenuLink
                        icon={AlertTriangle}
                        label="Complaints"
                        count={stats.issues.toString()}
                        onPress={() => navigation.navigate('Complaints')}
                    />
                    <MenuLink
                        icon={Hammer}
                        label="Maintenance"
                        count={stats.maintenance.toString()}
                        onPress={() => navigation.navigate('Maintenance')}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.1.0 • Helpdesk Portal</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuLink({ icon: Icon, label, count, onPress }: any) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuItemLeft}>
                <View style={styles.iconCircleSmall}>
                    <Icon color="#64748b" size={20} />
                </View>
                <Text style={styles.menuLabel}>{label}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {count && <Text style={styles.menuCount}>{count}</Text>}
                <ChevronRight color="#cbd5e1" size={18} />
            </View>
        </TouchableOpacity>
    );
}

function ScannerScreen({ navigation }: any) {
    const handleScan = (data: string) => {
        navigation.navigate('DeviceDetails', { barcode: data });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Scanner onScan={handleScan} />
        </View>
    );
}

function DeviceDetailsScreen({ route, navigation }: any) {
    const { barcode, device: paramDevice } = route.params || {};
    // Prioritize barcode from scanner, otherwise use device.barcode from Inventory
    const searchBarcode = barcode || paramDevice?.barcode;
    // Initialize with paramDevice if available to prevent flicker
    const [device, setDevice] = useState<any>(paramDevice || null);
    const [loading, setLoading] = useState(!paramDevice);

    useEffect(() => {
        const fetchDevice = async () => {
            if (!searchBarcode) return;

            const db = await getDB();
            const result: any = await db.getFirstAsync(`
                SELECT d.*, c.name as category_name, o.name as office_name, h.name as facility_name
                FROM devices d
                LEFT JOIN device_categories c ON d.category_id = c.id
                LEFT JOIN offices o ON d.office_id = o.id
                LEFT JOIN hospitals h ON d.hospital_id = h.id
                WHERE d.barcode = ?
            `, [searchBarcode]);

            if (result) {
                setDevice(result);
            }
            setLoading(false);
        };
        fetchDevice();
    }, [searchBarcode]);

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    if (!device) {
        return (
            <View style={styles.center}>
                <AlertTriangle color="#ef4444" size={48} />
                <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>Asset Not Found</Text>
                <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>The barcode {barcode} is not registered in our local database.</Text>
                <TouchableOpacity
                    style={[styles.actionBtn, { marginTop: 24, width: '100%', borderColor: '#3b82f6' }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: '#3b82f6', fontWeight: 'bold', textAlign: 'center' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.detailsHeader}>
                    <StatusBadge status={device.status} />
                    <Text style={styles.detailsTitle}>{device.brand} {device.model}</Text>
                    <Text style={styles.detailsSubTitle}>{device.category_name} • Tag: {barcode}</Text>
                </View>

                <View style={styles.infoCard}>
                    <DetailItem label="Asset Tag" value={device.barcode || barcode} />
                    <View style={styles.divider} />
                    <DetailItem label="Serial Number" value={device.serial_number || 'N/A'} />
                    <View style={styles.divider} />
                    <DetailItem label="Facility" value={device.facility_name || 'Group Central'} />
                    <View style={styles.divider} />
                    <DetailItem label="Current Location" value={device.office_name || 'IT Central Store'} />
                    <View style={styles.divider} />
                    <DetailItem label="IP Address" value={device.ip_address || 'N/A'} />
                    <View style={styles.divider} />
                    <DetailItem label="MAC Address" value={device.mac_address || 'N/A'} />
                </View>

                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionGrid}>
                    <ActionButton
                        label="Log Maintenance"
                        color="#3b82f6"
                        onPress={() => navigation.navigate('LogMaintenance', { device })}
                    />
                    <ActionButton
                        label="Deploy Asset"
                        color="#06b6d4"
                        onPress={() => navigation.navigate('DeployAsset', { device })}
                    />
                    <ActionButton
                        label="Maintenance History"
                        color="#6366f1"
                        onPress={() => navigation.navigate('MaintenanceHistory', { deviceId: device.id })}
                    />
                    <ActionButton
                        label="Deploy History"
                        color="#10b981"
                        onPress={() => navigation.navigate('DeploymentHistory', { deviceId: device.id })}
                    />
                    <ActionButton
                        label="Retrieve Device"
                        color="#8b5cf6"
                        onPress={async () => {
                            const db = await getDB();
                            const now = new Date().toISOString();

                            // Reset to Available/Good and clear location
                            await db.runAsync(
                                'UPDATE devices SET deployment_status = ?, status = ?, desk_id = NULL, office_id = NULL WHERE id = ?',
                                ['Available', 'Good', device.id]
                            );

                            // Track device update
                            await SyncService.trackChange('UPDATE', 'devices', {
                                id: device.id,
                                deployment_status: 'Available',
                                status: 'Good',
                                desk_id: null,
                                office_id: null
                            });

                            // Log check-in
                            const logId = generateUUID();
                            const logEntry = {
                                id: logId,
                                device_id: device.id,
                                type: 'CheckIn',
                                status: 'Available',
                                hospital_id: device.hospital_id,
                                performed_at: now
                            };

                            await db.runAsync(
                                'INSERT INTO deployment_logs (id, device_id, type, status, hospital_id, performed_at) VALUES (?, ?, ?, ?, ?, ?)',
                                [logEntry.id, logEntry.device_id, logEntry.type, logEntry.status, logEntry.hospital_id, logEntry.performed_at]
                            );

                            await SyncService.trackChange('INSERT', 'deployment_logs', logEntry);

                            alert('Device retrieved to store.');
                            navigation.goBack();
                        }}
                    />
                    <ActionButton
                        label="Move to Archive"
                        color="#f59e0b"
                        onPress={async () => {
                            const db = await getDB();
                            const now = new Date().toISOString();
                            const payload = {
                                id: device.id,
                                status: 'Archived', // Archive usually maps to a status or we just keep it Good
                                deployment_status: 'Archived',
                                desk_id: null,
                                office_id: null
                            };
                            // In the web app, archive sets physical_condition to the selected value. 
                            // Let's use 'Good' or the current one for 'status' column to be safe.
                            await db.runAsync('UPDATE devices SET deployment_status = ?, status = ?, desk_id = NULL, office_id = NULL WHERE id = ?', ['Archived', 'Good', device.id]);
                            await SyncService.trackChange('UPDATE', 'devices', { ...payload, status: 'Good' });
                            // Log it
                            const logEntry = {
                                id: generateUUID(),
                                device_id: device.id,
                                type: 'Archive',
                                status: 'Archived',
                                hospital_id: device.hospital_id,
                                performed_at: now
                            };
                            await db.runAsync('INSERT INTO deployment_logs (id, device_id, type, status, hospital_id, performed_at) VALUES (?, ?, ?, ?, ?, ?)', [logEntry.id, logEntry.device_id, logEntry.type, logEntry.status, logEntry.hospital_id, logEntry.performed_at]);
                            await SyncService.trackChange('INSERT', 'deployment_logs', logEntry);
                            alert('Device archived.');
                            navigation.goBack();
                        }}
                    />
                    <ActionButton
                        label="Edit Details"
                        color="#64748b"
                        onPress={() => navigation.navigate('EditDevice', { device })}
                    />
                    <ActionButton
                        label="Delete Asset"
                        color="#ef4444"
                        onPress={async () => {
                            const db = await getDB();
                            await db.runAsync('DELETE FROM devices WHERE id = ?', [device.id]);
                            await SyncService.trackChange('DELETE', 'devices', { id: device.id });
                            alert('Asset deleted.');
                            navigation.goBack();
                        }}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MaintenanceHistoryScreen({ route }: any) {
    const { deviceId } = route.params;
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync(
            'SELECT * FROM maintenance_logs WHERE device_id = ? ORDER BY performed_at DESC',
            [deviceId]
        );
        setLogs(results);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [deviceId]);

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {logs.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No maintenance history.</Text></View>
                ) : (
                    logs.map(log => (
                        <View key={log.id} style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{log.performer_name || 'Staff'}</Text>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>{log.performed_at ? new Date(log.performed_at).toLocaleDateString() : 'Unknown date'}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#64748b' }}>{log.description}</Text>
                            {log.parts_replaced && <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Parts: {log.parts_replaced}</Text>}
                            <View style={{ marginTop: 8 }}>
                                <StatusBadge status={log.update_condition || 'Good'} />
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function DeploymentHistoryScreen({ route }: any) {
    const { deviceId } = route.params;
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        const db = await getDB();
        const results: any[] = await db.getAllAsync(`
            SELECT l.*, h.name as facility_name, o.name as office_name, d.name as desk_name
            FROM deployment_logs l
            LEFT JOIN hospitals h ON l.hospital_id = h.id
            LEFT JOIN offices o ON l.office_id = o.id
            LEFT JOIN desks d ON l.desk_id = d.id
            WHERE l.device_id = ?
            ORDER BY l.performed_at DESC
        `, [deviceId]);
        setLogs(results);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [deviceId]);

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {logs.length === 0 ? (
                    <View style={styles.center}><Text style={{ color: '#94a3b8' }}>No deployment history.</Text></View>
                ) : (
                    logs.map(log => (
                        <View key={log.id} style={[styles.menuItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{log.type}</Text>
                                <Text style={{ fontSize: 12, color: '#64748b' }}>{log.performed_at ? new Date(log.performed_at).toLocaleDateString() : 'Unknown date'}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#64748b' }}>Status: {log.status}</Text>
                            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Location: {log.facility_name || 'N/A'} {log.office_name ? `• ${log.office_name}` : ''} {log.desk_name ? `• ${log.desk_name}` : ''}
                            </Text>
                            {log.notes && <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Notes: {log.notes}</Text>}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function LogMaintenanceScreen({ route, navigation }: any) {
    const { device } = route.params;
    const [description, setDescription] = useState('');
    const [partsReplaced, setPartsReplaced] = useState('');
    const [performerType, setPerformerType] = useState<'Staff' | 'Vendor'>('Staff');
    const [performerName, setPerformerName] = useState('');
    const [updateCondition, setUpdateCondition] = useState(device.physical_condition || 'Good');
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        if (!description) {
            alert('Please enter a description');
            return;
        }
        setSubmitting(true);
        try {
            const db = await getDB();
            const logId = generateUUID();
            const now = new Date().toISOString();
            // Get current session for it_officer_id
            const { data: { session } } = await supabase.auth.getSession();

            const payload = {
                id: logId,
                device_id: device.id,
                it_officer_id: session?.user?.id || null,
                performer_type: performerType,
                performer_name: performerName || (performerType === 'Staff' ? (session?.user?.email || 'Internal Staff') : 'External Vendor'),
                description,
                parts_replaced: partsReplaced,
                update_condition: updateCondition,
                performed_at: now
            };

            await db.runAsync(`
                INSERT INTO maintenance_logs (id, device_id, it_officer_id, performer_type, performer_name, description, parts_replaced, update_condition, performed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [payload.id, payload.device_id, payload.it_officer_id, payload.performer_type, payload.performer_name, payload.description, payload.parts_replaced, payload.update_condition, payload.performed_at]);

            await db.runAsync(`
                UPDATE devices 
                SET physical_condition = ?, status = ? 
                WHERE id = ?
            `, [updateCondition, updateCondition, device.id]);

            await SyncService.trackChange('INSERT', 'maintenance_logs', payload);
            await SyncService.trackChange('UPDATE', 'devices', {
                id: device.id,
                physical_condition: updateCondition,
                status: updateCondition
            });

            alert('Maintenance logged successfully!');
            navigation.goBack();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>Log Maintenance Activity</Text>

                <Text style={styles.inputLabel}>Performer Type</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {['Staff', 'Vendor'].map((t: any) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setPerformerType(t)}
                            style={[styles.choiceBtn, performerType === t && styles.choiceBtnActive]}
                        >
                            <Text style={[styles.choiceText, performerType === t && styles.choiceTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    placeholder="Performer Name (e.g. John Doe)"
                    style={styles.input}
                    value={performerName}
                    onChangeText={setPerformerName}
                />

                <TextInput
                    placeholder="What work was performed? (required)"
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                />

                <TextInput
                    placeholder="Parts Replaced (Optional)"
                    style={styles.input}
                    value={partsReplaced}
                    onChangeText={setPartsReplaced}
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Update Device Condition</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {['Good', 'Fair', 'Faulty', 'In Repair', 'Scrapped'].map((c: any) => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setUpdateCondition(c)}
                            style={[styles.choiceBtn, updateCondition === c && styles.choiceBtnActive]}
                        >
                            <Text style={[styles.choiceText, updateCondition === c && styles.choiceTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>


                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: submitting ? '#94a3b8' : '#3b82f6' }]}
                    onPress={handleSave}
                    disabled={submitting}
                >
                    <Text style={[styles.cardTitleWhite, { textAlign: 'center', flex: 1 }]}>
                        {submitting ? 'Saving Log...' : 'Submit Log Entry'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function DeployAssetScreen({ route, navigation }: any) {
    const { device } = route.params;
    const [wings, setWings] = useState<any[]>([]);
    const [offices, setOffices] = useState<any[]>([]);
    const [desks, setDesks] = useState<any[]>([]);

    const [selectedWing, setSelectedWing] = useState('');
    const [selectedOffice, setSelectedOffice] = useState('');
    const [selectedDesk, setSelectedDesk] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const db = await getDB();
            const wingList: any[] = await db.getAllAsync('SELECT * FROM wings WHERE hospital_id = ? ORDER BY name', [device.hospital_id]);
            setWings(wingList);

            // Fetch open requests
            const requestList: any[] = await db.getAllAsync("SELECT * FROM requests WHERE status = 'Open' ORDER BY created_at ASC");
            setRequests(requestList);

            setLoading(false);
        };
        fetchData();
    }, [device.hospital_id]);

    const handleWingSelect = async (wingId: string) => {
        setSelectedWing(wingId);
        setSelectedOffice('');
        setSelectedDesk('');
        const db = await getDB();
        const officeList: any[] = await db.getAllAsync('SELECT * FROM offices WHERE wing_id = ? ORDER BY name', [wingId]);
        setOffices(officeList);
    };

    const handleOfficeSelect = async (officeId: string) => {
        setSelectedOffice(officeId);
        setSelectedDesk('');
        const db = await getDB();
        const deskList: any[] = await db.getAllAsync('SELECT * FROM desks WHERE office_id = ? ORDER BY name', [officeId]);
        setDesks(deskList);
    };

    const handleDeploy = async () => {
        if (!selectedDesk) {
            alert('Please select a desk');
            return;
        }
        setSubmitting(true);
        try {
            const db = await getDB();
            const logId = generateUUID();
            const now = new Date().toISOString();
            const { data: { session } } = await supabase.auth.getSession();

            const payload = {
                id: logId,
                device_id: device.id,
                type: 'Deploy',
                status: 'Deployed',
                hospital_id: device.hospital_id,
                office_id: selectedOffice,
                desk_id: selectedDesk,
                performer_id: session?.user?.id || null,
                notes: selectedRequest ? `Fulfilled Request: ${selectedRequest} \n ${notes}` : notes,
                performed_at: now
            };

            await db.runAsync(
                'UPDATE devices SET desk_id = ?, office_id = ?, deployment_status = ? WHERE id = ?',
                [selectedDesk, selectedOffice, 'Deployed', device.id]
            );

            await db.runAsync(`
                INSERT INTO deployment_logs (id, device_id, type, status, hospital_id, office_id, desk_id, performer_id, notes, performed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [payload.id, payload.device_id, payload.type, payload.status, payload.hospital_id, payload.office_id, payload.desk_id, payload.performer_id, payload.notes, payload.performed_at]);

            await SyncService.trackChange('UPDATE', 'devices', {
                id: device.id,
                desk_id: selectedDesk,
                office_id: selectedOffice,
                deployment_status: 'Deployed',
                status: 'Good'
            });

            await SyncService.trackChange('INSERT', 'deployment_logs', payload);

            // Close the request if one was linked
            if (selectedRequest) {
                // First find the request ID (using a basic assumption here since we only stored the "Reason" or title in UI)
                // A better UI would value=id, label=text. Let's assume selectedRequest is the ID.
                await db.runAsync("UPDATE requests SET status = 'Completed', updated_at = ? WHERE id = ?", [now, selectedRequest]);
                await SyncService.trackChange('UPDATE', 'requests', { id: selectedRequest, status: 'Completed' });
            }

            alert('Asset deployed successfully!');
            navigation.popToTop();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>Deploy Asset</Text>
                <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>{device.brand} {device.model} ({device.barcode})</Text>

                <Text style={styles.inputLabel}>Link to Request (Optional)</Text>
                {requests.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 24 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedRequest('')}
                            style={[styles.choiceBtn, selectedRequest === '' && styles.choiceBtnActive]}
                        >
                            <Text style={[styles.choiceText, selectedRequest === '' && styles.choiceTextActive]}>None</Text>
                        </TouchableOpacity>
                        {requests.map(req => (
                            <TouchableOpacity
                                key={req.id}
                                onPress={() => setSelectedRequest(req.id)}
                                style={[styles.choiceBtn, selectedRequest === req.id && styles.choiceBtnActive]}
                            >
                                <Text style={[styles.choiceText, selectedRequest === req.id && styles.choiceTextActive]}>
                                    {req.item_type} ({req.reporter_name})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <Text style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 24 }}>No open requests available.</Text>
                )}

                <Text style={styles.inputLabel}>Select Wing</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                    {wings.map(wing => (
                        <TouchableOpacity
                            key={wing.id}
                            onPress={() => handleWingSelect(wing.id)}
                            style={[styles.choiceBtn, selectedWing === wing.id && styles.choiceBtnActive]}
                        >
                            <Text style={[styles.choiceText, selectedWing === wing.id && styles.choiceTextActive]}>{wing.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {selectedWing ? (
                    <>
                        <Text style={styles.inputLabel}>Select Office</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                            {offices.map(off => (
                                <TouchableOpacity
                                    key={off.id}
                                    onPress={() => handleOfficeSelect(off.id)}
                                    style={[styles.choiceBtn, selectedOffice === off.id && styles.choiceBtnActive]}
                                >
                                    <Text style={[styles.choiceText, selectedOffice === off.id && styles.choiceTextActive]}>{off.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : null}

                {selectedOffice ? (
                    <>
                        <Text style={styles.inputLabel}>Select Desk</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                            {desks.map(desk => (
                                <TouchableOpacity
                                    key={desk.id}
                                    onPress={() => setSelectedDesk(desk.id)}
                                    style={[styles.choiceBtn, selectedDesk === desk.id && styles.choiceBtnActive]}
                                >
                                    <Text style={[styles.choiceText, selectedDesk === desk.id && styles.choiceTextActive]}>{desk.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : null}

                <TextInput
                    placeholder="Deployment Notes (Optional)"
                    style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 16 }]}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                />

                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: (!selectedDesk || submitting) ? '#94a3b8' : '#3b82f6', marginTop: 16 }]}
                    onPress={handleDeploy}
                    disabled={!selectedDesk || submitting}
                >
                    <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>
                        {submitting ? 'Processing...' : 'Complete Deployment'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function EditDeviceScreen({ route, navigation }: any) {
    const { device } = route.params;
    const [brand, setBrand] = useState(device.brand || '');
    const [model, setModel] = useState(device.model || '');
    const [serial, setSerial] = useState(device.serial_number || '');
    const [ip, setIp] = useState(device.ip_address || '');
    const [mac, setMac] = useState(device.mac_address || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const db = await getDB();
            const payload = {
                id: device.id,
                brand,
                model,
                serial_number: serial,
                ip_address: ip,
                mac_address: mac
            };

            await db.runAsync(
                'UPDATE devices SET brand = ?, model = ?, serial_number = ?, ip_address = ?, mac_address = ? WHERE id = ?',
                [brand, model, serial, ip, mac, device.id]
            );

            await SyncService.trackChange('UPDATE', 'devices', payload);

            alert('Details updated successfully!');
            navigation.goBack();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>Edit Asset Details</Text>

                <Text style={styles.inputLabel}>Brand</Text>
                <TextInput style={styles.input} value={brand} onChangeText={setBrand} />

                <Text style={styles.inputLabel}>Model</Text>
                <TextInput style={styles.input} value={model} onChangeText={setModel} />

                <Text style={styles.inputLabel}>Serial Number</Text>
                <TextInput style={styles.input} value={serial} onChangeText={setSerial} />

                <Text style={styles.inputLabel}>IP Address</Text>
                <TextInput style={styles.input} value={ip} onChangeText={setIp} />

                <Text style={styles.inputLabel}>MAC Address</Text>
                <TextInput style={styles.input} value={mac} onChangeText={setMac} />

                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: submitting ? '#94a3b8' : '#3b82f6', marginTop: 16 }]}
                    onPress={handleSave}
                    disabled={submitting}
                >
                    <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}


const DetailItem = ({ label, value }: any) => (
    <View style={styles.detailRow}>
        <View>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const ActionButton = ({ label, color, onPress }: any) => (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress}>
        <Text style={{ color, fontWeight: 'bold', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
);

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function NewRequestScreen({ navigation }: any) {
    const [itemType, setItemType] = useState('Laptop');
    const [quantity, setQuantity] = useState('1');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason) {
            alert('Please provide a reason for the request');
            return;
        }
        setSubmitting(true);
        try {
            const db = await getDB();
            const { data: { session } } = await supabase.auth.getSession();
            const now = new Date().toISOString();

            const newRequest = {
                id: generateUUID(),
                item_type: itemType,
                quantity: parseInt(quantity) || 1,
                reason,
                status: 'Open',
                urgency: 'Medium',
                reporter_name: session?.user?.email?.split('@')[0] || 'Unknown',
                created_at: now
            };

            await db.runAsync(
                'INSERT INTO requests (id, item_type, quantity, reason, status, urgency, reporter_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [newRequest.id, newRequest.item_type, newRequest.quantity, newRequest.reason, newRequest.status, newRequest.urgency, newRequest.reporter_name, newRequest.created_at]
            );

            await SyncService.trackChange('INSERT', 'requests', newRequest);

            alert('Request logged successfully');
            navigation.goBack();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>New Hardware Request</Text>

                <Text style={styles.inputLabel}>Item Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Printer', 'Other'].map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.choiceBtn, itemType === t && styles.choiceBtnActive]}
                            onPress={() => setItemType(t)}
                        >
                            <Text style={[styles.choiceText, itemType === t && styles.choiceTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Reason / Justification</Text>
                <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    placeholder="Why is this item needed?"
                    placeholderTextColor="#cbd5e1"
                />

                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: submitting ? '#94a3b8' : '#3b82f6' }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}


function NewComplaintScreen({ navigation }: any) {
    const [reporterName, setReporterName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Hardware');
    const [submitting, setSubmitting] = useState(false);

    // Selection State
    const [devices, setDevices] = useState<any[]>([]);
    const [desks, setDesks] = useState<any[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<any>(null);
    const [selectedDesk, setSelectedDesk] = useState<any>(null);

    // Modals
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [showDeskModal, setShowDeskModal] = useState(false);

    useEffect(() => {
        (async () => {
            const db = await getDB();
            const { data: { session } } = await supabase.auth.getSession();
            // Auto-fill reporter name if possible or leave blank
            if (session?.user?.email) {
                setReporterName(session.user.email.split('@')[0]);
            }

            const devList: any[] = await db.getAllAsync('SELECT * FROM devices ORDER BY barcode ASC');
            setDevices(devList);

            const deskList: any[] = await db.getAllAsync('SELECT * FROM desks ORDER BY name ASC');
            setDesks(deskList);
        })();
    }, []);

    const handleSubmit = async () => {
        if (!reporterName || !description) {
            alert('Please fill in Reporter Name and Description');
            return;
        }
        setSubmitting(true);
        try {
            const db = await getDB();
            const { data: { session } } = await supabase.auth.getSession();
            const now = new Date().toISOString();

            const newComplaint = {
                id: generateUUID(),
                reporter_name: reporterName,
                description,
                category,
                status: 'Open',
                device_id: selectedDevice ? selectedDevice.id : null,
                desk_id: selectedDesk ? selectedDesk.id : null,
                created_at: now
            };

            // Attempt insert - relying on schema matching. If columns missing, this will fail (and alert).
            await db.runAsync(
                'INSERT INTO complaints (id, reporter_name, description, category, status, device_id, desk_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [newComplaint.id, newComplaint.reporter_name, newComplaint.description, newComplaint.category, newComplaint.status, newComplaint.device_id, newComplaint.desk_id, newComplaint.created_at]
            );

            await SyncService.trackChange('INSERT', 'complaints', newComplaint);

            alert('Complaint logged successfully');
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            alert('Error: ' + error.message + ' (Schema mismatch?)');
        } finally {
            setSubmitting(false);
        }
    };

    const renderSelectionModal = (visible: boolean, onClose: () => void, title: string, items: any[], onSelect: (item: any) => void, displayKey: (item: any) => string) => (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><X color="#64748b" /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <TouchableOpacity
                        style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8 }}
                        onPress={() => { onSelect(null); onClose(); }}
                    >
                        <Text style={{ color: '#64748b', fontStyle: 'italic' }}>None</Text>
                    </TouchableOpacity>
                    {items.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 }}
                            onPress={() => { onSelect(item); onClose(); }}
                        >
                            <Text style={{ color: '#0f172a' }}>{displayKey(item)}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>Log New Complaint</Text>

                <Text style={styles.inputLabel}>Reporter Name</Text>
                <TextInput
                    style={styles.input}
                    value={reporterName}
                    onChangeText={setReporterName}
                    placeholder="e.g. Staff Name"
                    placeholderTextColor="#cbd5e1"
                />

                <Text style={styles.inputLabel}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {['Hardware', 'Software', 'Network', 'Other'].map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.choiceBtn, category === c && styles.choiceBtnActive]}
                            onPress={() => setCategory(c)}
                        >
                            <Text style={[styles.choiceText, category === c && styles.choiceTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.inputLabel}>Description of Issue</Text>
                <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Describe the problem in detail..."
                    placeholderTextColor="#cbd5e1"
                />

                <View style={[styles.infoCard, { marginBottom: 24 }]}>
                    <Text style={[styles.inputLabel, { marginTop: 0 }]}>Link to Device (Optional)</Text>
                    <TouchableOpacity
                        style={{ padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, marginTop: 8 }}
                        onPress={() => setShowDeviceModal(true)}
                    >
                        <Text style={{ color: selectedDevice ? '#0f172a' : '#94a3b8' }}>
                            {selectedDevice ? `${selectedDevice.brand} ${selectedDevice.model} (${selectedDevice.barcode})` : 'No Device Linked'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>Link to Desk (Optional)</Text>
                    <TouchableOpacity
                        style={{ padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, marginTop: 8 }}
                        onPress={() => setShowDeskModal(true)}
                    >
                        <Text style={{ color: selectedDesk ? '#0f172a' : '#94a3b8' }}>
                            {selectedDesk ? selectedDesk.name : 'No Desk Linked'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.scanActionCard, { backgroundColor: submitting ? '#94a3b8' : '#ef4444' }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={[styles.cardTitleWhite, { flex: 1, textAlign: 'center' }]}>
                        {submitting ? 'Submitting...' : 'Log Complaint'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {renderSelectionModal(
                showDeviceModal,
                () => setShowDeviceModal(false),
                "Select Device",
                devices,
                setSelectedDevice,
                (item) => `${item.brand} ${item.model} (${item.barcode})`
            )}

            {renderSelectionModal(
                showDeskModal,
                () => setShowDeskModal(false),
                "Select Desk",
                desks,
                setSelectedDesk,
                (item) => item.name
            )}
        </SafeAreaView>
    );
}

function ComplaintDetailsScreen({ route, navigation }: any) {
    const { complaint: paramComplaint } = route.params;
    const [complaint, setComplaint] = useState(paramComplaint);
    const [linkedDevice, setLinkedDevice] = useState<any>(null);
    const [linkedDesk, setLinkedDesk] = useState<any>(null);
    const [assignedUser, setAssignedUser] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    // Assign Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const db = await getDB();
            if (complaint.device_id) {
                const dev = await db.getFirstAsync('SELECT * FROM devices WHERE id = ?', [complaint.device_id]);
                setLinkedDevice(dev);
            }
            if (complaint.desk_id) {
                const dsk = await db.getFirstAsync('SELECT * FROM desks WHERE id = ?', [complaint.desk_id]);
                setLinkedDesk(dsk);
            }
            if (complaint.assigned_to_id) {
                const usr = await db.getFirstAsync('SELECT * FROM profiles WHERE id = ?', [complaint.assigned_to_id]);
                setAssignedUser(usr);
            }

            // Fetch users for assignment
            const userList: any[] = await db.getAllAsync("SELECT * FROM profiles WHERE role IN ('ADMIN', 'IT_OFFICER') ORDER BY name ASC");
            setUsers(userList);
        })();
    }, []);

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const db = await getDB();
            // Removed updated_at
            await db.runAsync('UPDATE complaints SET status = ? WHERE id = ?', [newStatus, complaint.id]);
            await SyncService.trackChange('UPDATE', 'complaints', { id: complaint.id, status: newStatus });

            setComplaint({ ...complaint, status: newStatus });
            alert(`Status updated to ${newStatus}`);
        } catch (e: any) {
            alert('Update failed: ' + e.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleAssignUser = async (user: any) => {
        setUpdating(true);
        try {
            const db = await getDB();
            const userId = user ? user.id : null;
            await db.runAsync('UPDATE complaints SET assigned_to_id = ? WHERE id = ?', [userId, complaint.id]);
            await SyncService.trackChange('UPDATE', 'complaints', { id: complaint.id, assigned_to_id: userId });

            setAssignedUser(user);
            setShowAssignModal(false);
            alert(user ? `Assigned to ${user.name}` : 'Unassigned');
        } catch (e: any) {
            alert('Assignment failed: ' + e.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (updating) return;
        setUpdating(true);
        try {
            const db = await getDB();
            await db.runAsync('DELETE FROM complaints WHERE id = ?', [complaint.id]);
            await SyncService.trackChange('DELETE', 'complaints', { id: complaint.id });
            alert('Complaint deleted');
            navigation.goBack();
        } catch (e: any) {
            alert('Delete failed: ' + e.message);
            setUpdating(false);
        }
    };

    const renderSelectionModal = (visible: boolean, onClose: () => void, title: string, items: any[], onSelect: (item: any) => void) => (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><X color="#64748b" /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <TouchableOpacity
                        style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8 }}
                        onPress={() => onSelect(null)}
                    >
                        <Text style={{ color: '#64748b', fontStyle: 'italic' }}>Unassign</Text>
                    </TouchableOpacity>
                    {items.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 }}
                            onPress={() => onSelect(item)}
                        >
                            <Text style={{ color: '#0f172a' }}>{item.name} ({item.role})</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.detailsTitle}>{complaint.reporter_name}</Text>
                        <Text style={[styles.detailsSubTitle, { color: '#3b82f6', fontWeight: 'bold' }]}>{complaint.category || 'Hardware'}</Text>
                    </View>
                    <StatusBadge status={complaint.status} />
                </View>

                <View style={styles.infoCard}>
                    <DetailItem label="Date Reported" value={new Date(complaint.created_at).toLocaleString()} />
                    <View style={styles.divider} />
                    <DetailItem label="Description" value={complaint.description} />

                    {linkedDevice && (
                        <>
                            <View style={styles.divider} />
                            <DetailItem label="Linked Device" value={`${linkedDevice.brand} ${linkedDevice.model} (${linkedDevice.barcode})`} />
                        </>
                    )}

                    {linkedDesk && (
                        <>
                            <View style={styles.divider} />
                            <DetailItem label="Linked Desk" value={linkedDesk.name} />
                        </>
                    )}

                    {assignedUser && (
                        <>
                            <View style={styles.divider} />
                            <DetailItem label="Assigned To" value={assignedUser.name} />
                        </>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionGrid}>
                    <ActionButton label="Open" color="#64748b" onPress={() => handleUpdateStatus('Open')} />
                    <ActionButton label="In Progress" color="#f59e0b" onPress={() => handleUpdateStatus('In Progress')} />
                    <ActionButton label="Resolved" color="#10b981" onPress={() => handleUpdateStatus('Resolved')} />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#8b5cf6', padding: 16, borderRadius: 12, alignItems: 'center' }}
                        onPress={() => setShowAssignModal(true)}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Assign User</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center' }}
                        onPress={handleDelete}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Complaint</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
            {renderSelectionModal(showAssignModal, () => setShowAssignModal(false), "Assign User", users, handleAssignUser)}
        </SafeAreaView>
    );
}

function HomeStack() {
    return (
        <Stack.Navigator id="HomeStack" screenOptions={{ headerShown: true }}>
            <Stack.Screen name="Dashboard" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Scan Barcode' }} />
            <Stack.Screen name="DeviceDetails" component={DeviceDetailsScreen} options={{ title: 'Asset Details' }} />
            <Stack.Screen name="MaintenanceHistory" component={MaintenanceHistoryScreen} options={{ title: 'Maintenance History' }} />
            <Stack.Screen name="DeploymentHistory" component={DeploymentHistoryScreen} options={{ title: 'Deployment History' }} />
            <Stack.Screen name="LogMaintenance" component={LogMaintenanceScreen} options={{ title: 'Log Activity' }} />
            <Stack.Screen name="DeployAsset" component={DeployAssetScreen} options={{ title: 'Deploy Asset' }} />
            <Stack.Screen name="EditDevice" component={EditDeviceScreen} options={{ title: 'Edit Details' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="NewComplaint" component={NewComplaintScreen} options={{ title: 'Log Complaint' }} />
            <Stack.Screen name="ComplaintDetails" component={ComplaintDetailsScreen} options={{ title: 'Complaint Details' }} />
            <Stack.Screen name="NewRequest" component={NewRequestScreen} options={{ title: 'Log Request' }} />
        </Stack.Navigator>

    );
}

function CustomDrawerContent(props: any) {
    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
                <View style={styles.drawerLogo}>
                    <Monitor color="#fff" size={24} />
                </View>
                <Text style={styles.drawerTitle}>Helpdesk</Text>
            </View>
            <DrawerItemList {...props} />
            <View style={styles.drawerFooter}>
                <DrawerItem
                    label="Settings"
                    onPress={() => props.navigation.navigate('Overview', { screen: 'Settings' })}
                    icon={({ color, size }) => <Info color={color} size={size} />}
                />

                <DrawerItem
                    label="Logout"
                    onPress={handleSignOut}
                    icon={({ color, size }) => <LogOut color="#ef4444" size={size} />}
                    labelStyle={{ color: '#ef4444' }}
                />
            </View>
        </DrawerContentScrollView>
    );
}

export default function App() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Initialize SQLite
                await initDB();

                // Fetch Session
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);

                if (currentSession) {
                    // Initial Sync - Await it to ensure data is present on first load
                    await SyncService.pullAll().catch(console.error);
                }
            } catch (error) {
                console.error('Initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeApp();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) SyncService.pullAll().catch(console.error);
        });

        // Periodic Sync (Every 5 minutes if online)
        const syncInterval = setInterval(() => {
            SyncService.pushAll().catch(console.error);
            SyncService.pullAll().catch(console.error);
        }, 5 * 60 * 1000);

        return () => {
            subscription.unsubscribe();
            clearInterval(syncInterval);
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#3b82f6" size="large" />
            </View>
        );
    }

    if (!session) {
        return <LoginScreen onLogin={setSession} />;
    }

    return (
        <NavigationContainer>
            <Drawer.Navigator
                id="RootDrawer"
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    headerTintColor: '#0f172a',
                    drawerActiveTintColor: '#3b82f6',
                    drawerInactiveTintColor: '#64748b',
                    drawerLabelStyle: { fontWeight: '600' }
                }}
            >
                <Drawer.Screen
                    name="Overview"
                    component={HomeStack}
                    options={{ drawerIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Inventory"
                    component={InventoryScreen}
                    options={{ drawerIcon: ({ color, size }) => <Package color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Desks"
                    component={DesksScreen}
                    options={{ drawerIcon: ({ color, size }) => <Building color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Maintenance"
                    component={MaintenanceScreen}
                    options={{ drawerIcon: ({ color, size }) => <Hammer color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Complaints"
                    component={ComplaintsScreen}
                    options={{ drawerIcon: ({ color, size }) => <AlertTriangle color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Requests"
                    component={RequestsScreen}
                    options={{ drawerIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
                />
                <Drawer.Screen
                    name="Notifications"
                    component={NotificationsScreen}
                    options={{ drawerIcon: ({ color, size }) => <Bell color={color} size={size} /> }}
                />
            </Drawer.Navigator>
            <StatusBar barStyle="dark-content" />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerPadding: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    subWelcome: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    avatarPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4
    },
    scanActionCard: {
        backgroundColor: '#3b82f6',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8
    },
    iconCircleLarge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    cardTitleWhite: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold'
    },
    cardSubWhite: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 2
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32
    },
    statBox: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginTop: 10
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
        fontWeight: '500'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 16
    },
    menuList: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 24
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconCircleSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155'
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    menuCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#94a3b8',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden'
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    // Details Screen Styles
    detailsHeader: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 16 },
    detailsTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
    detailsSubTitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    infoCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    detailLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 16, color: '#334155', fontWeight: 'bold', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
    actionBtn: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1.5, backgroundColor: 'white' },
    // Drawer Styles
    drawerHeader: {
        padding: 24,
        backgroundColor: '#3b82f6',
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    drawerLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5
    },
    drawerFooter: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingVertical: 16
    },
    // Form Styles
    input: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        fontSize: 15,
        color: '#0f172a',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    choiceBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    choiceBtnActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6'
    },
    choiceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b'
    },
    choiceTextActive: {
        color: '#fff'
    }
});
