-- Migration: Add network info fields to devices table

ALTER TABLE devices
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS mac_address TEXT;

-- Optional: Add index if we plan to search by these often
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
