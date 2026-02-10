-- Recurring grant tracking

-- Enums
CREATE TYPE grant_recurrence AS ENUM ('one_time','monthly','quarterly','semi_annual','annual');

-- Grants additions
ALTER TABLE grants ADD COLUMN IF NOT EXISTS recurrence_type grant_recurrence DEFAULT 'one_time';
ALTER TABLE grants ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- Grant payments table
CREATE TABLE IF NOT EXISTS grant_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grant_payments_grant_id ON grant_payments(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_payments_status ON grant_payments(status);
CREATE INDEX IF NOT EXISTS idx_grant_payments_payment_date ON grant_payments(payment_date);

-- Enable RLS
ALTER TABLE grant_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view grant payments in their foundation" ON grant_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_payments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Advisors can create grant payments" ON grant_payments
    FOR INSERT WITH CHECK (
        get_user_role() IN ('primary_advisor', 'advisor')
        AND EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_payments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Advisors can update grant payments" ON grant_payments
    FOR UPDATE USING (
        get_user_role() IN ('primary_advisor', 'advisor')
        AND EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_payments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Primary advisors can delete grant payments" ON grant_payments
    FOR DELETE USING (
        get_user_role() = 'primary_advisor'
        AND EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_payments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

-- Updated_at trigger
CREATE TRIGGER update_grant_payments_updated_at
    BEFORE UPDATE ON grant_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
