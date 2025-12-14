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
      assets: {
        Row: {
          code: string
          created_at: string | null
          id: string
          image_url: string | null
          location: string
          name: string
          status: string | null
          // Enhanced extraction fields
          manufacturer: string | null
          model_number: string | null
          serial_number: string | null
          category: string | null
          criticality: string | null
          specifications: Json | null
          model_configurations: Json | null
          integrated_subsystems: Json | null
          electrical_components: Json | null
          motor_protection_settings: Json | null
          diagnostic_codes: Json | null
          specification_tables: Json | null
          completeness_score: number | null
          extraction_metadata: Json | null
          ai_extraction_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          location: string
          name: string
          status?: string | null
          // Enhanced extraction fields (all optional)
          manufacturer?: string | null
          model_number?: string | null
          serial_number?: string | null
          category?: string | null
          criticality?: string | null
          specifications?: Json | null
          model_configurations?: Json | null
          integrated_subsystems?: Json | null
          electrical_components?: Json | null
          motor_protection_settings?: Json | null
          diagnostic_codes?: Json | null
          specification_tables?: Json | null
          completeness_score?: number | null
          extraction_metadata?: Json | null
          ai_extraction_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          status?: string | null
          // Enhanced extraction fields
          manufacturer?: string | null
          model_number?: string | null
          serial_number?: string | null
          category?: string | null
          criticality?: string | null
          specifications?: Json | null
          model_configurations?: Json | null
          integrated_subsystems?: Json | null
          electrical_components?: Json | null
          motor_protection_settings?: Json | null
          diagnostic_codes?: Json | null
          specification_tables?: Json | null
          completeness_score?: number | null
          extraction_metadata?: Json | null
          ai_extraction_id?: string | null
        }
        Relationships: []
      }
      ai_extractions: {
        Row: {
          id: string
          profile_id: string
          file_name: string
          file_url: string
          file_type: string
          model_used: string
          tokens_used: number
          cost_usd: number
          confidence_score: number | null
          extracted_assets_count: number
          extracted_components_count: number
          extracted_parts_count: number
          raw_response: Json
          processing_time_ms: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          file_name: string
          file_url: string
          file_type: string
          model_used?: string
          tokens_used: number
          cost_usd: number
          confidence_score?: number | null
          extracted_assets_count?: number
          extracted_components_count?: number
          extracted_parts_count?: number
          raw_response: Json
          processing_time_ms?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          file_name?: string
          file_url?: string
          file_type?: string
          model_used?: string
          tokens_used?: number
          cost_usd?: number
          confidence_score?: number | null
          extracted_assets_count?: number
          extracted_components_count?: number
          extracted_parts_count?: number
          raw_response?: Json
          processing_time_ms?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory: {

        Row: {
          created_at: string | null
          id: string
          location: string | null
          min_threshold: number | null
          name: string
          reference: string
          stock_qty: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          min_threshold?: number | null
          name: string
          reference: string
          stock_qty?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          min_threshold?: number | null
          name?: string
          reference?: string
          stock_qty?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      work_order_parts: {
        Row: {
          created_at: string | null
          id: string
          part_id: string
          quantity_used: number
          work_order_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          part_id: string
          quantity_used: number
          work_order_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          part_id?: string
          quantity_used?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          asset_id: string
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          solution_notes: string | null
          status: string | null
        }
        Insert: {
          asset_id: string
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          solution_notes?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          solution_notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
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
