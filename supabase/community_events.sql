-- Community Events / Education Calendar Table Schema for MultiNav iCRM
-- Run this in your Supabase SQL editor to create the community_events table

-- Create Community Events table
CREATE TABLE IF NOT EXISTS community_events (
    id VARCHAR(50) PRIMARY KEY,
    event_date DATE NOT NULL,
    topic TEXT NOT NULL,
    location VARCHAR(255),
    group_presented_to VARCHAR(255),
    presenter VARCHAR(255),
    agency_collaborations TEXT,
    organiser VARCHAR(255),
    staff_present TEXT,
    number_of_attendees INTEGER,
    demographics TEXT,
    notes TEXT,
    created_by VARCHAR(255),
    created_by_name VARCHAR(255),
    created_by_role VARCHAR(50) CHECK (created_by_role IN ('admin', 'coordinator', 'navigator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for community events
CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_location ON community_events(location);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON community_events(created_by);

-- Create trigger for updated_at column
CREATE OR REPLACE FUNCTION update_community_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_events_updated_at ON community_events;
CREATE TRIGGER update_community_events_updated_at
    BEFORE UPDATE ON community_events
    FOR EACH ROW EXECUTE FUNCTION update_community_events_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

-- Create policies for community_events (matches the permissive pattern used by
-- other tables in this schema - adjust before production use with proper auth policies).
DROP POLICY IF EXISTS "Enable read access for all users" ON community_events;
CREATE POLICY "Enable read access for all users" ON community_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON community_events;
CREATE POLICY "Enable insert for authenticated users" ON community_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON community_events;
CREATE POLICY "Enable update for authenticated users" ON community_events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON community_events;
CREATE POLICY "Enable delete for authenticated users" ON community_events FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON community_events TO anon;
GRANT ALL ON community_events TO authenticated;
GRANT ALL ON community_events TO service_role;
