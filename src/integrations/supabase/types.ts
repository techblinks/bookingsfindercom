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
      blog_posts: {
        Row: {
          author_name: string
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_landing_pages: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          faqs: Json | null
          h1_title: string
          id: string
          intro_paragraph: string
          is_published: boolean
          main_content: string
          meta_description: string
          popular_cities: Json | null
          popular_routes: Json | null
          scheduled_publish_at: string | null
          slug: string
          title: string
          travel_tips: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          faqs?: Json | null
          h1_title: string
          id?: string
          intro_paragraph: string
          is_published?: boolean
          main_content: string
          meta_description: string
          popular_cities?: Json | null
          popular_routes?: Json | null
          scheduled_publish_at?: string | null
          slug: string
          title: string
          travel_tips?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          faqs?: Json | null
          h1_title?: string
          id?: string
          intro_paragraph?: string
          is_published?: boolean
          main_content?: string
          meta_description?: string
          popular_cities?: Json | null
          popular_routes?: Json | null
          scheduled_publish_at?: string | null
          slug?: string
          title?: string
          travel_tips?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      optimizer_requests: {
        Row: {
          created_at: string
          destination: string
          has_bags: boolean | null
          id: string
          origin: string
          priority: string
          session_id: string | null
          travel_window_end: string | null
          travel_window_start: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          destination: string
          has_bags?: boolean | null
          id?: string
          origin: string
          priority?: string
          session_id?: string | null
          travel_window_end?: string | null
          travel_window_start: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          destination?: string
          has_bags?: boolean | null
          id?: string
          origin?: string
          priority?: string
          session_id?: string | null
          travel_window_end?: string | null
          travel_window_start?: string
          user_id?: string | null
        }
        Relationships: []
      }
      optimizer_results: {
        Row: {
          affiliate_links: Json | null
          baggage_estimate: number | null
          created_at: string
          estimated_total_cost: number
          extra_fees_estimate: number | null
          fare_estimate: number | null
          id: string
          recommended_route: Json
          request_id: string
          risk_alerts: Json | null
          timing_advice: string
          timing_reason: string | null
          transfer_estimate: number | null
        }
        Insert: {
          affiliate_links?: Json | null
          baggage_estimate?: number | null
          created_at?: string
          estimated_total_cost: number
          extra_fees_estimate?: number | null
          fare_estimate?: number | null
          id?: string
          recommended_route: Json
          request_id: string
          risk_alerts?: Json | null
          timing_advice: string
          timing_reason?: string | null
          transfer_estimate?: number | null
        }
        Update: {
          affiliate_links?: Json | null
          baggage_estimate?: number | null
          created_at?: string
          estimated_total_cost?: number
          extra_fees_estimate?: number | null
          fare_estimate?: number | null
          id?: string
          recommended_route?: Json
          request_id?: string
          risk_alerts?: Json | null
          timing_advice?: string
          timing_reason?: string | null
          transfer_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "optimizer_results_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "optimizer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      press_releases: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          source?: string | null
          title?: string
          updated_at?: string
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
      seo_route_pages: {
        Row: {
          created_at: string
          destination_city: string
          destination_iata: string
          faqs: Json | null
          generation_status: string
          h1_title: string
          id: string
          intro_paragraph: string
          is_published: boolean
          main_content: string
          meta_description: string
          origin_city: string
          origin_iata: string
          related_routes: Json | null
          slug: string
          title: string
          travel_tips: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_city: string
          destination_iata: string
          faqs?: Json | null
          generation_status?: string
          h1_title: string
          id?: string
          intro_paragraph: string
          is_published?: boolean
          main_content: string
          meta_description: string
          origin_city: string
          origin_iata: string
          related_routes?: Json | null
          slug: string
          title: string
          travel_tips?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_city?: string
          destination_iata?: string
          faqs?: Json | null
          generation_status?: string
          h1_title?: string
          id?: string
          intro_paragraph?: string
          is_published?: boolean
          main_content?: string
          meta_description?: string
          origin_city?: string
          origin_iata?: string
          related_routes?: Json | null
          slug?: string
          title?: string
          travel_tips?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_subscribed: boolean
          subscribed_at: string
          subscription_source: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_subscribed?: boolean
          subscribed_at?: string
          subscription_source?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_subscribed?: boolean
          subscribed_at?: string
          subscription_source?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          last_optimizer_reset: string
          monthly_optimizer_uses: number
          plan: string
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_optimizer_reset?: string
          monthly_optimizer_uses?: number
          plan?: string
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_optimizer_reset?: string
          monthly_optimizer_uses?: number
          plan?: string
          preferences?: Json | null
          updated_at?: string
          user_id?: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
