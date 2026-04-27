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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      meal_plan_items: {
        Row: {
          calories: number
          created_at: string
          grams: number | null
          id: string
          meal_type: string
          name: string
          position: number
          protein_g: number
          user_id: string
          weekday: number
        }
        Insert: {
          calories?: number
          created_at?: string
          grams?: number | null
          id?: string
          meal_type?: string
          name: string
          position?: number
          protein_g?: number
          user_id: string
          weekday: number
        }
        Update: {
          calories?: number
          created_at?: string
          grams?: number | null
          id?: string
          meal_type?: string
          name?: string
          position?: number
          protein_g?: number
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          created_at: string
          date: string
          grams: number | null
          id: string
          meal_type: string
          name: string
          protein_g: number
          user_id: string
        }
        Insert: {
          calories?: number
          created_at?: string
          date?: string
          grams?: number | null
          id?: string
          meal_type?: string
          name: string
          protein_g?: number
          user_id: string
        }
        Update: {
          calories?: number
          created_at?: string
          date?: string
          grams?: number | null
          id?: string
          meal_type?: string
          name?: string
          protein_g?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string
          daily_calorie_goal: number
          daily_protein_goal: number
          display_name: string | null
          gender: string | null
          goal_type: string | null
          height_cm: number | null
          id: string
          onboarded: boolean
          preferred_weigh_day: number
          updated_at: string
          weight_track_frequency: string
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_calorie_goal?: number
          daily_protein_goal?: number
          display_name?: string | null
          gender?: string | null
          goal_type?: string | null
          height_cm?: number | null
          id: string
          onboarded?: boolean
          preferred_weigh_day?: number
          updated_at?: string
          weight_track_frequency?: string
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_calorie_goal?: number
          daily_protein_goal?: number
          display_name?: string | null
          gender?: string | null
          goal_type?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean
          preferred_weigh_day?: number
          updated_at?: string
          weight_track_frequency?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_plan_items: {
        Row: {
          body_part: string
          created_at: string
          exercise_name: string
          id: string
          position: number
          target_reps: number
          target_sets: number
          target_weight_kg: number
          user_id: string
          weekday: number
        }
        Insert: {
          body_part: string
          created_at?: string
          exercise_name: string
          id?: string
          position?: number
          target_reps?: number
          target_sets?: number
          target_weight_kg?: number
          user_id: string
          weekday: number
        }
        Update: {
          body_part?: string
          created_at?: string
          exercise_name?: string
          id?: string
          position?: number
          target_reps?: number
          target_sets?: number
          target_weight_kg?: number
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          created_at: string
          id: string
          reps: number
          set_number: number
          user_id: string
          weight_kg: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reps: number
          set_number: number
          user_id: string
          weight_kg?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reps?: number
          set_number?: number
          user_id?: string
          weight_kg?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          body_part: string
          created_at: string
          date: string
          exercise_name: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          body_part: string
          created_at?: string
          date?: string
          exercise_name: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          body_part?: string
          created_at?: string
          date?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
