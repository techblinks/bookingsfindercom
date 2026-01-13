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
  public: {
    Tables: {
      ad_placements: {
        Row: {
          advertiser_name: string | null
          clicks: number
          created_at: string
          cta_text: string | null
          description: string | null
          destination_url: string | null
          device: string
          end_date: string | null
          geo: string[] | null
          html_content: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          name: string
          page: string
          placement: string
          priority: number
          start_date: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          advertiser_name?: string | null
          clicks?: number
          created_at?: string
          cta_text?: string | null
          description?: string | null
          destination_url?: string | null
          device?: string
          end_date?: string | null
          geo?: string[] | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          name: string
          page: string
          placement: string
          priority?: number
          start_date?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          advertiser_name?: string | null
          clicks?: number
          created_at?: string
          cta_text?: string | null
          description?: string | null
          destination_url?: string | null
          device?: string
          end_date?: string | null
          geo?: string[] | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          name?: string
          page?: string
          placement?: string
          priority?: number
          start_date?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          action: string
          airline_code: string | null
          created_at: string
          currency: string | null
          departure_date: string | null
          destination: string | null
          flight_number: string | null
          hotel_id: string | null
          id: string
          origin: string | null
          price: number | null
          redirect_url: string | null
          return_date: string | null
          type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          airline_code?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          destination?: string | null
          flight_number?: string | null
          hotel_id?: string | null
          id?: string
          origin?: string | null
          price?: number | null
          redirect_url?: string | null
          return_date?: string | null
          type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          airline_code?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          destination?: string | null
          flight_number?: string | null
          hotel_id?: string | null
          id?: string
          origin?: string | null
          price?: number | null
          redirect_url?: string | null
          return_date?: string | null
          type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      authorized_admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: string
          price: number
          recorded_at: string
          saved_search_id: string
        }
        Insert: {
          id?: string
          price: number
          recorded_at?: string
          saved_search_id: string
        }
        Update: {
          id?: string
          price?: number
          recorded_at?: string
          saved_search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      route_price_cache: {
        Row: {
          cached_at: string
          currency: string
          departure_date: string
          destination: string
          expires_at: string
          id: string
          origin: string
          price: number | null
          return_date: string | null
        }
        Insert: {
          cached_at?: string
          currency?: string
          departure_date: string
          destination: string
          expires_at?: string
          id?: string
          origin: string
          price?: number | null
          return_date?: string | null
        }
        Update: {
          cached_at?: string
          currency?: string
          departure_date?: string
          destination?: string
          expires_at?: string
          id?: string
          origin?: string
          price?: number | null
          return_date?: string | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          cabin_class: string
          created_at: string
          current_lowest_price: number | null
          departure_date: string
          destination: string
          email: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          origin: string
          passengers: number
          return_date: string | null
          target_price: number | null
          updated_at: string
        }
        Insert: {
          cabin_class?: string
          created_at?: string
          current_lowest_price?: number | null
          departure_date: string
          destination: string
          email: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          origin: string
          passengers?: number
          return_date?: string | null
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          cabin_class?: string
          created_at?: string
          current_lowest_price?: number | null
          departure_date?: string
          destination?: string
          email?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          origin?: string
          passengers?: number
          return_date?: string | null
          target_price?: number | null
          updated_at?: string
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
      cleanup_expired_price_cache: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
