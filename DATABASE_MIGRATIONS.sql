-- ReNova Database Migrations for Phase 2 Features
-- Run these migrations in Supabase or your PostgreSQL database

-- Migration 1: Add order code and validation code fields to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS order_code VARCHAR(30) UNIQUE,
ADD COLUMN IF NOT EXISTS validation_code VARCHAR(20) UNIQUE;

-- Migration 2: Add pickup person details to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS pickup_person_name VARCHAR(120),
ADD COLUMN IF NOT EXISTS pickup_person_dni VARCHAR(30),
ADD COLUMN IF NOT EXISTS pickup_person_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_order_code ON reservations(order_code);
CREATE INDEX IF NOT EXISTS idx_reservations_validation_code ON reservations(validation_code);

-- Notes:
-- order_code: Format like "RN-2026-000001" or "RN-000001"
-- validation_code: Random code generated when reservation is created, used for delivery confirmation
-- pickup_person_name: Name of the person who will pick up the donation
-- pickup_person_dni: DNI/ID number of the pickup person (required for accountability)
-- pickup_person_phone: Contact phone of the pickup person (optional)
-- pickup_notes: Any additional notes about the pickup (optional)
