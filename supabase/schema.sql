-- PEP Ops Logger Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Centers table
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (managers and super admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager')),
    is_active BOOLEAN DEFAULT true,
    linked_subject_id UUID, -- Link to subject if manager is also a subject
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Center assignments (many-to-many)
CREATE TABLE user_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id)
);

-- Subjects table (nannies, drivers, managers-as-subjects)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('nanny', 'driver', 'manager_as_subject')),
    current_center_id UUID NOT NULL REFERENCES centers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for linked_subject_id after subjects table exists
ALTER TABLE users ADD CONSTRAINT fk_linked_subject
    FOREIGN KEY (linked_subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- Observations table
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    center_id UUID NOT NULL REFERENCES centers(id), -- Center at time of observation
    logged_by_user_id UUID NOT NULL REFERENCES users(id),
    transcript TEXT NOT NULL,
    observation_type TEXT CHECK (observation_type IN (
        'punctuality', 'safety', 'hygiene', 'communication',
        'procedure', 'parent_feedback', 'other'
    )),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Observation type configuration (super admin editable)
CREATE TABLE observation_type_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_observations_subject_id ON observations(subject_id);
CREATE INDEX idx_observations_center_id ON observations(center_id);
CREATE INDEX idx_observations_logged_by ON observations(logged_by_user_id);
CREATE INDEX idx_observations_observed_at ON observations(observed_at);
CREATE INDEX idx_observations_logged_at ON observations(logged_at);
CREATE INDEX idx_subjects_current_center ON subjects(current_center_id);
CREATE INDEX idx_subjects_is_active ON subjects(is_active);
CREATE INDEX idx_user_centers_user_id ON user_centers(user_id);
CREATE INDEX idx_user_centers_center_id ON user_centers(center_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON observations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observation_type_config_updated_at BEFORE UPDATE ON observation_type_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_type_config ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE email = auth.jwt() ->> 'email'
    AND is_active = true;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's ID
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM users
    WHERE email = auth.jwt() ->> 'email'
    AND is_active = true;
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's linked subject ID
CREATE OR REPLACE FUNCTION get_linked_subject_id()
RETURNS UUID AS $$
DECLARE
    subject_uuid UUID;
BEGIN
    SELECT linked_subject_id INTO subject_uuid
    FROM users
    WHERE email = auth.jwt() ->> 'email'
    AND is_active = true;
    RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a center
CREATE OR REPLACE FUNCTION can_access_center(center_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins can access all centers
    IF get_user_role() = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- Check if user is assigned to the center
    RETURN EXISTS (
        SELECT 1 FROM user_centers
        WHERE user_id = get_user_id()
        AND center_id = center_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Centers policies
CREATE POLICY "Super admins can manage centers" ON centers
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Managers can view assigned centers" ON centers
    FOR SELECT USING (
        get_user_role() = 'manager' AND can_access_center(id)
    );

-- Users policies
CREATE POLICY "Super admins can manage users" ON users
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- User centers policies
CREATE POLICY "Super admins can manage user_centers" ON user_centers
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Users can view their own center assignments" ON user_centers
    FOR SELECT USING (user_id = get_user_id());

-- Subjects policies
CREATE POLICY "Super admins can manage all subjects" ON subjects
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Managers can view subjects in their centers" ON subjects
    FOR SELECT USING (
        get_user_role() = 'manager'
        AND can_access_center(current_center_id)
        -- Self-visibility restriction: can't view if this is their linked subject
        AND (get_linked_subject_id() IS NULL OR id != get_linked_subject_id())
    );

CREATE POLICY "Managers can insert subjects in their centers" ON subjects
    FOR INSERT WITH CHECK (
        get_user_role() = 'manager'
        AND can_access_center(current_center_id)
    );

CREATE POLICY "Managers can update subjects in their centers" ON subjects
    FOR UPDATE USING (
        get_user_role() = 'manager'
        AND can_access_center(current_center_id)
        AND (get_linked_subject_id() IS NULL OR id != get_linked_subject_id())
    );

-- Observations policies
CREATE POLICY "Super admins can manage all observations" ON observations
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Managers can view observations in their centers" ON observations
    FOR SELECT USING (
        get_user_role() = 'manager'
        AND can_access_center(center_id)
        -- Self-visibility restriction
        AND (get_linked_subject_id() IS NULL OR subject_id != get_linked_subject_id())
    );

CREATE POLICY "Managers can insert observations in their centers" ON observations
    FOR INSERT WITH CHECK (
        get_user_role() = 'manager'
        AND can_access_center(center_id)
        AND logged_by_user_id = get_user_id()
        -- Can't log observations about themselves
        AND (get_linked_subject_id() IS NULL OR subject_id != get_linked_subject_id())
    );

CREATE POLICY "Managers can update their own observations" ON observations
    FOR UPDATE USING (
        get_user_role() = 'manager'
        AND logged_by_user_id = get_user_id()
        AND (get_linked_subject_id() IS NULL OR subject_id != get_linked_subject_id())
    );

-- Observation type config policies (super admin only for changes, everyone can read)
CREATE POLICY "Super admins can manage observation types" ON observation_type_config
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "All users can view observation types" ON observation_type_config
    FOR SELECT USING (get_user_role() IS NOT NULL);

-- Seed initial observation types
INSERT INTO observation_type_config (value, label, sort_order) VALUES
    ('punctuality', 'Punctuality', 1),
    ('safety', 'Safety', 2),
    ('hygiene', 'Hygiene', 3),
    ('communication', 'Communication', 4),
    ('procedure', 'Procedure', 5),
    ('parent_feedback', 'Parent Feedback', 6),
    ('other', 'Other', 7);

-- Seed centers
INSERT INTO centers (name) VALUES
    ('HSR'),
    ('Whitefield'),
    ('Varthur'),
    ('Kokapet');

-- Seed super admins
INSERT INTO users (email, name, role) VALUES
    ('rahul@pepschoolv2.com', 'Rahul', 'super_admin'),
    ('chetan@pepschoolv2.com', 'Chetan', 'super_admin');

-- Seed initial manager (Harish) - assign to all centers for now
INSERT INTO users (email, name, role) VALUES
    ('harish@pepschoolv2.com', 'Harish', 'manager');

-- Assign Harish to all centers
INSERT INTO user_centers (user_id, center_id)
SELECT
    (SELECT id FROM users WHERE email = 'harish@pepschoolv2.com'),
    id
FROM centers;

-- Seed initial subjects
INSERT INTO subjects (name, role, current_center_id) VALUES
    ('Padma', 'nanny', (SELECT id FROM centers WHERE name = 'HSR')),
    ('Mallikarjun', 'driver', (SELECT id FROM centers WHERE name = 'HSR'));
