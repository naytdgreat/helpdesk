-- Migration: Add notifications table
-- This script creates a notifications table for user alerts

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
END $$;

-- Policies
CREATE POLICY "Users can view their own notifications" 
    ON notifications FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON notifications FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Depending on your architecture, you might restrict creation to system functions or admins.
-- For simplicity in this app where client-side triggers notifications:
CREATE POLICY "Authenticated users can create notifications" 
    ON notifications FOR INSERT 
    TO authenticated 
    WITH CHECK (true);
