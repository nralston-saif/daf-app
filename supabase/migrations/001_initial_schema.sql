-- DAF Family Foundation Management - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('primary_advisor', 'advisor', 'contributor', 'observer');
CREATE TYPE grant_status AS ENUM ('idea', 'research', 'review', 'pending_vote', 'approved', 'submitted', 'paid', 'declined', 'closed');
CREATE TYPE recommendation AS ENUM ('approve', 'decline', 'abstain');
CREATE TYPE meeting_type AS ENUM ('quarterly', 'annual', 'adhoc');
CREATE TYPE entity_type AS ENUM ('organization', 'grant', 'meeting');

-- Foundations table
CREATE TABLE foundations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mission TEXT,
    focus_areas TEXT[] DEFAULT '{}',
    geographic_scope VARCHAR(255),
    annual_budget DECIMAL(15, 2),
    daf_balance DECIMAL(15, 2) DEFAULT 0,
    ytd_granted DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'observer',
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    photo_url TEXT,
    bio TEXT,
    philanthropic_interests TEXT[] DEFAULT '{}',
    notification_prefs JSONB DEFAULT '{"email_new_grant": true, "email_review_assigned": true, "email_meeting_reminder": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ein VARCHAR(20),
    website VARCHAR(500),
    mission TEXT,
    annual_budget DECIMAL(15, 2),
    tax_status VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    overall_rating DECIMAL(3, 2) CHECK (overall_rating >= 1 AND overall_rating <= 5),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants table
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status grant_status DEFAULT 'idea',
    amount DECIMAL(15, 2) NOT NULL,
    purpose TEXT,
    focus_areas TEXT[] DEFAULT '{}',
    start_date DATE,
    end_date DATE,
    proposed_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant Reviews table
CREATE TABLE grant_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    mission_alignment INTEGER CHECK (mission_alignment >= 1 AND mission_alignment <= 5),
    impact INTEGER CHECK (impact >= 1 AND impact <= 5),
    capacity INTEGER CHECK (capacity >= 1 AND capacity <= 5),
    financial_health INTEGER CHECK (financial_health >= 1 AND financial_health <= 5),
    comments TEXT,
    recommendation recommendation NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grant_id, reviewer_id)
);

-- Grant Comments table
CREATE TABLE grant_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    type meeting_type DEFAULT 'adhoc',
    title VARCHAR(255) NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    agenda_items TEXT[] DEFAULT '{}',
    attendees UUID[] DEFAULT '{}',
    minutes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'observer',
    invited_by UUID NOT NULL REFERENCES users(id),
    token UUID DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(foundation_id, email)
);

-- Activity log for dashboard feed
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foundation_id UUID NOT NULL REFERENCES foundations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_users_foundation ON users(foundation_id);
CREATE INDEX idx_users_auth ON users(auth_id);
CREATE INDEX idx_organizations_foundation ON organizations(foundation_id);
CREATE INDEX idx_grants_foundation ON grants(foundation_id);
CREATE INDEX idx_grants_organization ON grants(organization_id);
CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grant_reviews_grant ON grant_reviews(grant_id);
CREATE INDEX idx_grant_comments_grant ON grant_comments(grant_id);
CREATE INDEX idx_meetings_foundation ON meetings(foundation_id);
CREATE INDEX idx_meetings_datetime ON meetings(date_time);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_activity_foundation ON activity_log(foundation_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_foundations_updated_at BEFORE UPDATE ON foundations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grant_reviews_updated_at BEFORE UPDATE ON grant_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grant_comments_updated_at BEFORE UPDATE ON grant_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE foundations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's foundation_id
CREATE OR REPLACE FUNCTION get_user_foundation_id()
RETURNS UUID AS $$
    SELECT foundation_id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Foundations policies
CREATE POLICY "Users can view their foundation" ON foundations
    FOR SELECT USING (id = get_user_foundation_id());

CREATE POLICY "Primary advisors can update their foundation" ON foundations
    FOR UPDATE USING (id = get_user_foundation_id() AND get_user_role() = 'primary_advisor');

-- Users policies
CREATE POLICY "Users can view users in their foundation" ON users
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "Primary advisors can manage users" ON users
    FOR ALL USING (foundation_id = get_user_foundation_id() AND get_user_role() = 'primary_advisor');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth_id = auth.uid());

-- Organizations policies
CREATE POLICY "Users can view orgs in their foundation" ON organizations
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "Advisors+ can create orgs" ON organizations
    FOR INSERT WITH CHECK (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor', 'contributor')
    );

CREATE POLICY "Advisors+ can update orgs" ON organizations
    FOR UPDATE USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );

CREATE POLICY "Primary advisors can delete orgs" ON organizations
    FOR DELETE USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() = 'primary_advisor'
    );

-- Grants policies
CREATE POLICY "Users can view grants in their foundation" ON grants
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "Advisors+ can create grants" ON grants
    FOR INSERT WITH CHECK (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );

CREATE POLICY "Advisors+ can update grants" ON grants
    FOR UPDATE USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );

CREATE POLICY "Primary advisors can delete grants" ON grants
    FOR DELETE USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() = 'primary_advisor'
    );

-- Grant reviews policies
CREATE POLICY "Users can view reviews in their foundation" ON grant_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_reviews.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Advisors can create reviews" ON grant_reviews
    FOR INSERT WITH CHECK (
        get_user_role() IN ('primary_advisor', 'advisor')
        AND EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_reviews.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Reviewers can update their own reviews" ON grant_reviews
    FOR UPDATE USING (
        reviewer_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Grant comments policies
CREATE POLICY "Users can view comments" ON grant_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_comments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Users can create comments" ON grant_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM grants
            WHERE grants.id = grant_comments.grant_id
            AND grants.foundation_id = get_user_foundation_id()
        )
    );

CREATE POLICY "Users can update their own comments" ON grant_comments
    FOR UPDATE USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Meetings policies
CREATE POLICY "Users can view meetings" ON meetings
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "Advisors can manage meetings" ON meetings
    FOR ALL USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );

-- Documents policies
CREATE POLICY "Users can view documents" ON documents
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "Advisors+ can upload documents" ON documents
    FOR INSERT WITH CHECK (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor', 'contributor')
    );

CREATE POLICY "Advisors can delete documents" ON documents
    FOR DELETE USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );

-- Invitations policies
CREATE POLICY "Primary advisors can manage invitations" ON invitations
    FOR ALL USING (
        foundation_id = get_user_foundation_id()
        AND get_user_role() = 'primary_advisor'
    );

CREATE POLICY "Anyone can view invitation by token" ON invitations
    FOR SELECT USING (true);

-- Activity log policies
CREATE POLICY "Users can view activity in their foundation" ON activity_log
    FOR SELECT USING (foundation_id = get_user_foundation_id());

CREATE POLICY "System can insert activity" ON activity_log
    FOR INSERT WITH CHECK (foundation_id = get_user_foundation_id());

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Users can view documents in their foundation" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = get_user_foundation_id()::text
    );

CREATE POLICY "Advisors+ can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = get_user_foundation_id()::text
        AND get_user_role() IN ('primary_advisor', 'advisor', 'contributor')
    );

CREATE POLICY "Advisors can delete documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = get_user_foundation_id()::text
        AND get_user_role() IN ('primary_advisor', 'advisor')
    );
