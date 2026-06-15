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
      duplicate_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          lat: number
          lng: number
          month_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          lat: number
          lng: number
          month_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          month_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          total_points: number
          total_reports: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          level?: number
          total_points?: number
          total_reports?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          total_points?: number
          total_reports?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      report_photos: {
        Row: {
          ai_confidence: number | null
          ai_description: string | null
          created_at: string
          detected_type: Database["public"]["Enums"]["trash_type"] | null
          display_order: number
          id: string
          is_valid_trash: boolean | null
          public_url: string
          report_id: string
          storage_path: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_description?: string | null
          created_at?: string
          detected_type?: Database["public"]["Enums"]["trash_type"] | null
          display_order?: number
          id?: string
          is_valid_trash?: boolean | null
          public_url: string
          report_id: string
          storage_path: string
        }
        Update: {
          ai_confidence?: number | null
          ai_description?: string | null
          created_at?: string
          detected_type?: Database["public"]["Enums"]["trash_type"] | null
          display_order?: number
          id?: string
          is_valid_trash?: boolean | null
          public_url?: string
          report_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          address: string | null
          ai_rejection_reason: string | null
          ai_summary: string | null
          amphoe: string | null
          created_at: string
          estimated_items: number
          geocode_source: string | null
          id: string
          latitude: number
          longitude: number
          note: string | null
          photo_count: number
          points_awarded: number
          primary_trash_type: Database["public"]["Enums"]["trash_type"] | null
          province: string | null
          status: Database["public"]["Enums"]["report_status"]
          tambon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          ai_rejection_reason?: string | null
          ai_summary?: string | null
          amphoe?: string | null
          created_at?: string
          estimated_items?: number
          geocode_source?: string | null
          id?: string
          latitude: number
          longitude: number
          note?: string | null
          photo_count?: number
          points_awarded?: number
          primary_trash_type?: Database["public"]["Enums"]["trash_type"] | null
          province?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tambon?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          ai_rejection_reason?: string | null
          ai_summary?: string | null
          amphoe?: string | null
          created_at?: string
          estimated_items?: number
          geocode_source?: string | null
          id?: string
          latitude?: number
          longitude?: number
          note?: string | null
          photo_count?: number
          points_awarded?: number
          primary_trash_type?: Database["public"]["Enums"]["trash_type"] | null
          province?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tambon?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trash_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name_en: string
          name_th: string
          points_per_item: number
          type: Database["public"]["Enums"]["trash_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name_en: string
          name_th: string
          points_per_item?: number
          type: Database["public"]["Enums"]["trash_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name_en?: string
          name_th?: string
          points_per_item?: number
          type?: Database["public"]["Enums"]["trash_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      distance_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      report_status: "pending" | "analyzing" | "approved" | "rejected"
      trash_type:
        | "plastic"
        | "paper"
        | "glass"
        | "metal"
        | "organic"
        | "hazardous"
        | "electronic"
        | "general"
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
      app_role: ["admin", "user"],
      report_status: ["pending", "analyzing", "approved", "rejected"],
      trash_type: [
        "plastic",
        "paper",
        "glass",
        "metal",
        "organic",
        "hazardous",
        "electronic",
        "general",
      ],
    },
  },
} as const
