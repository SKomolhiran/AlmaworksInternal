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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          session_date_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          session_date_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          session_date_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_session_date_id_fkey"
            columns: ["session_date_id"]
            isOneToOne: false
            referencedRelation: "session_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string
          expertise_tags: string[]
          full_name: string
          id: string
          is_active: boolean
          linkedin_url: string | null
          mentorship_goals: string | null
          photo_url: string | null
          role_title: string | null
          semester_id: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string
          expertise_tags?: string[]
          full_name: string
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          mentorship_goals?: string | null
          photo_url?: string | null
          role_title?: string | null
          semester_id: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string
          expertise_tags?: string[]
          full_name?: string
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          mentorship_goals?: string | null
          photo_url?: string | null
          role_title?: string | null
          semester_id?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentors_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach: {
        Row: {
          admin_id: string
          company: string | null
          converted_mentor_id: string | null
          created_at: string
          expertise_tags: string[]
          id: string
          last_contacted_at: string | null
          linkedin_url: string | null
          notes: string | null
          prospect_email: string | null
          prospect_name: string
          semester_id: string
          status: Database["public"]["Enums"]["outreach_status"]
          updated_at: string
        }
        Insert: {
          admin_id: string
          company?: string | null
          converted_mentor_id?: string | null
          created_at?: string
          expertise_tags?: string[]
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          prospect_email?: string | null
          prospect_name: string
          semester_id: string
          status?: Database["public"]["Enums"]["outreach_status"]
          updated_at?: string
        }
        Update: {
          admin_id?: string
          company?: string | null
          converted_mentor_id?: string | null
          created_at?: string
          expertise_tags?: string[]
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          prospect_email?: string | null
          prospect_name?: string
          semester_id?: string
          status?: Database["public"]["Enums"]["outreach_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_converted_mentor_id_fkey"
            columns: ["converted_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          semester_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          semester_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          semester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      session_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          label: string | null
          semester_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          label?: string | null
          semester_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          label?: string | null
          semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_dates_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          mentor_id: string
          notes: string | null
          requested_at: string
          semester_id: string
          session_date_id: string
          startup_id: string
          status: Database["public"]["Enums"]["session_status"]
          topic: string | null
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          mentor_id: string
          notes?: string | null
          requested_at?: string
          semester_id: string
          session_date_id: string
          startup_id: string
          status?: Database["public"]["Enums"]["session_status"]
          topic?: string | null
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          mentor_id?: string
          notes?: string | null
          requested_at?: string
          semester_id?: string
          session_date_id?: string
          startup_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_session_date_id_fkey"
            columns: ["session_date_id"]
            isOneToOne: false
            referencedRelation: "session_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          created_at: string
          description: string | null
          founder_name: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          mentor_preferences: string | null
          name: string
          preferred_tags: string[]
          semester_goals: string[]
          semester_id: string
          stage: Database["public"]["Enums"]["startup_stage"] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          founder_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          mentor_preferences?: string | null
          name: string
          preferred_tags?: string[]
          semester_goals?: string[]
          semester_id: string
          stage?: Database["public"]["Enums"]["startup_stage"] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          founder_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          mentor_preferences?: string | null
          name?: string
          preferred_tags?: string[]
          semester_goals?: string[]
          semester_id?: string
          stage?: Database["public"]["Enums"]["startup_stage"] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      outreach_status: "prospect" | "contacted" | "responded" | "onboarded"
      session_status: "pending" | "confirmed" | "declined"
      startup_stage: "idea" | "mvp" | "growth"
      user_role: "mentor" | "startup" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      outreach_status: ["prospect", "contacted", "responded", "onboarded"],
      session_status: ["pending", "confirmed", "declined"],
      startup_stage: ["idea", "mvp", "growth"],
      user_role: ["mentor", "startup", "admin"],
    },
  },
} as const
