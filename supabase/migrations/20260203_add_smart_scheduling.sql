-- Migration: Add smart_scheduling column to automation_configs table
-- Date: 2026-02-03
-- Description: Adds the smart_scheduling boolean column that was missing from the schema

-- Add smart_scheduling column
ALTER TABLE automation_configs 
ADD COLUMN IF NOT EXISTS smart_scheduling BOOLEAN DEFAULT false;

-- Update existing rows to have a default value
UPDATE automation_configs 
SET smart_scheduling = false 
WHERE smart_scheduling IS NULL;

-- Add comment
COMMENT ON COLUMN automation_configs.smart_scheduling IS 'Whether to use AI-powered smart scheduling to optimize post timing';
