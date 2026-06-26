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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          created_at: string
          display_order: number
          district_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          district_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          district_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string
          district_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          bps: number | null
          category: string | null
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          bps?: number | null
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          bps?: number | null
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string
          display_order: number
          id: string
          kind: Database["public"]["Enums"]["district_kind"]
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["district_kind"]
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["district_kind"]
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      police_stations: {
        Row: {
          circle_id: string
          created_at: string
          district_id: string
          id: string
          name: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          district_id: string
          id?: string
          name: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          district_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "police_stations_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "police_stations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sanctioned_strength: {
        Row: {
          created_at: string
          designation_id: string
          district_id: string | null
          id: string
          remarks: string | null
          sanctioned_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation_id: string
          district_id?: string | null
          id?: string
          remarks?: string | null
          sanctioned_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation_id?: string
          district_id?: string | null
          id?: string
          remarks?: string | null
          sanctioned_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctioned_strength_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctioned_strength_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          attachment_details: string | null
          bps: number | null
          cadre: string | null
          circle_id: string | null
          cnic: string | null
          created_at: string
          created_by: string | null
          current_posting: string | null
          date_of_birth: string | null
          date_of_joining: string | null
          designation_id: string | null
          district_id: string
          duty_status: Database["public"]["Enums"]["duty_status"]
          employee_id: string | null
          father_name: string | null
          full_name: string
          id: string
          mobile: string | null
          photo_url: string | null
          police_station_id: string | null
          posting_type: Database["public"]["Enums"]["posting_type"]
          previous_posting: string | null
          remarks: string | null
          service_number: string | null
          updated_at: string
        }
        Insert: {
          attachment_details?: string | null
          bps?: number | null
          cadre?: string | null
          circle_id?: string | null
          cnic?: string | null
          created_at?: string
          created_by?: string | null
          current_posting?: string | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          designation_id?: string | null
          district_id: string
          duty_status?: Database["public"]["Enums"]["duty_status"]
          employee_id?: string | null
          father_name?: string | null
          full_name: string
          id?: string
          mobile?: string | null
          photo_url?: string | null
          police_station_id?: string | null
          posting_type?: Database["public"]["Enums"]["posting_type"]
          previous_posting?: string | null
          remarks?: string | null
          service_number?: string | null
          updated_at?: string
        }
        Update: {
          attachment_details?: string | null
          bps?: number | null
          cadre?: string | null
          circle_id?: string | null
          cnic?: string | null
          created_at?: string
          created_by?: string | null
          current_posting?: string | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          designation_id?: string | null
          district_id?: string
          duty_status?: Database["public"]["Enums"]["duty_status"]
          employee_id?: string | null
          father_name?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          photo_url?: string | null
          police_station_id?: string | null
          posting_type?: Database["public"]["Enums"]["posting_type"]
          previous_posting?: string | null
          remarks?: string | null
          service_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_police_station_id_fkey"
            columns: ["police_station_id"]
            isOneToOne: false
            referencedRelation: "police_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          attachment_end_date: string | null
          created_at: string
          created_by: string | null
          effective_date: string | null
          from_circle_id: string | null
          from_district_id: string | null
          from_police_station_id: string | null
          from_posting_type: Database["public"]["Enums"]["posting_type"] | null
          id: string
          order_date: string
          order_number: string | null
          remarks: string | null
          staff_id: string
          to_circle_id: string | null
          to_district_id: string
          to_police_station_id: string | null
          to_posting_type: Database["public"]["Enums"]["posting_type"]
          transfer_kind: Database["public"]["Enums"]["transfer_kind"]
        }
        Insert: {
          attachment_end_date?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_circle_id?: string | null
          from_district_id?: string | null
          from_police_station_id?: string | null
          from_posting_type?: Database["public"]["Enums"]["posting_type"] | null
          id?: string
          order_date?: string
          order_number?: string | null
          remarks?: string | null
          staff_id: string
          to_circle_id?: string | null
          to_district_id: string
          to_police_station_id?: string | null
          to_posting_type: Database["public"]["Enums"]["posting_type"]
          transfer_kind: Database["public"]["Enums"]["transfer_kind"]
        }
        Update: {
          attachment_end_date?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_circle_id?: string | null
          from_district_id?: string | null
          from_police_station_id?: string | null
          from_posting_type?: Database["public"]["Enums"]["posting_type"] | null
          id?: string
          order_date?: string
          order_number?: string | null
          remarks?: string | null
          staff_id?: string
          to_circle_id?: string | null
          to_district_id?: string
          to_police_station_id?: string | null
          to_posting_type?: Database["public"]["Enums"]["posting_type"]
          transfer_kind?: Database["public"]["Enums"]["transfer_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_circle_id_fkey"
            columns: ["from_circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_district_id_fkey"
            columns: ["from_district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_police_station_id_fkey"
            columns: ["from_police_station_id"]
            isOneToOne: false
            referencedRelation: "police_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_circle_id_fkey"
            columns: ["to_circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_district_id_fkey"
            columns: ["to_district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_police_station_id_fkey"
            columns: ["to_police_station_id"]
            isOneToOne: false
            referencedRelation: "police_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          district_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          district_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_district: {
        Args: { _district_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_district: {
        Args: { _district_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_district: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "district_admin" | "read_only"
      district_kind: "region" | "district"
      duty_status:
        | "active"
        | "attached"
        | "osd"
        | "headquarters"
        | "leave"
        | "suspension"
        | "retired"
        | "vacant"
      posting_type:
        | "regional_office"
        | "district_office"
        | "circle_office"
        | "police_station"
        | "headquarters"
        | "attachment_in"
        | "attachment_out"
        | "osd"
      transfer_kind:
        | "within_district"
        | "between_districts"
        | "to_region"
        | "to_hq"
        | "to_district_police"
        | "attachment"
        | "return_from_attachment"
        | "other"
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
      app_role: ["super_admin", "district_admin", "read_only"],
      district_kind: ["region", "district"],
      duty_status: [
        "active",
        "attached",
        "osd",
        "headquarters",
        "leave",
        "suspension",
        "retired",
        "vacant",
      ],
      posting_type: [
        "regional_office",
        "district_office",
        "circle_office",
        "police_station",
        "headquarters",
        "attachment_in",
        "attachment_out",
        "osd",
      ],
      transfer_kind: [
        "within_district",
        "between_districts",
        "to_region",
        "to_hq",
        "to_district_police",
        "attachment",
        "return_from_attachment",
        "other",
      ],
    },
  },
} as const
