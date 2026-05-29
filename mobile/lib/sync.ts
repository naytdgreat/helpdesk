import { supabase } from './supabase';
import { getDB } from './db';

export const SyncService = {
    isPulling: false,
    isPushing: false,

    /**
     * Pulls data from Supabase and updates the local SQLite database.
     */
    async pullAll() {
        if (this.isPulling) {
            console.log('--- Pull Sync already in progress, skipping ---');
            return;
        }

        this.isPulling = true;
        const db = await getDB();
        const tables = [
            'hospitals',
            'wings',
            'offices',
            'desks',
            'device_categories',
            'devices',
            'maintenance_logs',
            'deployment_logs',
            'complaints',
            'requests',
            'request_items',
            'notifications',
            'profiles'
        ];

        console.log('--- Starting Pull Sync ---');

        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw error;

                if (data && data.length > 0) {
                    // Get local table columns
                    const tableInfo: any[] = await db.getAllAsync(`PRAGMA table_info(${table})`);
                    const localColumns = tableInfo.map(col => col.name);

                    // Filter Supabase columns to only those that exist locally
                    const supabaseColumns = Object.keys(data[0]);
                    const validColumns = supabaseColumns.filter(col => localColumns.includes(col));

                    if (validColumns.length === 0) {
                        console.warn(`No valid columns found for table ${table}. Local: ${localColumns.join(',')}`);
                        continue;
                    }

                    const placeHolders = validColumns.map(() => '?').join(',');
                    const insertSql = `INSERT OR REPLACE INTO ${table} (${validColumns.join(',')}) VALUES (${placeHolders})`;

                    for (const row of data) {
                        const values = validColumns.map(col => {
                            const val = row[col];
                            // Handle booleans (SQLite uses 0/1)
                            if (typeof val === 'boolean') return val ? 1 : 0;
                            // Handle objects/arrays (stringify)
                            if (val && typeof val === 'object') return JSON.stringify(val);
                            return val;
                        });
                        await db.runAsync(insertSql, values);
                    }

                    // Update sync metadata
                    await db.runAsync(
                        'INSERT OR REPLACE INTO sync_metadata (table_name, last_pulled_at) VALUES (?, ?)',
                        [table, new Date().toISOString()]
                    );
                } else {
                    console.log(`No data returned from Supabase for table ${table}`);
                }
                console.log(`Pulled ${data?.length || 0} rows from ${table}`);
            } catch (err) {
                console.error(`Error pulling table ${table}:`, err);
            }
        }
        console.log('--- Pull Sync Complete ---');
        this.isPulling = false;
    },

    /**
     * Pushes local changes from sync_queue to Supabase.
     */
    async pushAll() {
        if (this.isPushing) {
            console.log('--- Push Sync already in progress, skipping ---');
            return;
        }
        this.isPushing = true;

        try {
            const db = await getDB();
            const queue: any[] = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY id ASC');

            if (queue.length === 0) return;

            console.log(`--- Starting Push Sync (${queue.length} items) ---`);

            for (const item of queue) {
                // Check if we should stop (e.g. queue cleared mid-sync)
                // Re-check existence to be safe? 
                // For now, relies on error handling or next cycle.

                try {
                    const payload = JSON.parse(item.payload);
                    let result;

                    if (item.table_name === 'notifications_all_read') {
                        // Bulk update for notifications
                        const { user_id } = payload;
                        if (!user_id) throw new Error('user_id is required for notifications_all_read sync');

                        result = await supabase
                            .from('notifications')
                            .update({ is_read: true })
                            .eq('user_id', user_id)
                            .eq('is_read', false);
                    } else if (item.operation === 'INSERT') {
                        result = await supabase.from(item.table_name).insert([payload]);
                    } else if (item.operation === 'UPDATE') {
                        result = await supabase.from(item.table_name).update(payload).eq('id', payload.id);
                    } else if (item.operation === 'DELETE') {
                        result = await supabase.from(item.table_name).delete().eq('id', payload.id);
                    }

                    if (result?.error) throw result.error;

                    console.log(`Successfully synced item ${item.id} (${item.operation} on ${item.table_name})`);

                    // Remove from queue if successful
                    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);

                } catch (err: any) {
                    // Handle duplicate key error (already synced)
                    if (err.code === '23505') {
                        console.warn(`Item ${item.id} already exists on server (Duplicate Key), removing from queue.`);
                        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
                        continue; // Continue to next item
                    }

                    // Handle foreign key violation (missing parent)
                    if (err.code === '23503') {
                        console.error(`Item ${item.id} failed due to missing dependency (FK Violation). Removing from queue to prevent constant failure.`);
                        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
                        continue;
                    }

                    console.error(`Error pushing item ${item.id} (${item.operation} on ${item.table_name}):`, err.message || err);
                    console.error('Payload was:', JSON.stringify(item.payload));
                    // Stop push sync if we encounter a critical error to preserve order
                    break;
                }


            }
            console.log('--- Push Sync Complete ---');
        } catch (err) {
            console.error('Push sync critical failure:', err);
        } finally {
            this.isPushing = false;
        }
    },

    /**
     * Tracks a local change to be synced later.
     */
    async trackChange(operation: 'INSERT' | 'UPDATE' | 'DELETE', tableName: string, payload: any) {
        const db = await getDB();
        await db.runAsync(
            'INSERT INTO sync_queue (operation, table_name, payload) VALUES (?, ?, ?)',
            [operation, tableName, JSON.stringify(payload)]
        );
        // Try to push immediately if online (optional optimization)
        this.pushAll().catch(console.error);
    }
};
