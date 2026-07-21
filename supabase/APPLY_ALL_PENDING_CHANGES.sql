-- =====================================================================
-- MultiNav iCRM - Apply All Pending Database Changes
-- =====================================================================
-- This script consolidates every migration under supabase/migrations/
-- plus the standalone community_events table setup into a single,
-- safe-to-run-anytime script.
--
-- It is fully idempotent (uses "IF NOT EXISTS" everywhere), so running
-- it multiple times, or on a database that already has some of these
-- changes applied, will not cause errors or duplicate data.
--
-- HOW TO RUN:
--   1. Go to your Supabase project dashboard.
--   2. Open SQL Editor -> New query.
--   3. Paste the entire contents of this file and click "Run".
--
-- WHY THIS IS NEEDED:
--   Several app features (Client Management extra fields, the Events
--   & Education Calendar, health activity discharge tracking, etc.)
--   were added to the application code, but their corresponding
--   database schema changes live in individual files under
--   supabase/migrations/ that must be run manually against Supabase.
--   If any of them were missed, saving records for that feature will
--   fail with an error like "column ... does not exist".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. clients table - extra fields used by Client Management
-- ---------------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referring_organisation TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referring_organisation_contact_person TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referring_organisation_contact_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referring_organisation_contact_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_staff_id VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS additional_input TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS documents TEXT;
COMMENT ON COLUMN clients.documents IS 'JSON array of uploaded documents: [{name, url, uploadedAt}]';

-- ---------------------------------------------------------------------
-- 2. health_activities table - location, discharge, creator tracking
-- ---------------------------------------------------------------------
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS other_assistance TEXT DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS other_education TEXT DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS is_discharge BOOLEAN DEFAULT FALSE;
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS discharge_date DATE;
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS discharge_reason TEXT DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) DEFAULT '';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) DEFAULT 'navigator';
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS reason_for_assistance TEXT;
ALTER TABLE health_activities ADD COLUMN IF NOT EXISTS documents TEXT;
COMMENT ON COLUMN health_activities.documents IS 'JSON array of uploaded documents: [{name, url, uploadedAt}]';

-- ---------------------------------------------------------------------
-- 3. community_engagements table - priority level
-- ---------------------------------------------------------------------
ALTER TABLE community_engagements
  ADD COLUMN IF NOT EXISTS priority_level SMALLINT CHECK (priority_level IN (1, 2, 3));

-- ---------------------------------------------------------------------
-- 4. community_events table - Events & Education Calendar feature
--    (creates the whole table if it does not exist yet)
-- ---------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_community_events_location ON community_events(location);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON community_events(created_by);

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

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON community_events;
CREATE POLICY "Enable read access for all users" ON community_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON community_events;
CREATE POLICY "Enable insert for authenticated users" ON community_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON community_events;
CREATE POLICY "Enable update for authenticated users" ON community_events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON community_events;
CREATE POLICY "Enable delete for authenticated users" ON community_events FOR DELETE USING (true);

GRANT ALL ON community_events TO anon;
GRANT ALL ON community_events TO authenticated;
GRANT ALL ON community_events TO service_role;

-- =====================================================================
-- Done. All pending schema changes have been applied (or were already
-- present, in which case nothing changed).
-- =====================================================================
