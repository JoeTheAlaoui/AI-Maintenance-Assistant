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
      ai_extractions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          file_name: string | null
          id: string
          model_used: string | null
          profile_id: string
          tokens_used: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          file_name?: string | null
          id?: string
          model_used?: string | null
          profile_id: string
          tokens_used?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          file_name?: string | null
          id?: string
          model_used?: string | null
          profile_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_aliases: {
        Row: {
          id: string
          asset_id: string
          alias: string
          alias_normalized: string
          language: string | null
          is_primary: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          alias: string
          alias_normalized?: string
          language?: string | null
          is_primary?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          alias?: string
          alias_normalized?: string
          language?: string | null
          is_primary?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_aliases_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_documents: {
        Row: {
          asset_id: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          processed_at: string | null
          processing_status: string | null
          total_chunks: number | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          total_chunks?: number | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          total_chunks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          ai_extraction_id: string | null
          category: string | null
          code: string
          completeness_score: number | null
          components: Json | null
          created_at: string | null
          created_by: string | null
          criticality: string | null
          depth: number | null
          diagnostic_codes: Json | null
          electrical_components: Json | null
          extraction_confidence: number | null
          extraction_metadata: Json | null
          full_maintenance_schedule: Json | null
          id: string
          image_url: string | null
          installation_date: string | null
          integrated_subsystems: Json | null
          level: string | null
          location: string
          manufacturer: string | null
          metadata: Json | null
          model_configurations: Json | null
          model_number: string | null
          motor_protection_settings: Json | null
          name: string
          organization_id: string | null
          parent_id: string | null
          path: string | null
          pdf_filename: string | null
          purchase_date: string | null
          serial_number: string | null
          specification_tables: Json | null
          specifications: Json | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          warranty_expiry: string | null
        }
        Insert: {
          ai_extraction_id?: string | null
          category?: string | null
          code: string
          completeness_score?: number | null
          components?: Json | null
          created_at?: string | null
          created_by?: string | null
          criticality?: string | null
          depth?: number | null
          diagnostic_codes?: Json | null
          electrical_components?: Json | null
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          full_maintenance_schedule?: Json | null
          id?: string
          image_url?: string | null
          installation_date?: string | null
          integrated_subsystems?: Json | null
          level?: string | null
          location: string
          manufacturer?: string | null
          metadata?: Json | null
          model_configurations?: Json | null
          model_number?: string | null
          motor_protection_settings?: Json | null
          name: string
          organization_id?: string | null
          parent_id?: string | null
          path?: string | null
          pdf_filename?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          specification_tables?: Json | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          ai_extraction_id?: string | null
          category?: string | null
          code?: string
          completeness_score?: number | null
          components?: Json | null
          created_at?: string | null
          created_by?: string | null
          criticality?: string | null
          depth?: number | null
          diagnostic_codes?: Json | null
          electrical_components?: Json | null
          extraction_confidence?: number | null
          extraction_metadata?: Json | null
          full_maintenance_schedule?: Json | null
          id?: string
          image_url?: string | null
          installation_date?: string | null
          integrated_subsystems?: Json | null
          level?: string | null
          location?: string
          manufacturer?: string | null
          metadata?: Json | null
          model_configurations?: Json | null
          model_number?: string | null
          motor_protection_settings?: Json | null
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          path?: string | null
          pdf_filename?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          specification_tables?: Json | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_ai_extraction_id_fkey"
            columns: ["ai_extraction_id"]
            isOneToOne: false
            referencedRelation: "ai_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          asset_id: string | null
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          page_number: number | null
        }
        Insert: {
          asset_id?: string | null
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
        }
        Update: {
          asset_id?: string | null
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
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
          organization_id: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
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
      match_document_chunks: {
        Args: {
          match_asset_id: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
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
  public: {
    Enums: {},
  },
} as const
