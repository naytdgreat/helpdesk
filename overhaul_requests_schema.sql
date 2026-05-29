-- 1. Create request_items table
CREATE TABLE IF NOT EXISTS request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    fulfilled_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Fulfilled', 'Partially Fulfilled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrate existing data (Optional, if you want to keep old requests)
-- This attempts to move data from requests columns to the child table before dropping columns.
INSERT INTO request_items (request_id, item_type, quantity, status)
SELECT id, item_type, quantity, status 
FROM requests 
WHERE item_type IS NOT NULL;

-- 3. Alter requests table
-- We remove item specific columns as they are now in the child table
ALTER TABLE requests 
DROP COLUMN IF EXISTS item_type,
DROP COLUMN IF EXISTS quantity;

-- 4. Enable RLS on new table
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;

-- 5. Policies for request_items
CREATE POLICY "Users can view all request items" ON request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create request items" ON request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update request items" ON request_items FOR UPDATE TO authenticated USING (true);
