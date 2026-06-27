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
      date_places: {
        Row: {
          address: string
          area: string
          category: string
          created_at: string
          id: string
          image_query: string | null
          is_after: boolean
          kakao_category: string | null
          kakao_enriched_at: string | null
          kakao_phone: string | null
          kakao_place_id: string | null
          kakao_place_url: string | null
          lat: number
          lng: number
          menu_examples: string[]
          mood: string | null
          name: string
          price_range: string | null
          rating: number
          reason: string | null
          review_count: number
          sort_weight: number
          updated_at: string
        }
        Insert: {
          address: string
          area: string
          category: string
          created_at?: string
          id: string
          image_query?: string | null
          is_after?: boolean
          kakao_category?: string | null
          kakao_enriched_at?: string | null
          kakao_phone?: string | null
          kakao_place_id?: string | null
          kakao_place_url?: string | null
          lat: number
          lng: number
          menu_examples?: string[]
          mood?: string | null
          name: string
          price_range?: string | null
          rating?: number
          reason?: string | null
          review_count?: number
          sort_weight?: number
          updated_at?: string
        }
        Update: {
          address?: string
          area?: string
          category?: string
          created_at?: string
          id?: string
          image_query?: string | null
          is_after?: boolean
          kakao_category?: string | null
          kakao_enriched_at?: string | null
          kakao_phone?: string | null
          kakao_place_id?: string | null
          kakao_place_url?: string | null
          lat?: number
          lng?: number
          menu_examples?: string[]
          mood?: string | null
          name?: string
          price_range?: string | null
          rating?: number
          reason?: string | null
          review_count?: number
          sort_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      meeting_participants: {
        Row: {
          gender: Database["public"]["Enums"]["gender"]
          joined_at: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          gender: Database["public"]["Enums"]["gender"]
          joined_at?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          gender?: Database["public"]["Enums"]["gender"]
          joined_at?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          ai_recommended: boolean
          created_at: string
          description: string | null
          female_capacity: number
          host_id: string | null
          id: string
          location: string
          male_capacity: number
          ratio: Database["public"]["Enums"]["meeting_ratio"]
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          venue_type: string
        }
        Insert: {
          ai_recommended?: boolean
          created_at?: string
          description?: string | null
          female_capacity: number
          host_id?: string | null
          id?: string
          location: string
          male_capacity: number
          ratio: Database["public"]["Enums"]["meeting_ratio"]
          starts_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          venue_type: string
        }
        Update: {
          ai_recommended?: boolean
          created_at?: string
          description?: string | null
          female_capacity?: number
          host_id?: string | null
          id?: string
          location?: string
          male_capacity?: number
          ratio?: Database["public"]["Enums"]["meeting_ratio"]
          starts_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          venue_type?: string
        }
        Relationships: []
      }
      post: {
        Row: {
          address: string | null
          badges: string | null
          code: string | null
          content_text: string | null
          coupon_price: number | null
          crawl_job_id: string
          crawled_at: string
          datetime: string | null
          detail_url: string | null
          duration: string | null
          id: string
          image_url: string | null
          list_price: number | null
          map_link: string | null
          posted_date: string | null
          price: number | null
          promo: string | null
          region: string | null
          region_group: string | null
          sessions: string | null
          site: string
          soldout: boolean
          source_id: string
          title: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          badges?: string | null
          code?: string | null
          content_text?: string | null
          coupon_price?: number | null
          crawl_job_id: string
          crawled_at: string
          datetime?: string | null
          detail_url?: string | null
          duration?: string | null
          id: string
          image_url?: string | null
          list_price?: number | null
          map_link?: string | null
          posted_date?: string | null
          price?: number | null
          promo?: string | null
          region?: string | null
          region_group?: string | null
          sessions?: string | null
          site: string
          soldout: boolean
          source_id: string
          title: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          badges?: string | null
          code?: string | null
          content_text?: string | null
          coupon_price?: number | null
          crawl_job_id?: string
          crawled_at?: string
          datetime?: string | null
          detail_url?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          list_price?: number | null
          map_link?: string | null
          posted_date?: string | null
          price?: number | null
          promo?: string | null
          region?: string | null
          region_group?: string | null
          sessions?: string | null
          site?: string
          soldout?: boolean
          source_id?: string
          title?: string
          venue?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number
          bio: string
          created_at: string
          gender: Database["public"]["Enums"]["gender"]
          hobbies: string[]
          job: string | null
          nickname: string
          photos: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          bio?: string
          created_at?: string
          gender: Database["public"]["Enums"]["gender"]
          hobbies?: string[]
          job?: string | null
          nickname: string
          photos?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          bio?: string
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"]
          hobbies?: string[]
          job?: string | null
          nickname?: string
          photos?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      meetings_with_counts: {
        Row: {
          ai_recommended: boolean | null
          created_at: string | null
          description: string | null
          female_capacity: number | null
          female_count: number | null
          host_id: string | null
          host_nickname: string | null
          id: string | null
          location: string | null
          male_capacity: number | null
          male_count: number | null
          ratio: Database["public"]["Enums"]["meeting_ratio"] | null
          starts_at: string | null
          status: Database["public"]["Enums"]["meeting_status"] | null
          title: string | null
          venue_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      join_meeting: {
        Args: { _meeting_id: string }
        Returns: {
          ai_recommended: boolean
          created_at: string
          description: string | null
          female_capacity: number
          host_id: string | null
          id: string
          location: string
          male_capacity: number
          ratio: Database["public"]["Enums"]["meeting_ratio"]
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          venue_type: string
        }
        SetofOptions: {
          from: "*"
          to: "meetings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      gender: "M" | "F"
      meeting_ratio: "2:2" | "3:3" | "4:4" | "5:5"
      meeting_status: "OPEN" | "CLOSED"
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
      gender: ["M", "F"],
      meeting_ratio: ["2:2", "3:3", "4:4", "5:5"],
      meeting_status: ["OPEN", "CLOSED"],
    },
  },
} as const
