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
          placement: string | null
          price: number | null
          redirect_url: string | null
          return_date: string | null
          source_page: string | null
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
          placement?: string | null
          price?: number | null
          redirect_url?: string | null
          return_date?: string | null
          source_page?: string | null
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
          placement?: string | null
          price?: number | null
          redirect_url?: string | null
          return_date?: string | null
          source_page?: string | null
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
      click_events: {
        Row: {
          airline: string | null
          created_at: string
          currency: string | null
          device: string | null
          fallback_used: boolean | null
          id: string
          landing_page: string | null
          outbound_host: string | null
          partner: string
          partner_type: string | null
          price: number | null
          route: string | null
          search_event_id: string | null
          session_id: string
          white_label_used: boolean | null
        }
        Insert: {
          airline?: string | null
          created_at?: string
          currency?: string | null
          device?: string | null
          fallback_used?: boolean | null
          id?: string
          landing_page?: string | null
          outbound_host?: string | null
          partner: string
          partner_type?: string | null
          price?: number | null
          route?: string | null
          search_event_id?: string | null
          session_id: string
          white_label_used?: boolean | null
        }
        Update: {
          airline?: string | null
          created_at?: string
          currency?: string | null
          device?: string | null
          fallback_used?: boolean | null
          id?: string
          landing_page?: string | null
          outbound_host?: string | null
          partner?: string
          partner_type?: string | null
          price?: number | null
          route?: string | null
          search_event_id?: string | null
          session_id?: string
          white_label_used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "click_events_search_event_id_fkey"
            columns: ["search_event_id"]
            isOneToOne: false
            referencedRelation: "search_events"
            referencedColumns: ["id"]
          },
        ]
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
      daily_metrics: {
        Row: {
          created_at: string
          ctr: number | null
          date: string
          fallback_clicks: number | null
          flight_clicks: number | null
          flight_searches: number | null
          hotel_clicks: number | null
          hotel_searches: number | null
          id: string
          total_clicks: number | null
          total_searches: number | null
          unique_sessions: number | null
          updated_at: string
          white_label_clicks: number | null
        }
        Insert: {
          created_at?: string
          ctr?: number | null
          date: string
          fallback_clicks?: number | null
          flight_clicks?: number | null
          flight_searches?: number | null
          hotel_clicks?: number | null
          hotel_searches?: number | null
          id?: string
          total_clicks?: number | null
          total_searches?: number | null
          unique_sessions?: number | null
          updated_at?: string
          white_label_clicks?: number | null
        }
        Update: {
          created_at?: string
          ctr?: number | null
          date?: string
          fallback_clicks?: number | null
          flight_clicks?: number | null
          flight_searches?: number | null
          hotel_clicks?: number | null
          hotel_searches?: number | null
          id?: string
          total_clicks?: number | null
          total_searches?: number | null
          unique_sessions?: number | null
          updated_at?: string
          white_label_clicks?: number | null
        }
        Relationships: []
      }
      experience_catalog_sync_state: {
        Row: {
          completed_at: string | null
          last_success_at: string | null
          next_page: number
          page_size: number
          pages_scanned: number
          products_observed: number
          provider: string
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          last_success_at?: string | null
          next_page?: number
          page_size?: number
          pages_scanned?: number
          products_observed?: number
          provider: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          last_success_at?: string | null
          next_page?: number
          page_size?: number
          pages_scanned?: number
          products_observed?: number
          provider?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      experience_click_events: {
        Row: {
          city: string | null
          created_at: string | null
          currency: string | null
          displayed_price: number | null
          id: string
          outbound_hostname: string | null
          page_source: string | null
          partner: string
          product_id: string | null
          session_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          currency?: string | null
          displayed_price?: number | null
          id?: string
          outbound_hostname?: string | null
          page_source?: string | null
          partner?: string
          product_id?: string | null
          session_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          currency?: string | null
          displayed_price?: number | null
          id?: string
          outbound_hostname?: string | null
          page_source?: string | null
          partner?: string
          product_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      experience_destinations: {
        Row: {
          country: string | null
          country_code: string | null
          country_id: string | null
          destination_id: string
          last_seen_at: string
          name: string
          observed_product_count: number
          provider: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          country_id?: string | null
          destination_id: string
          last_seen_at?: string
          name: string
          observed_product_count?: number
          provider: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          country_code?: string | null
          country_id?: string | null
          destination_id?: string
          last_seen_at?: string
          name?: string
          observed_product_count?: number
          provider?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      experience_products: {
        Row: {
          cancellation: string | null
          city_id: string | null
          city_name: string | null
          country_id: string | null
          country_name: string | null
          created_at: string
          description: string | null
          duration: string | null
          image_alt: string | null
          image_credit: string | null
          image_url: string | null
          images: Json
          instant_ticket_delivery: boolean | null
          last_seen_at: string
          price_amount: number | null
          price_currency: string | null
          product_checkout_url: string | null
          product_url: string | null
          provider: string
          provider_product_id: string
          provider_updated_at: string | null
          rating: number | null
          review_count: number | null
          sale_status: string | null
          skip_the_line: boolean | null
          slug: string
          smartphone_ticket: boolean | null
          tag_ids: Json
          tagline: string | null
          title: string
          updated_at: string
          venue_name: string | null
          wheelchair_accessible: boolean | null
        }
        Insert: {
          cancellation?: string | null
          city_id?: string | null
          city_name?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          images?: Json
          instant_ticket_delivery?: boolean | null
          last_seen_at?: string
          price_amount?: number | null
          price_currency?: string | null
          product_checkout_url?: string | null
          product_url?: string | null
          provider: string
          provider_product_id: string
          provider_updated_at?: string | null
          rating?: number | null
          review_count?: number | null
          sale_status?: string | null
          skip_the_line?: boolean | null
          slug?: string
          smartphone_ticket?: boolean | null
          tag_ids?: Json
          tagline?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
          wheelchair_accessible?: boolean | null
        }
        Update: {
          cancellation?: string | null
          city_id?: string | null
          city_name?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          image_alt?: string | null
          image_credit?: string | null
          image_url?: string | null
          images?: Json
          instant_ticket_delivery?: boolean | null
          last_seen_at?: string
          price_amount?: number | null
          price_currency?: string | null
          product_checkout_url?: string | null
          product_url?: string | null
          provider?: string
          provider_product_id?: string
          provider_updated_at?: string | null
          rating?: number | null
          review_count?: number | null
          sale_status?: string | null
          skip_the_line?: boolean | null
          slug?: string
          smartphone_ticket?: boolean | null
          tag_ids?: Json
          tagline?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
          wheelchair_accessible?: boolean | null
        }
        Relationships: []
      }
      flight_destinations: {
        Row: {
          alt_text: string | null
          city: string
          country: string
          created_at: string
          description: string | null
          display_order: number
          focal_x: number
          focal_y: number
          iata_code: string
          id: string
          image_path: string | null
          is_active: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          city: string
          country: string
          created_at?: string
          description?: string | null
          display_order?: number
          focal_x?: number
          focal_y?: number
          iata_code: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          display_order?: number
          focal_x?: number
          focal_y?: number
          iata_code?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          slug?: string
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
      search_events: {
        Row: {
          adults: number | null
          cabin_class: string | null
          children: number | null
          country: string | null
          created_at: string
          currency: string | null
          departure_date: string | null
          destination: string | null
          device: string | null
          id: string
          infants: number | null
          landing_page: string | null
          origin: string | null
          referrer: string | null
          return_date: string | null
          session_id: string
          trip_type: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          adults?: number | null
          cabin_class?: string | null
          children?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          destination?: string | null
          device?: string | null
          id?: string
          infants?: number | null
          landing_page?: string | null
          origin?: string | null
          referrer?: string | null
          return_date?: string | null
          session_id: string
          trip_type?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          adults?: number | null
          cabin_class?: string | null
          children?: number | null
          country?: string | null
          created_at?: string
          currency?: string | null
          departure_date?: string | null
          destination?: string | null
          device?: string | null
          id?: string
          infants?: number | null
          landing_page?: string | null
          origin?: string | null
          referrer?: string | null
          return_date?: string | null
          session_id?: string
          trip_type?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
      site_branding: {
        Row: {
          accent_color: string
          favicon_url: string | null
          icon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_height_desktop: number
          logo_height_footer: number
          logo_height_mobile: number
          logo_light_url: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          site_name: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          favicon_url?: string | null
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_height_desktop?: number
          logo_height_footer?: number
          logo_height_mobile?: number
          logo_light_url?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          site_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          favicon_url?: string | null
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_height_desktop?: number
          logo_height_footer?: number
          logo_height_mobile?: number
          logo_light_url?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          site_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_hero_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size_bytes: number | null
          focal_x: number
          focal_y: number
          hero_set_id: string
          id: string
          is_decorative: boolean
          mime_type: string | null
          original_height: number | null
          original_width: number | null
          slot_key: string
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size_bytes?: number | null
          focal_x?: number
          focal_y?: number
          hero_set_id: string
          id?: string
          is_decorative?: boolean
          mime_type?: string | null
          original_height?: number | null
          original_width?: number | null
          slot_key: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size_bytes?: number | null
          focal_x?: number
          focal_y?: number
          hero_set_id?: string
          id?: string
          is_decorative?: boolean
          mime_type?: string | null
          original_height?: number | null
          original_width?: number | null
          slot_key?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_hero_assets_hero_set_id_fkey"
            columns: ["hero_set_id"]
            isOneToOne: false
            referencedRelation: "site_hero_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_hero_sets: {
        Row: {
          archived_at: string | null
          based_on_set_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          page_key: string
          published_at: string | null
          published_by: string | null
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          archived_at?: string | null
          based_on_set_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          page_key: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version_number: number
        }
        Update: {
          archived_at?: string | null
          based_on_set_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          page_key?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_hero_sets_based_on_set_id_fkey"
            columns: ["based_on_set_id"]
            isOneToOne: false
            referencedRelation: "site_hero_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_media_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          hero_set_id: string | null
          id: string
          page_key: string | null
          slot_key: string | null
          summary: string | null
          version_number: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          hero_set_id?: string | null
          id?: string
          page_key?: string | null
          slot_key?: string | null
          summary?: string | null
          version_number?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          hero_set_id?: string | null
          id?: string
          page_key?: string | null
          slot_key?: string | null
          summary?: string | null
          version_number?: number | null
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
      things_activities: {
        Row: {
          canonical_title: string
          created_at: string
          destination_slug: string
          id: string
          publication_status: string
          slug: string
          updated_at: string
          verification: Json
        }
        Insert: {
          canonical_title: string
          created_at?: string
          destination_slug: string
          id?: string
          publication_status?: string
          slug: string
          updated_at?: string
          verification?: Json
        }
        Update: {
          canonical_title?: string
          created_at?: string
          destination_slug?: string
          id?: string
          publication_status?: string
          slug?: string
          updated_at?: string
          verification?: Json
        }
        Relationships: []
      }
      things_activity_offers: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          provider: string
          provider_product_id: string
          provider_url: string | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          provider: string
          provider_product_id: string
          provider_url?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          provider?: string
          provider_product_id?: string
          provider_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "things_activity_offers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "things_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      tiqets_public_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          fetched_at: string
          payload: Json
          updated_at: string | null
          upstream_request_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          fetched_at: string
          payload: Json
          updated_at?: string | null
          upstream_request_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          fetched_at?: string
          payload?: Json
          updated_at?: string | null
          upstream_request_id?: string | null
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
      check_admin_access: { Args: never; Returns: undefined }
      cleanup_expired_price_cache: { Args: never; Returns: undefined }
      cleanup_tiqets_cache: { Args: never; Returns: number }
      create_saved_search: {
        Args: {
          p_cabin_class?: string
          p_current_price?: number
          p_departure_date: string
          p_destination: string
          p_email: string
          p_origin: string
          p_passengers?: number
          p_return_date?: string
          p_target_price?: number
        }
        Returns: {
          created_at: string
          id: string
        }[]
      }
      create_site_hero_draft: { Args: { p_page_key: string }; Returns: string }
      disable_custom_site_hero: {
        Args: { p_page_key: string }
        Returns: string
      }
      discard_site_hero_draft: { Args: { p_set_id: string }; Returns: string }
      get_airline_performance: {
        Args: { end_date: string; limit_rows?: number; start_date: string }
        Returns: {
          airline: string
          avg_price: number
          clicks: number
          top_route: string
        }[]
      }
      get_daily_trends: {
        Args: { end_date: string; start_date: string }
        Returns: {
          clicks: number
          ctr: number
          day: string
          fb_clicks: number
          searches: number
          wl_clicks: number
        }[]
      }
      get_dashboard_kpis: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_clicked_fare: number
          currencies: string
          dominant_currency: string
          fallback_clicks: number
          flight_clicks: number
          flight_searches: number
          hotel_clicks: number
          hotel_searches: number
          mixed_currency: boolean
          total_clicks: number
          total_searches: number
          wl_clicks: number
        }[]
      }
      get_landing_page_performance: {
        Args: { end_date: string; start_date: string }
        Returns: {
          clicks: number
          ctr: number
          landing_page: string
          searches: number
        }[]
      }
      get_partner_performance: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_price: number
          click_share: number
          clicks: number
          fallback_clicks: number
          partner: string
          partner_type: string
          wl_clicks: number
        }[]
      }
      get_top_destinations: {
        Args: { end_date: string; limit_rows?: number; start_date: string }
        Returns: {
          clicks: number
          ctr: number
          destination: string
          searches: number
        }[]
      }
      get_top_routes: {
        Args: { end_date: string; limit_rows?: number; start_date: string }
        Returns: {
          avg_price: number
          clicks: number
          ctr: number
          destination: string
          origin: string
          searches: number
          top_partner: string
        }[]
      }
      get_traffic_sources: {
        Args: { end_date: string; start_date: string }
        Returns: {
          searches: number
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }[]
      }
      get_wl_vs_fallback: {
        Args: { end_date: string; start_date: string }
        Returns: {
          fallback_clicks: number
          fb_percentage: number
          fb_top_routes: Json
          total_clicks: number
          white_label_clicks: number
          wl_percentage: number
          wl_top_routes: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_click: { Args: { p_ad_id: string }; Returns: undefined }
      increment_ad_impression: { Args: { p_ad_id: string }; Returns: undefined }
      log_experience_click: {
        Args: {
          p_city: string
          p_currency: string
          p_displayed_price: number
          p_outbound_hostname: string
          p_page_source: string
          p_product_id: string
        }
        Returns: boolean
      }
      log_site_media_event: {
        Args: {
          p_event_type: string
          p_hero_set_id?: string
          p_page_key?: string
          p_slot_key?: string
          p_summary?: string
          p_version_number?: number
        }
        Returns: undefined
      }
      publish_site_hero_set: { Args: { p_set_id: string }; Returns: string }
      revert_site_hero_set: {
        Args: { p_page_key: string; p_version_number: number }
        Returns: string
      }
      subscribe_email: {
        Args: { p_email: string; p_source?: string }
        Returns: undefined
      }
      upsert_experience_products: {
        Args: { p_products: Json; p_provider: string }
        Returns: number
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
