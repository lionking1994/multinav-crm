-- Add referring organisation/agency contact details to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referring_organisation_contact_person TEXT;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS referring_organisation_contact_phone TEXT;
