export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      personal_bests: {
        Row: {
          achieved_at: string
          created_at: string
          id: number
          metric: string
          session_id: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: number
          metric: string
          session_id?: string | null
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: number
          metric?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_bests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_embeddings: {
        Row: {
          created_at: string
          embedding: string | null
          id: number
          model_name: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: number
          model_name?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: number
          model_name?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_embeddings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_splits: {
        Row: {
          avg_power_w: number
          avg_stroke_rate_spm: number
          created_at: string
          duration_seconds: number
          id: number
          session_id: string
          split_number: number
          stroke_count: number
          user_id: string
        }
        Insert: {
          avg_power_w: number
          avg_stroke_rate_spm: number
          created_at?: string
          duration_seconds: number
          id?: number
          session_id: string
          split_number: number
          stroke_count: number
          user_id: string
        }
        Update: {
          avg_power_w?: number
          avg_stroke_rate_spm?: number
          created_at?: string
          duration_seconds?: number
          id?: number
          session_id?: string
          split_number?: number
          stroke_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_splits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_telemetry: {
        Row: {
          avg_pace_s500m: number | null
          avg_power_w: number | null
          avg_stroke_rate_spm: number | null
          elapsed_time_s: number
          heart_rate_bpm: number | null
          id: number
          instant_pace_s500m: number | null
          instant_power_w: number | null
          met: number | null
          recorded_at: string
          remaining_time_s: number | null
          resistance_level: number | null
          session_id: string
          stroke_count: number | null
          stroke_rate_spm: number | null
          total_distance_m: number | null
          total_energy_kcal: number | null
          user_id: string
        }
        Insert: {
          avg_pace_s500m?: number | null
          avg_power_w?: number | null
          avg_stroke_rate_spm?: number | null
          elapsed_time_s: number
          heart_rate_bpm?: number | null
          id?: number
          instant_pace_s500m?: number | null
          instant_power_w?: number | null
          met?: number | null
          recorded_at?: string
          remaining_time_s?: number | null
          resistance_level?: number | null
          session_id: string
          stroke_count?: number | null
          stroke_rate_spm?: number | null
          total_distance_m?: number | null
          total_energy_kcal?: number | null
          user_id: string
        }
        Update: {
          avg_pace_s500m?: number | null
          avg_power_w?: number | null
          avg_stroke_rate_spm?: number | null
          elapsed_time_s?: number
          heart_rate_bpm?: number | null
          id?: number
          instant_pace_s500m?: number | null
          instant_power_w?: number | null
          met?: number | null
          recorded_at?: string
          remaining_time_s?: number | null
          resistance_level?: number | null
          session_id?: string
          stroke_count?: number | null
          stroke_rate_spm?: number | null
          total_distance_m?: number | null
          total_energy_kcal?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_telemetry_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          avg_heart_rate: number | null
          avg_pace_s500m: number | null
          avg_power_watts: number | null
          avg_stroke_rate: number | null
          created_at: string
          device_name: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          max_power_watts: number | null
          started_at: string
          status: string
          total_distance_m: number | null
          total_energy_kcal: number | null
          total_strokes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          avg_pace_s500m?: number | null
          avg_power_watts?: number | null
          avg_stroke_rate?: number | null
          created_at?: string
          device_name?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_power_watts?: number | null
          started_at?: string
          status?: string
          total_distance_m?: number | null
          total_energy_kcal?: number | null
          total_strokes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          avg_pace_s500m?: number | null
          avg_power_watts?: number | null
          avg_stroke_rate?: number | null
          created_at?: string
          device_name?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_power_watts?: number | null
          started_at?: string
          status?: string
          total_distance_m?: number | null
          total_energy_kcal?: number | null
          total_strokes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_session_summary: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      get_ghost_position: {
        Args: { p_elapsed_time: number; p_session_id: string }
        Returns: {
          avg_pace_s500m: number | null
          avg_power_w: number | null
          avg_stroke_rate_spm: number | null
          elapsed_time_s: number
          heart_rate_bpm: number | null
          id: number
          instant_pace_s500m: number | null
          instant_power_w: number | null
          met: number | null
          recorded_at: string
          remaining_time_s: number | null
          resistance_level: number | null
          session_id: string
          stroke_count: number | null
          stroke_rate_spm: number | null
          total_distance_m: number | null
          total_energy_kcal: number | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "session_telemetry"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ghost_position_at_distance: {
        Args: { p_distance_m: number; p_session_id: string }
        Returns: {
          avg_pace_s500m: number | null
          avg_power_w: number | null
          avg_stroke_rate_spm: number | null
          elapsed_time_s: number
          heart_rate_bpm: number | null
          id: number
          instant_pace_s500m: number | null
          instant_power_w: number | null
          met: number | null
          recorded_at: string
          remaining_time_s: number | null
          resistance_level: number | null
          session_id: string
          stroke_count: number | null
          stroke_rate_spm: number | null
          total_distance_m: number | null
          total_energy_kcal: number | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "session_telemetry"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

