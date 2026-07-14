-- Add priority level to community_engagements table
-- 1 = High, 2 = Moderate, 3 = Low
ALTER TABLE community_engagements
  ADD COLUMN IF NOT EXISTS priority_level SMALLINT CHECK (priority_level IN (1, 2, 3));
