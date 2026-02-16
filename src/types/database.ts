export type UserRole = 'super_admin' | 'manager';
export type SubjectRole = 'nanny' | 'driver' | 'manager_as_subject';
export type ObservationType =
  | 'punctuality'
  | 'safety'
  | 'hygiene'
  | 'communication'
  | 'procedure'
  | 'parent_feedback'
  | 'other';

export interface Center {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  linked_subject_id: string | null; // For managers who are also subjects
  created_at: string;
  updated_at: string;
}

export interface UserCenter {
  id: string;
  user_id: string;
  center_id: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  role: SubjectRole;
  current_center_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  current_center?: Center;
}

export interface Observation {
  id: string;
  subject_id: string;
  center_id: string; // Center at time of observation
  logged_by_user_id: string;
  transcript: string;
  observation_type: ObservationType | null;
  observed_at: string;
  logged_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  subject?: Subject;
  center?: Center;
  logged_by?: User;
}

export interface ObservationTypeConfig {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ObservationSummary {
  id: string;
  subject_id: string;
  summary_text: string;
  start_date: string;
  end_date: string;
  observation_count: number;
  last_observation_id: string | null;
  requested_by_user_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  subject?: Subject;
  requested_by?: User;
}

export interface Database {
  public: {
    Tables: {
      centers: {
        Row: Center;
        Insert: Omit<Center, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Center, 'id' | 'created_at' | 'updated_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_centers: {
        Row: UserCenter;
        Insert: Omit<UserCenter, 'id' | 'created_at'>;
        Update: Partial<Omit<UserCenter, 'id' | 'created_at'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>;
      };
      observations: {
        Row: Observation;
        Insert: Omit<Observation, 'id' | 'created_at' | 'updated_at' | 'logged_at'>;
        Update: Partial<Omit<Observation, 'id' | 'created_at' | 'updated_at' | 'logged_at'>>;
      };
      observation_type_config: {
        Row: ObservationTypeConfig;
        Insert: Omit<ObservationTypeConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ObservationTypeConfig, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
