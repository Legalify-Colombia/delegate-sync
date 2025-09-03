// Custom types for multi-model system
// These extend the auto-generated Supabase types

import { Database } from './types';

// Extended Profile type with model_id
export interface ExtendedProfile {
  id: string;
  full_name: string;
  role: Database['public']['Enums']['app_role'];
  committee_id: string | null;
  country_id: string | null;
  model_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  Photo_url?: string | null;
  "Entidad que representa"?: string | null;
}

// Model type (since it's not in generated types)
export interface Model {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  created_at: string;
  participant_count?: number;
}

// Committee type with model_id
export interface ExtendedCommittee {
  id: string;
  name: string;
  topic: string;
  current_status: Database['public']['Enums']['committee_status'] | null;
  model_id: string;
  created_at: string | null;
  updated_at: string | null;
  session_started_at: string | null;
  session_accumulated_seconds: number;
  current_timer_end: string | null;
  current_timer_remaining_seconds: number | null;
}

// Country type (from generated types)
export type Country = Database['public']['Tables']['countries']['Row'];

// Utility type for safe database operations
export type SafeSupabaseQuery<T> = {
  data: T[] | null;
  error: any;
  count?: number | null;
};

// Type guards
export function isExtendedProfile(obj: any): obj is ExtendedProfile {
  return obj && typeof obj === 'object' && 'id' in obj && 'full_name' in obj && 'role' in obj;
}

export function isModel(obj: any): obj is Model {
  return obj && typeof obj === 'object' && 'id' in obj && 'name' in obj;
}

export function isExtendedCommittee(obj: any): obj is ExtendedCommittee {
  return obj && typeof obj === 'object' && 'id' in obj && 'name' in obj && 'topic' in obj;
}