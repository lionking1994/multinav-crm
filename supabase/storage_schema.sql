-- ============================================
-- Storage Schema Updates for Program Resources
-- ============================================

-- First, check if the program_resources table exists, if not create it
CREATE TABLE IF NOT EXISTS program_resources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100),
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    storage_path TEXT
);

-- Add file storage fields to program_resources table (if table already exists)
ALTER TABLE program_resources 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for faster queries on storage path
CREATE INDEX IF NOT EXISTS idx_program_resources_storage_path ON program_resources(storage_path);

-- Add a comment to document the columns
COMMENT ON COLUMN program_resources.file_url IS 'Public URL for the uploaded file';
COMMENT ON COLUMN program_resources.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN program_resources.file_size IS 'File size in bytes';
COMMENT ON COLUMN program_resources.file_type IS 'MIME type of the file';
COMMENT ON COLUMN program_resources.storage_path IS 'Storage path in Supabase bucket';








