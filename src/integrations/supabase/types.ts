export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agenda_items: {
        Row: {
          committee_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          position: number
          started_at: string | null
          status: string
          time_allocated: number | null
          title: string
          updated_at: string
        }
        Insert: {
          committee_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          position?: number
          started_at?: string | null
          status?: string
          time_allocated?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          committee_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          position?: number
          started_at?: string | null
          status?: string
          time_allocated?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agenda_participations: {
        Row: {
          agenda_item_id: string
          committee_id: string
          created_at: string
          delegate_id: string
          ended_at: string | null
          id: string
          participation_type: string
          started_at: string | null
          time_used: number | null
        }
        Insert: {
          agenda_item_id: string
          committee_id: string
          created_at?: string
          delegate_id: string
          ended_at?: string | null
          id?: string
          participation_type?: string
          started_at?: string | null
          time_used?: number | null
        }
        Update: {
          agenda_item_id?: string
          committee_id?: string
          created_at?: string
          delegate_id?: string
          ended_at?: string | null
          id?: string
          participation_type?: string
          started_at?: string | null
          time_used?: number | null
        }
        Relationships: []
      }
      amonestaciones: {
        Row: {
          country_id: string
          created_at: string
          delegate_id: string
          id: string
          motivo: string
          secretary_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          delegate_id: string
          id?: string
          motivo: string
          secretary_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          delegate_id?: string
          id?: string
          motivo?: string
          secretary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_delegate_profile"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_secretary_profile"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_announcements_author"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia: {
        Row: {
          committee_id: string
          fecha: string
          id: string
          presente: boolean
          profile_id: string
          seccion: string | null
        }
        Insert: {
          committee_id: string
          fecha?: string
          id?: string
          presente?: boolean
          profile_id: string
          seccion?: string | null
        }
        Update: {
          committee_id?: string
          fecha?: string
          id?: string
          presente?: boolean
          profile_id?: string
          seccion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_asistencia_committee"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_asistencia_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          created_at: string | null
          current_status: Database["public"]["Enums"]["committee_status"] | null
          current_timer_end: string | null
          current_timer_remaining_seconds: number | null
          id: string
          name: string
          session_accumulated_seconds: number
          session_started_at: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_status?:
            | Database["public"]["Enums"]["committee_status"]
            | null
          current_timer_end?: string | null
          current_timer_remaining_seconds?: number | null
          id?: string
          name: string
          session_accumulated_seconds?: number
          session_started_at?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_status?:
            | Database["public"]["Enums"]["committee_status"]
            | null
          current_timer_end?: string | null
          current_timer_remaining_seconds?: number | null
          id?: string
          name?: string
          session_accumulated_seconds?: number
          session_started_at?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          flag: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          flag?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          flag?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      debate_log: {
        Row: {
          committee_id: string
          created_at: string | null
          details: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
        }
        Insert: {
          committee_id: string
          created_at?: string | null
          details?: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
        }
        Update: {
          committee_id?: string
          created_at?: string | null
          details?: Json | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_log_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      delegate_notes: {
        Row: {
          content: string
          created_at: string
          delegate_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          delegate_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          delegate_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      detailed_ratings: {
        Row: {
          additional_interventions: number
          comments: string | null
          committee_id: string
          counterproposal_quality: number
          created_at: string
          delegate_id: string
          dispositions_quality: number
          id: string
          personal_presentation: number
          secretary_id: string
          speech_appreciation: number
        }
        Insert: {
          additional_interventions: number
          comments?: string | null
          committee_id: string
          counterproposal_quality: number
          created_at?: string
          delegate_id: string
          dispositions_quality: number
          id?: string
          personal_presentation: number
          secretary_id: string
          speech_appreciation: number
        }
        Update: {
          additional_interventions?: number
          comments?: string | null
          committee_id?: string
          counterproposal_quality?: number
          created_at?: string
          delegate_id?: string
          dispositions_quality?: number
          id?: string
          personal_presentation?: number
          secretary_id?: string
          speech_appreciation?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_committee"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_delegate"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_secretary"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_publications: {
        Row: {
          author_id: string
          committee_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          committee_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          committee_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_committee"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_publications_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          committee_id: string | null
          country_id: string | null
          created_at: string | null
          "Entidad que representa": string | null
          full_name: string
          id: string
          Photo_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          committee_id?: string | null
          country_id?: string | null
          created_at?: string | null
          "Entidad que representa"?: string | null
          full_name: string
          id: string
          Photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          committee_id?: string | null
          country_id?: string | null
          created_at?: string | null
          "Entidad que representa"?: string | null
          full_name?: string
          id?: string
          Photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comments: string | null
          created_at: string | null
          delegate_id: string
          id: string
          score: number
          secretary_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          delegate_id: string
          id?: string
          score: number
          secretary_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          delegate_id?: string
          id?: string
          score?: number
          secretary_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          committee_id: string
          created_at: string | null
          delegate_id: string
          id: string
          profiles: Json | null
          status: string
          type: string
        }
        Insert: {
          committee_id: string
          created_at?: string | null
          delegate_id: string
          id?: string
          profiles?: Json | null
          status?: string
          type: string
        }
        Update: {
          committee_id?: string
          created_at?: string | null
          delegate_id?: string
          id?: string
          profiles?: Json | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_delegate_id_fkey"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      secretary_speaking: {
        Row: {
          committee_id: string
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          secretary_id: string
          started_at: string | null
        }
        Insert: {
          committee_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          secretary_id: string
          started_at?: string | null
        }
        Update: {
          committee_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          secretary_id?: string
          started_at?: string | null
        }
        Relationships: []
      }
      speaking_queue: {
        Row: {
          committee_id: string
          completed_at: string | null
          delegate_id: string
          id: string
          position: number
          requested_at: string
          started_at: string | null
          status: string
          time_allocated: number | null
          type: string | null
        }
        Insert: {
          committee_id: string
          completed_at?: string | null
          delegate_id: string
          id?: string
          position: number
          requested_at?: string
          started_at?: string | null
          status?: string
          time_allocated?: number | null
          type?: string | null
        }
        Update: {
          committee_id?: string
          completed_at?: string | null
          delegate_id?: string
          id?: string
          position?: number
          requested_at?: string
          started_at?: string | null
          status?: string
          time_allocated?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_committee"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_delegate_profile"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_requests: {
        Row: {
          assigned_to: string | null
          committee_id: string
          completed_at: string | null
          created_at: string
          description: string
          id: string
          priority: string
          requester_id: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          committee_id: string
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          requester_id: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          committee_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          requester_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_staff_requests_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          agenda_item_id: string | null
          committee_id: string
          created_at: string | null
          id: string
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          voting_round_id: string | null
          voting_session_id: string | null
        }
        Insert: {
          agenda_item_id?: string | null
          committee_id: string
          created_at?: string | null
          id?: string
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          voting_round_id?: string | null
          voting_session_id?: string | null
        }
        Update: {
          agenda_item_id?: string | null
          committee_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
          voting_round_id?: string | null
          voting_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_rounds: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          result: string | null
          round_number: number
          started_at: string | null
          status: string
          vetoed_by: string | null
          votes_abstain: number | null
          votes_against: number | null
          votes_for: number | null
          voting_session_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          result?: string | null
          round_number: number
          started_at?: string | null
          status?: string
          vetoed_by?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
          voting_session_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          result?: string | null
          round_number?: number
          started_at?: string | null
          status?: string
          vetoed_by?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
          voting_session_id?: string
        }
        Relationships: []
      }
      voting_sessions: {
        Row: {
          agenda_item_id: string | null
          allow_abstention: boolean | null
          allow_veto: boolean | null
          committee_id: string
          completed_at: string | null
          created_at: string
          current_round: number | null
          description: string | null
          id: string
          majority_threshold: number | null
          max_rounds: number | null
          started_at: string | null
          status: string
          title: string
          veto_members: string[] | null
          voting_type: string
        }
        Insert: {
          agenda_item_id?: string | null
          allow_abstention?: boolean | null
          allow_veto?: boolean | null
          committee_id: string
          completed_at?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          id?: string
          majority_threshold?: number | null
          max_rounds?: number | null
          started_at?: string | null
          status?: string
          title: string
          veto_members?: string[] | null
          voting_type?: string
        }
        Update: {
          agenda_item_id?: string | null
          allow_abstention?: boolean | null
          allow_veto?: boolean | null
          committee_id?: string
          completed_at?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          id?: string
          majority_threshold?: number | null
          max_rounds?: number | null
          started_at?: string | null
          status?: string
          title?: string
          veto_members?: string[] | null
          voting_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_committee: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      register_agenda_participation: {
        Args: {
          p_agenda_item_id: string
          p_committee_id: string
          p_delegate_id: string
          p_participation_type?: string
          p_time_used?: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "secretary_general"
        | "committee_secretary"
        | "communications_secretary"
        | "delegate"
        | "staff"
        | "press"
      committee_status: "active" | "paused" | "voting"
      event_type: "timer_start" | "timer_pause" | "vote_started" | "vote_closed"
      vote_type: "for" | "against" | "abstain"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "secretary_general",
        "committee_secretary",
        "communications_secretary",
        "delegate",
        "staff",
        "press",
      ],
      committee_status: ["active", "paused", "voting"],
      event_type: ["timer_start", "timer_pause", "vote_started", "vote_closed"],
      vote_type: ["for", "against", "abstain"],
    },
  },
} as const
