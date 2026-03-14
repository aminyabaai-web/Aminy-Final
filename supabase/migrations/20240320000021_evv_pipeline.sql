-- SPRINT 1: Medicaid EVV (Electronic Visit Verification) Schema
CREATE TABLE evv_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID REFERENCES profiles(id) NOT NULL,
    patient_id UUID REFERENCES children(id) NOT NULL,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    status TEXT CHECK (status IN ('in_progress', 'completed', 'approved', 'exported')) DEFAULT 'in_progress',
    acumen_dci_export_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Preventive Audit Trigger for Medicaid EVV (No Overlaps)
CREATE OR REPLACE FUNCTION prevent_shift_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM evv_timesheets
        WHERE patient_id = NEW.patient_id
        AND id != NEW.id
        AND status IN ('in_progress', 'completed')
        AND (
            (NEW.shift_start >= shift_start AND NEW.shift_start < COALESCE(shift_end, NOW())) OR
            (NEW.shift_end > shift_start AND NEW.shift_end <= COALESCE(shift_end, NOW())) OR
            (NEW.shift_start <= shift_start AND NEW.shift_end >= COALESCE(shift_end, NOW()))
        )
    ) THEN
        RAISE EXCEPTION 'EVV Overlap Detected: Patient is already checked in with another caregiver. Medicaid fraud prevention active.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER check_shift_overlap
BEFORE INSERT OR UPDATE ON evv_timesheets
FOR EACH ROW EXECUTE FUNCTION prevent_shift_overlap();
