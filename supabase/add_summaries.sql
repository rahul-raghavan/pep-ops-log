-- AI Summaries table
-- Run this in your Supabase SQL editor to add the summaries feature

CREATE TABLE observation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    observation_count INTEGER NOT NULL,
    last_observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookup
CREATE INDEX idx_summaries_subject_id ON observation_summaries(subject_id);
CREATE INDEX idx_summaries_last_observation ON observation_summaries(last_observation_id);

-- Apply updated_at trigger
CREATE TRIGGER update_observation_summaries_updated_at BEFORE UPDATE ON observation_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE observation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for summaries
CREATE POLICY "Super admins can manage all summaries" ON observation_summaries
    FOR ALL USING (get_user_role() = 'super_admin');

CREATE POLICY "Managers can view summaries for subjects in their centers" ON observation_summaries
    FOR SELECT USING (
        get_user_role() = 'manager'
        AND EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_id
            AND can_access_center(s.current_center_id)
            AND (get_linked_subject_id() IS NULL OR s.id != get_linked_subject_id())
        )
    );

CREATE POLICY "Managers can insert summaries for subjects in their centers" ON observation_summaries
    FOR INSERT WITH CHECK (
        get_user_role() = 'manager'
        AND EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_id
            AND can_access_center(s.current_center_id)
            AND (get_linked_subject_id() IS NULL OR s.id != get_linked_subject_id())
        )
        AND requested_by_user_id = get_user_id()
    );
