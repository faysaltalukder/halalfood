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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          metadata?: Json
          summary?: string
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          metadata?: Json
          summary?: string
        }
        Relationships: []
      }
      admin_ad_review_drafts: {
        Row: {
          age_max: number
          age_min: number
          audience_interests: string
          audience_location: string
          budget_amount: number | null
          budget_period: string
          call_to_action: string
          campaign_type: string
          checklist: Json
          created_at: string
          created_by: string
          creative_format: string
          creative_notes: string
          creative_url: string
          currency: string
          description: string
          destination_url: string
          draft_name: string
          headline: string
          id: string
          meta_ad_account_id: string | null
          meta_ad_id: string | null
          meta_campaign_id: string | null
          objective: string
          placements: string
          platform: string
          primary_text: string
          review_notes: string
          review_status: string
          schedule_end_at: string | null
          schedule_start_at: string | null
          special_ad_category: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          audience_interests?: string
          audience_location?: string
          budget_amount?: number | null
          budget_period?: string
          call_to_action?: string
          campaign_type?: string
          checklist?: Json
          created_at?: string
          created_by: string
          creative_format?: string
          creative_notes?: string
          creative_url?: string
          currency?: string
          description?: string
          destination_url?: string
          draft_name: string
          headline?: string
          id?: string
          meta_ad_account_id?: string | null
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          objective?: string
          placements?: string
          platform?: string
          primary_text?: string
          review_notes?: string
          review_status?: string
          schedule_end_at?: string | null
          schedule_start_at?: string | null
          special_ad_category?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          age_max?: number
          age_min?: number
          audience_interests?: string
          audience_location?: string
          budget_amount?: number | null
          budget_period?: string
          call_to_action?: string
          campaign_type?: string
          checklist?: Json
          created_at?: string
          created_by?: string
          creative_format?: string
          creative_notes?: string
          creative_url?: string
          currency?: string
          description?: string
          destination_url?: string
          draft_name?: string
          headline?: string
          id?: string
          meta_ad_account_id?: string | null
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          objective?: string
          placements?: string
          platform?: string
          primary_text?: string
          review_notes?: string
          review_status?: string
          schedule_end_at?: string | null
          schedule_start_at?: string | null
          special_ad_category?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      admin_finance_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          reference: string | null
          related_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_type: string
          id?: string
          reference?: string | null
          related_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          reference?: string | null
          related_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_finance_entries_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_operational_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          department: string
          due_date: string | null
          id: string
          notes: string
          priority: string
          related_order_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          department?: string
          due_date?: string | null
          id?: string
          notes?: string
          priority?: string
          related_order_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          department?: string
          due_date?: string | null
          id?: string
          notes?: string
          priority?: string
          related_order_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_operational_tasks_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_product_costs: {
        Row: {
          cost_price: number | null
          low_stock_threshold: number
          packaging_cost: number
          product_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          cost_price?: number | null
          low_stock_threshold?: number
          packaging_cost?: number
          product_id: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          cost_price?: number | null
          low_stock_threshold?: number
          packaging_cost?: number
          product_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_purchase_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "admin_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          notes: string
          order_date: string
          purchase_number: string
          reference: string
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          notes?: string
          order_date?: string
          purchase_number?: string
          reference?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          notes?: string
          order_date?: string
          purchase_number?: string
          reference?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "admin_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_return_requests: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_condition: string
          notes: string
          order_id: string
          reason: string
          refund_amount: number
          restock_approved: boolean
          return_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          item_condition?: string
          notes?: string
          order_id: string
          reason: string
          refund_amount?: number
          restock_approved?: boolean
          return_number?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_condition?: string
          notes?: string
          order_id?: string
          reason?: string
          refund_amount?: number
          restock_approved?: boolean
          return_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_shipments: {
        Row: {
          booking_error: string
          booking_requested_at: string | null
          booking_state: string
          cod_amount: number
          courier_fee: number
          courier_name: string
          created_at: string
          created_by: string
          delivered_at: string | null
          handed_over_at: string | null
          id: string
          integration_mode: string
          order_id: string
          parcel_notes: string
          parcel_weight_kg: number | null
          provider_order_id: string | null
          provider_response: Json
          settled_amount: number
          settlement_status: string
          shipment_status: string
          tracking_id: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          booking_error?: string
          booking_requested_at?: string | null
          booking_state?: string
          cod_amount?: number
          courier_fee?: number
          courier_name?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          handed_over_at?: string | null
          id?: string
          integration_mode?: string
          order_id: string
          parcel_notes?: string
          parcel_weight_kg?: number | null
          provider_order_id?: string | null
          provider_response?: Json
          settled_amount?: number
          settlement_status?: string
          shipment_status?: string
          tracking_id?: string | null
          updated_at?: string
          updated_by?: string
        }
        Update: {
          booking_error?: string
          booking_requested_at?: string | null
          booking_state?: string
          cod_amount?: number
          courier_fee?: number
          courier_name?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          handed_over_at?: string | null
          id?: string
          integration_mode?: string
          order_id?: string
          parcel_notes?: string
          parcel_weight_kg?: number | null
          provider_order_id?: string | null
          provider_response?: Json
          settled_amount?: number
          settlement_status?: string
          shipment_status?: string
          tracking_id?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_suppliers: {
        Row: {
          address: string
          contact_name: string
          created_at: string
          created_by: string
          email: string
          id: string
          is_active: boolean
          name: string
          notes: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          contact_name?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_name?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_team_members: {
        Row: {
          created_at: string
          created_by: string
          department: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          notes: string
          phone: string
          role_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          department?: string
          email?: string
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string
          phone?: string
          role_title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string
          phone?: string
          role_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          anonymous_id: string | null
          campaign: string | null
          created_at: string
          currency: string
          event_id: string | null
          event_name: string
          id: number
          item_category: string | null
          item_id: string | null
          item_name: string | null
          medium: string | null
          metadata: Json
          occurred_at: string
          page_path: string
          page_title: string | null
          quantity: number | null
          search_term: string | null
          session_id: string | null
          source: string | null
          value: number | null
        }
        Insert: {
          anonymous_id?: string | null
          campaign?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          event_name: string
          id?: number
          item_category?: string | null
          item_id?: string | null
          item_name?: string | null
          medium?: string | null
          metadata?: Json
          occurred_at?: string
          page_path?: string
          page_title?: string | null
          quantity?: number | null
          search_term?: string | null
          session_id?: string | null
          source?: string | null
          value?: number | null
        }
        Update: {
          anonymous_id?: string | null
          campaign?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          event_name?: string
          id?: number
          item_category?: string | null
          item_id?: string | null
          item_name?: string | null
          medium?: string | null
          metadata?: Json
          occurred_at?: string
          page_path?: string
          page_title?: string | null
          quantity?: number | null
          search_term?: string | null
          session_id?: string | null
          source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string
          cms_created: boolean
          cms_managed: boolean
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cms_created?: boolean
          cms_managed?: boolean
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cms_created?: boolean
          cms_managed?: boolean
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          cms_created: boolean
          cms_managed: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cms_created?: boolean
          cms_managed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cms_created?: boolean
          cms_managed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      courier_customer_history_cache: {
        Row: {
          checked_at: string
          expires_at: string
          phone_hash: string
          result: Json
        }
        Insert: {
          checked_at?: string
          expires_at: string
          phone_hash: string
          result: Json
        }
        Update: {
          checked_at?: string
          expires_at?: string
          phone_hash?: string
          result?: Json
        }
        Relationships: []
      }
      customer_cart_items: {
        Row: {
          category_slug: string | null
          created_at: string
          display_price: string | null
          image_url: string | null
          product_name: string
          product_slug: string
          quantity: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          display_price?: string | null
          image_url?: string | null
          product_name?: string
          product_slug: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          display_price?: string | null
          image_url?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      facebook_oauth_states: {
        Row: {
          admin_email: string
          created_at: string
          expires_at: string
          state: string
          used_at: string | null
        }
        Insert: {
          admin_email: string
          created_at?: string
          expires_at: string
          state: string
          used_at?: string | null
        }
        Update: {
          admin_email?: string
          created_at?: string
          expires_at?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      facebook_page_accounts: {
        Row: {
          connected_by: string
          created_at: string
          granted_scopes: string[]
          is_selected: boolean
          last_verified_at: string | null
          page_id: string
          page_name: string
          tasks: string[]
          token_ciphertext: string
          token_expires_at: string | null
          token_iv: string
          updated_at: string
        }
        Insert: {
          connected_by: string
          created_at?: string
          granted_scopes?: string[]
          is_selected?: boolean
          last_verified_at?: string | null
          page_id: string
          page_name: string
          tasks?: string[]
          token_ciphertext: string
          token_expires_at?: string | null
          token_iv: string
          updated_at?: string
        }
        Update: {
          connected_by?: string
          created_at?: string
          granted_scopes?: string[]
          is_selected?: boolean
          last_verified_at?: string | null
          page_id?: string
          page_name?: string
          tasks?: string[]
          token_ciphertext?: string
          token_expires_at?: string | null
          token_iv?: string
          updated_at?: string
        }
        Relationships: []
      }
      facebook_publish_history: {
        Row: {
          created_at: string
          created_by: string
          error_code: string | null
          error_message: string | null
          facebook_post_id: string | null
          id: string
          media_object_path: string | null
          message: string
          page_id: string
          page_name: string
          permalink_url: string | null
          post_type: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_code?: string | null
          error_message?: string | null
          facebook_post_id?: string | null
          id?: string
          media_object_path?: string | null
          message?: string
          page_id: string
          page_name: string
          permalink_url?: string | null
          post_type: string
          published_at?: string | null
          scheduled_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_code?: string | null
          error_message?: string | null
          facebook_post_id?: string | null
          id?: string
          media_object_path?: string | null
          message?: string
          page_id?: string
          page_name?: string
          permalink_url?: string | null
          post_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      incomplete_checkouts: {
        Row: {
          checkout_session_id: string
          consent_method: string
          consent_version: string
          converted_at: string | null
          converted_order_id: string | null
          converted_order_number: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_charge: number
          delivery_zone: string | null
          expires_at: string
          first_seen_at: string
          id: string
          item_summary: Json
          last_field: string | null
          last_seen_at: string
          last_step: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          order_context: string
          order_notes: string | null
          progress_percent: number
          recovery_consent: boolean
          recovery_consent_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          checkout_session_id: string
          consent_method: string
          consent_version: string
          converted_at?: string | null
          converted_order_id?: string | null
          converted_order_number?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charge?: number
          delivery_zone?: string | null
          expires_at?: string
          first_seen_at?: string
          id?: string
          item_summary?: Json
          last_field?: string | null
          last_seen_at?: string
          last_step?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          order_context?: string
          order_notes?: string | null
          progress_percent?: number
          recovery_consent?: boolean
          recovery_consent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          checkout_session_id?: string
          consent_method?: string
          consent_version?: string
          converted_at?: string | null
          converted_order_id?: string | null
          converted_order_number?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_charge?: number
          delivery_zone?: string | null
          expires_at?: string
          first_seen_at?: string
          id?: string
          item_summary?: Json
          last_field?: string | null
          last_seen_at?: string
          last_step?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          order_context?: string
          order_notes?: string | null
          progress_percent?: number
          recovery_consent?: boolean
          recovery_consent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomplete_checkouts_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: number
          movement_type: string
          order_id: string | null
          product_id: string
          quantity_delta: number
          reason: string
          stock_after: number | null
          stock_before: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: number
          movement_type: string
          order_id?: string | null
          product_id: string
          quantity_delta: number
          reason?: string
          stock_after?: number | null
          stock_before?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: number
          movement_type?: string
          order_id?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string
          stock_after?: number | null
          stock_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_contacts: {
        Row: {
          channel: string
          created_at: string
          display_name: string | null
          external_contact_id: string
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          display_name?: string | null
          external_contact_id: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          display_name?: string | null
          external_contact_id?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messaging_conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          contact_id: string
          created_at: string
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          contact_id: string
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "messaging_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_messages: {
        Row: {
          body: string
          channel: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_title: string | null
          failed_at: string | null
          id: string
          media_id: string | null
          media_mime_type: string | null
          message_type: string
          provider_message_id: string | null
          provider_timestamp: string | null
          read_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          body?: string
          channel?: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_title?: string | null
          failed_at?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          message_type?: string
          provider_message_id?: string | null
          provider_timestamp?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          body?: string
          channel?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_title?: string | null
          failed_at?: string | null
          id?: string
          media_id?: string | null
          media_mime_type?: string | null
          message_type?: string
          provider_message_id?: string | null
          provider_timestamp?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messaging_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_oauth_states: {
        Row: {
          admin_email: string
          created_at: string
          expires_at: string
          state: string
          used_at: string | null
        }
        Insert: {
          admin_email: string
          created_at?: string
          expires_at: string
          state: string
          used_at?: string | null
        }
        Update: {
          admin_email?: string
          created_at?: string
          expires_at?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      meta_ads_review_accounts: {
        Row: {
          account_id: string
          account_name: string
          account_status: number | null
          created_at: string
          currency: string | null
          disable_reason: number | null
          is_selected: boolean
          last_verified_at: string | null
          numeric_account_id: string | null
          timezone_name: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_status?: number | null
          created_at?: string
          currency?: string | null
          disable_reason?: number | null
          is_selected?: boolean
          last_verified_at?: string | null
          numeric_account_id?: string | null
          timezone_name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_status?: number | null
          created_at?: string
          currency?: string | null
          disable_reason?: number | null
          is_selected?: boolean
          last_verified_at?: string | null
          numeric_account_id?: string | null
          timezone_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_ads_review_connection: {
        Row: {
          connected_by: string
          created_at: string
          granted_scopes: string[]
          last_verified_at: string | null
          singleton: boolean
          token_ciphertext: string
          token_expires_at: string | null
          token_iv: string
          updated_at: string
        }
        Insert: {
          connected_by: string
          created_at?: string
          granted_scopes?: string[]
          last_verified_at?: string | null
          singleton?: boolean
          token_ciphertext: string
          token_expires_at?: string | null
          token_iv: string
          updated_at?: string
        }
        Update: {
          connected_by?: string
          created_at?: string
          granted_scopes?: string[]
          last_verified_at?: string | null
          singleton?: boolean
          token_ciphertext?: string
          token_expires_at?: string | null
          token_iv?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_event_delivery_log: {
        Row: {
          attempts: number
          created_at: string
          event_id: string
          event_key: string
          event_source_url: string
          last_error: string | null
          meta_event_name: string
          meta_http_status: number | null
          meta_response: Json
          occurred_at: string
          payload: Json
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id: string
          event_key: string
          event_source_url: string
          last_error?: string | null
          meta_event_name: string
          meta_http_status?: number | null
          meta_response?: Json
          occurred_at: string
          payload?: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string
          event_key?: string
          event_source_url?: string
          last_error?: string | null
          meta_event_name?: string
          meta_http_status?: number | null
          meta_response?: Json
          occurred_at?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          quantity: number
          shipping_weight_kg: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          quantity?: number
          shipping_weight_kg?: number | null
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          quantity?: number
          shipping_weight_kg?: number | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_security_reviews: {
        Row: {
          created_at: string
          device_hash: string | null
          fbc: string | null
          fbp: string | null
          form_elapsed_ms: number | null
          id: string
          ip_country: string | null
          ip_hash: string | null
          ip_masked: string | null
          order_id: string | null
          order_number: string
          order_payload: Json
          phone_hash: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_email: string | null
          risk_flags: string[]
          risk_score: number
          status: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_hash?: string | null
          fbc?: string | null
          fbp?: string | null
          form_elapsed_ms?: number | null
          id?: string
          ip_country?: string | null
          ip_hash?: string | null
          ip_masked?: string | null
          order_id?: string | null
          order_number: string
          order_payload: Json
          phone_hash?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_email?: string | null
          risk_flags?: string[]
          risk_score?: number
          status?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_hash?: string | null
          fbc?: string | null
          fbp?: string | null
          form_elapsed_ms?: number | null
          id?: string
          ip_country?: string | null
          ip_hash?: string | null
          ip_masked?: string | null
          order_id?: string | null
          order_number?: string
          order_payload?: Json
          phone_hash?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_email?: string | null
          risk_flags?: string[]
          risk_score?: number
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_security_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_security_signals: {
        Row: {
          created_at: string
          device_hash: string | null
          form_elapsed_ms: number | null
          id: string
          ip_country: string | null
          ip_hash: string | null
          ip_masked: string | null
          order_number: string
          phone_hash: string | null
          risk_flags: string[]
          risk_score: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_hash?: string | null
          form_elapsed_ms?: number | null
          id?: string
          ip_country?: string | null
          ip_hash?: string | null
          ip_masked?: string | null
          order_number: string
          phone_hash?: string | null
          risk_flags?: string[]
          risk_score?: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_hash?: string | null
          form_elapsed_ms?: number | null
          id?: string
          ip_country?: string | null
          ip_hash?: string | null
          ip_masked?: string | null
          order_number?: string
          phone_hash?: string | null
          risk_flags?: string[]
          risk_score?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: string | null
          id: number
          order_id: string
          reason: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string
          from_status?: string | null
          id?: number
          order_id: string
          reason?: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: string | null
          id?: number
          order_id?: string
          reason?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          assigned_to_team_member_id: string | null
          cancellation_reason: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_charge: number
          delivery_zone: string | null
          id: string
          legacy_sheet_row: string | null
          notes: string | null
          order_number: string | null
          ordered_at: string
          payment_method: string
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string
          assigned_to_team_member_id?: string | null
          cancellation_reason?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_charge?: number
          delivery_zone?: string | null
          id?: string
          legacy_sheet_row?: string | null
          notes?: string | null
          order_number?: string | null
          ordered_at?: string
          payment_method?: string
          source?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          assigned_to_team_member_id?: string | null
          cancellation_reason?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_charge?: number
          delivery_zone?: string | null
          id?: string
          legacy_sheet_row?: string | null
          notes?: string | null
          order_number?: string | null
          ordered_at?: string
          payment_method?: string
          source?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_to_team_member_id_fkey"
            columns: ["assigned_to_team_member_id"]
            isOneToOne: false
            referencedRelation: "admin_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          daily_limit: number
          enabled: boolean
          platform: string
        }
        Insert: {
          daily_limit?: number
          enabled?: boolean
          platform: string
        }
        Update: {
          daily_limit?: number
          enabled?: boolean
          platform?: string
        }
        Relationships: []
      }
      post_queue: {
        Row: {
          created_at: string
          created_by: string
          error: string | null
          external_id: string | null
          id: string
          link: string | null
          media_path: string | null
          message: string
          permalink: string | null
          platform: string
          post_type: string
          processing_started_at: string | null
          publish_at: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          error?: string | null
          external_id?: string | null
          id?: string
          link?: string | null
          media_path?: string | null
          message?: string
          permalink?: string | null
          platform: string
          post_type: string
          processing_started_at?: string | null
          publish_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error?: string | null
          external_id?: string | null
          id?: string
          link?: string | null
          media_path?: string | null
          message?: string
          permalink?: string | null
          platform?: string
          post_type?: string
          processing_started_at?: string | null
          publish_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_queue_platform_fkey"
            columns: ["platform"]
            isOneToOne: false
            referencedRelation: "platform_settings"
            referencedColumns: ["platform"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_slug: string
          cms_created: boolean
          cms_managed: boolean
          created_at: string
          description: string | null
          display_price: string | null
          full_description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          seo_description: string | null
          seo_title: string | null
          shipping_weight_kg: number | null
          short_description: string | null
          slug: string
          sort_order: number
          stock_quantity: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_slug: string
          cms_created?: boolean
          cms_managed?: boolean
          created_at?: string
          description?: string | null
          display_price?: string | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          shipping_weight_kg?: number | null
          short_description?: string | null
          slug: string
          sort_order?: number
          stock_quantity?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_slug?: string
          cms_created?: boolean
          cms_managed?: boolean
          created_at?: string
          description?: string | null
          display_price?: string | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          shipping_weight_kg?: number | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          stock_quantity?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      site_change_files: {
        Row: {
          action: string
          change_set_id: string
          content: string | null
          created_at: string
          id: string
          path: string
          sha256: string | null
        }
        Insert: {
          action: string
          change_set_id: string
          content?: string | null
          created_at?: string
          id?: string
          path: string
          sha256?: string | null
        }
        Update: {
          action?: string
          change_set_id?: string
          content?: string | null
          created_at?: string
          id?: string
          path?: string
          sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_change_files_change_set_id_fkey"
            columns: ["change_set_id"]
            isOneToOne: false
            referencedRelation: "site_change_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_change_sets: {
        Row: {
          approval_signature: string | null
          approved_at: string | null
          approved_by: string | null
          approved_manifest_sha256: string | null
          base_commit_sha: string | null
          created_at: string
          created_by: string
          deployment_status: string
          deployment_url: string | null
          description: string
          id: string
          last_error: string | null
          manifest_sha256: string | null
          published_commit_sha: string | null
          release_id: string | null
          rollback_of_change_set_id: string | null
          status: string
          title: string
          updated_at: string
          validated_at: string | null
          validation_signature: string | null
        }
        Insert: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_manifest_sha256?: string | null
          base_commit_sha?: string | null
          created_at?: string
          created_by?: string
          deployment_status?: string
          deployment_url?: string | null
          description?: string
          id?: string
          last_error?: string | null
          manifest_sha256?: string | null
          published_commit_sha?: string | null
          release_id?: string | null
          rollback_of_change_set_id?: string | null
          status?: string
          title: string
          updated_at?: string
          validated_at?: string | null
          validation_signature?: string | null
        }
        Update: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_manifest_sha256?: string | null
          base_commit_sha?: string | null
          created_at?: string
          created_by?: string
          deployment_status?: string
          deployment_url?: string | null
          description?: string
          id?: string
          last_error?: string | null
          manifest_sha256?: string | null
          published_commit_sha?: string | null
          release_id?: string | null
          rollback_of_change_set_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          validated_at?: string | null
          validation_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_change_sets_rollback_of_change_set_id_fkey"
            columns: ["rollback_of_change_set_id"]
            isOneToOne: false
            referencedRelation: "site_change_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content_blocks: {
        Row: {
          alt_text: string
          block_key: string
          block_type: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          alt_text?: string
          block_key: string
          block_type: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          alt_text?: string
          block_key?: string
          block_type?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      site_publish_log: {
        Row: {
          action: string
          actor_email: string | null
          change_set_id: string | null
          commit_sha: string | null
          created_at: string
          id: number
          message: string
          metadata: Json
          status: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          change_set_id?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: never
          message?: string
          metadata?: Json
          status?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          change_set_id?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: never
          message?: string
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_publish_log_change_set_id_fkey"
            columns: ["change_set_id"]
            isOneToOne: false
            referencedRelation: "site_change_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_event_settings: {
        Row: {
          destination: string
          enabled: boolean
          event_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          destination: string
          enabled?: boolean
          event_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          destination?: string
          enabled?: boolean
          event_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tracking_runtime_settings: {
        Row: {
          id: number
          live_purchase_tracking: boolean
          meta_capi_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          live_purchase_tracking?: boolean
          meta_capi_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          live_purchase_tracking?: boolean
          meta_capi_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      youtube_community_drafts: {
        Row: {
          channel_id: string
          channel_title: string
          created_at: string
          created_by: string
          id: string
          image_count: number
          image_names: Json
          post_text: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          channel_title: string
          created_at?: string
          created_by: string
          id?: string
          image_count?: number
          image_names?: Json
          post_text?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          channel_title?: string
          created_at?: string
          created_by?: string
          id?: string
          image_count?: number
          image_names?: Json
          post_text?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      youtube_connected_accounts: {
        Row: {
          channel_custom_url: string | null
          channel_id: string
          channel_title: string
          connected_by: string
          created_at: string
          granted_scopes: string[]
          is_selected: boolean
          last_verified_at: string | null
          token_ciphertext: string
          token_iv: string
          updated_at: string
        }
        Insert: {
          channel_custom_url?: string | null
          channel_id: string
          channel_title: string
          connected_by: string
          created_at?: string
          granted_scopes?: string[]
          is_selected?: boolean
          last_verified_at?: string | null
          token_ciphertext: string
          token_iv: string
          updated_at?: string
        }
        Update: {
          channel_custom_url?: string | null
          channel_id?: string
          channel_title?: string
          connected_by?: string
          created_at?: string
          granted_scopes?: string[]
          is_selected?: boolean
          last_verified_at?: string | null
          token_ciphertext?: string
          token_iv?: string
          updated_at?: string
        }
        Relationships: []
      }
      youtube_oauth_states: {
        Row: {
          admin_email: string
          created_at: string
          expires_at: string
          state: string
          used_at: string | null
        }
        Insert: {
          admin_email: string
          created_at?: string
          expires_at: string
          state: string
          used_at?: string | null
        }
        Update: {
          admin_email?: string
          created_at?: string
          expires_at?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      youtube_publish_history: {
        Row: {
          category_id: string
          channel_id: string
          channel_title: string
          completed_at: string | null
          contains_synthetic_media: boolean
          created_at: string
          created_by: string
          description: string
          error_code: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          made_for_kids: boolean
          mime_type: string | null
          privacy_status: string
          scheduled_at: string | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          upload_mode: string
          video_duration_seconds: number | null
          video_height: number | null
          video_id: string | null
          video_width: number | null
          youtube_url: string | null
        }
        Insert: {
          category_id?: string
          channel_id: string
          channel_title: string
          completed_at?: string | null
          contains_synthetic_media?: boolean
          created_at?: string
          created_by: string
          description?: string
          error_code?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          made_for_kids?: boolean
          mime_type?: string | null
          privacy_status: string
          scheduled_at?: string | null
          status: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          upload_mode?: string
          video_duration_seconds?: number | null
          video_height?: number | null
          video_id?: string | null
          video_width?: number | null
          youtube_url?: string | null
        }
        Update: {
          category_id?: string
          channel_id?: string
          channel_title?: string
          completed_at?: string | null
          contains_synthetic_media?: boolean
          created_at?: string
          created_by?: string
          description?: string
          error_code?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          made_for_kids?: boolean
          mime_type?: string | null
          privacy_status?: string
          scheduled_at?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          upload_mode?: string
          video_duration_seconds?: number | null
          video_height?: number | null
          video_id?: string | null
          video_width?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_bulk_delete_orders: {
        Args: { p_order_ids: string[] }
        Returns: Json
      }
      admin_update_order_delivery_address: {
        Args: { p_delivery_address: string; p_order_id: string }
        Returns: {
          delivery_address: string
          order_id: string
          updated_at: string
        }[]
      }
      admin_update_order_status: {
        Args: {
          p_cancellation_reason?: string
          p_next_status: string
          p_order_id: string
        }
        Returns: {
          cancellation_reason: string
          new_status: string
          old_status: string
          order_id: string
          order_number: string
          updated_at: string
        }[]
      }
      check_dispatch_secret: { Args: { p_secret: string }; Returns: boolean }
      claim_due_posts: {
        Args: { p_limit: number; p_platform: string }
        Returns: {
          created_at: string
          created_by: string
          error: string | null
          external_id: string | null
          id: string
          link: string | null
          media_path: string | null
          message: string
          permalink: string | null
          platform: string
          post_type: string
          processing_started_at: string | null
          publish_at: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "post_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_due_posts_with_daily_limit: {
        Args: { p_daily_limit: number; p_limit: number; p_platform: string }
        Returns: {
          created_at: string
          created_by: string
          error: string | null
          external_id: string | null
          id: string
          link: string | null
          media_path: string | null
          message: string
          permalink: string | null
          platform: string
          post_type: string
          processing_started_at: string | null
          publish_at: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "post_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_website_order: { Args: { p_order: Json }; Returns: Json }
      sync_my_customer_identity: { Args: never; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
