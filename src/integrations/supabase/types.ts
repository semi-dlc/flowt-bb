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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          agreed_price: number
          carrier_id: string
          created_at: string
          id: string
          offer_id: string
          request_id: string
          shipper_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
          weight_kg: number
        }
        Insert: {
          agreed_price: number
          carrier_id: string
          created_at?: string
          id?: string
          offer_id: string
          request_id: string
          shipper_id: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          weight_kg: number
        }
        Update: {
          agreed_price?: number
          carrier_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          request_id?: string
          shipper_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "shipment_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          company_type: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          company_type?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          company_type?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipment_offers: {
        Row: {
          arrival_date: string | null
          available_volume_m3: number | null
          available_weight_kg: number
          cargo_types: Database["public"]["Enums"]["cargo_type"][]
          created_at: string
          departure_date: string
          destination_city: string
          destination_country: string
          id: string
          notes: string | null
          origin_city: string
          origin_country: string
          price_per_kg: number | null
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          arrival_date?: string | null
          available_volume_m3?: number | null
          available_weight_kg: number
          cargo_types: Database["public"]["Enums"]["cargo_type"][]
          created_at?: string
          departure_date: string
          destination_city: string
          destination_country: string
          id?: string
          notes?: string | null
          origin_city: string
          origin_country: string
          price_per_kg?: number | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          arrival_date?: string | null
          available_volume_m3?: number | null
          available_weight_kg?: number
          cargo_types?: Database["public"]["Enums"]["cargo_type"][]
          created_at?: string
          departure_date?: string
          destination_city?: string
          destination_country?: string
          id?: string
          notes?: string | null
          origin_city?: string
          origin_country?: string
          price_per_kg?: number | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      shipment_requests: {
        Row: {
          cargo_type: Database["public"]["Enums"]["cargo_type"]
          created_at: string
          destination_city: string
          destination_country: string
          id: string
          max_price_per_kg: number | null
          needed_date: string
          origin_city: string
          origin_country: string
          special_requirements: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
          user_id: string
          volume_m3: number | null
          weight_kg: number
        }
        Insert: {
          cargo_type: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          destination_city: string
          destination_country: string
          id?: string
          max_price_per_kg?: number | null
          needed_date: string
          origin_city: string
          origin_country: string
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          user_id: string
          volume_m3?: number | null
          weight_kg: number
        }
        Update: {
          cargo_type?: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          destination_city?: string
          destination_country?: string
          id?: string
          max_price_per_kg?: number | null
          needed_date?: string
          origin_city?: string
          origin_country?: string
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
          user_id?: string
          volume_m3?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          company_name: string | null
          company_type: string | null
          created_at: string | null
          id: string | null
        }
        Insert: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string | null
        }
        Update: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_developer: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "developer" | "user"
      cargo_type:
        | "pallets"
        | "containers"
        | "bulk"
        | "refrigerated"
        | "hazardous"
        | "other"
      shipment_status:
        | "active"
        | "matched"
        | "in_transit"
        | "completed"
        | "cancelled"
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
      app_role: ["developer", "user"],
      cargo_type: [
        "pallets",
        "containers",
        "bulk",
        "refrigerated",
        "hazardous",
        "other",
      ],
      shipment_status: [
        "active",
        "matched",
        "in_transit",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
