import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const initDB = async (): Promise<SQLite.SQLiteDatabase> => {
    // If we already have a functional DB, return it
    if (db) {
        try {
            await db.runAsync('SELECT 1'); // Health check
            return db;
        } catch (e) {
            console.warn('[DB] Existing DB handle failed health check, re-initializing');
            db = null;
        }
    }

    if (initPromise) return initPromise;

    console.log('[DB] Starting Database Initialization');
    initPromise = (async () => {
        let database: SQLite.SQLiteDatabase | null = null;
        try {
            database = await SQLite.openDatabaseAsync('helpdesk.db');
            console.log('[DB] Database opened');

            // Warmup / Health check
            await database.runAsync('SELECT 1');

            // Set global early so other calls can use it if they don't need migrations
            // But wait, it's safer to finish migrations first.

            const tables = [
                `CREATE TABLE IF NOT EXISTS sync_metadata(
    table_name TEXT PRIMARY KEY,
    last_pulled_at TEXT,
    last_pushed_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS hospitals(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS wings(
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS offices(
    id TEXT PRIMARY KEY,
    wing_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS desks(
    id TEXT PRIMARY KEY,
    office_id TEXT,
    name TEXT NOT NULL,
    assigned_to_user TEXT,
    last_audit_at TEXT,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS device_categories(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS devices(
    id TEXT PRIMARY KEY,
    hospital_id TEXT,
    barcode TEXT NOT NULL,
    serial_number TEXT,
    brand TEXT,
    model TEXT,
    specifications TEXT,
    category_id TEXT,
    desk_id TEXT,
    office_id TEXT,
    ip_address TEXT,
    mac_address TEXT,
    status TEXT,
    deployment_status TEXT,
    physical_condition TEXT,
    maintenance_count INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS maintenance_logs(
    id TEXT PRIMARY KEY,
    device_id TEXT,
    it_officer_id TEXT,
    performer_type TEXT,
    performer_name TEXT,
    description TEXT,
    parts_replaced TEXT,
    update_condition TEXT,
    performed_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS deployment_logs(
    id TEXT PRIMARY KEY,
    device_id TEXT,
    type TEXT,
    status TEXT,
    hospital_id TEXT,
    office_id TEXT,
    desk_id TEXT,
    performer_id TEXT,
    notes TEXT,
    performed_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS complaints(
    id TEXT PRIMARY KEY,
    reporter_name TEXT,
    description TEXT,
    category TEXT,
    status TEXT,
    assigned_to_id TEXT,
    device_id TEXT,
    desk_id TEXT,
    notes TEXT,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS requests(
    id TEXT PRIMARY KEY,
    reporter_name TEXT,
    status TEXT,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS request_items(
    id TEXT PRIMARY KEY,
    request_id TEXT,
    item_type TEXT,
    quantity INTEGER,
    fulfilled_quantity INTEGER DEFAULT 0,
    status TEXT,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS notifications(
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    message TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT
)`,
                `CREATE TABLE IF NOT EXISTS profiles(
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    hospital_id TEXT,
    role TEXT,
    offline_login_enabled INTEGER DEFAULT 0
)`,
                `CREATE TABLE IF NOT EXISTS sync_queue(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT,
    table_name TEXT,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`
            ];

            for (const sql of tables) {
                if (sql) await database.execAsync(sql);
            }
            console.log('[DB] Tables verified');

            // Migration
            const tablesToCheck = {
                devices: ['physical_condition', 'deployment_status'],
                maintenance_logs: ['performer_type', 'performer_name', 'update_condition'],
                complaints: ['notes', 'category', 'device_id', 'desk_id'],
                profiles: ['role', 'email', 'offline_login_enabled']
            };

            for (const [table, columns] of Object.entries(tablesToCheck)) {
                try {
                    const tableInfo: any[] = await database.getAllAsync(`PRAGMA table_info("${table}")`);
                    const existingColumns = tableInfo.map(col => String(col.name).toLowerCase());

                    for (const col of columns) {
                        if (!existingColumns.includes(col.toLowerCase())) {
                            await database.execAsync(`ALTER TABLE "${table}" ADD COLUMN ${col} TEXT`);
                            console.log(`[DB] Added column ${col} to ${table} `);
                        }
                    }
                } catch (e) {
                    console.error(`[DB] Migration error for ${table}: `, e);
                }
            }

            console.log('[DB] Initialization complete');
            db = database;
            return database;
        } catch (error) {
            console.error('[DB] Critical Initialization Error:', error);
            throw error;
        } finally {
            initPromise = null;
        }
    })();

    return initPromise;
};

export const getDB = async () => {
    return await initDB();
};
