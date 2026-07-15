-- Add referring organisation/agency contact email to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referring_organisation_contact_email TEXT;
