export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RouteDifficulty = "easy" | "medium" | "hard";
export type SessionStatus = "active" | "completed" | "cancelled";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          home_city: string | null;
          bio: string | null;
          default_share_live_location: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          bio?: string | null;
          default_share_live_location?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          bio?: string | null;
          default_share_live_location?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      bikes: {
        Row: {
          id: string;
          owner_id: string;
          brand: string;
          model: string;
          year: number | null;
          nickname: string | null;
          displacement_cc: number | null;
          plate: string | null;
          photo_url: string | null;
          notes: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          brand: string;
          model: string;
          year?: number | null;
          nickname?: string | null;
          displacement_cc?: number | null;
          plate?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          brand?: string;
          model?: string;
          year?: number | null;
          nickname?: string | null;
          displacement_cc?: number | null;
          plate?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bikes_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      bike_mods: {
        Row: {
          id: string;
          bike_id: string;
          name: string;
          category: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bike_id: string;
          name: string;
          category?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bike_mods_bike_id_fkey";
            columns: ["bike_id"];
            isOneToOne: false;
            referencedRelation: "bikes";
            referencedColumns: ["id"];
          }
        ];
      };
      routes: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string | null;
          city: string | null;
          difficulty: RouteDifficulty;
          distance_km: number | null;
          estimated_minutes: number | null;
          start_lat: number;
          start_lng: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description?: string | null;
          city?: string | null;
          difficulty?: RouteDifficulty;
          distance_km?: number | null;
          estimated_minutes?: number | null;
          start_lat: number;
          start_lng: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          city?: string | null;
          difficulty?: RouteDifficulty;
          distance_km?: number | null;
          estimated_minutes?: number | null;
          start_lat?: number;
          start_lng?: number;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      route_points: {
        Row: {
          id: number;
          route_id: string;
          point_order: number;
          lat: number;
          lng: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          route_id: string;
          point_order: number;
          lat: number;
          lng: number;
          created_at?: string;
        };
        Update: {
          point_order?: number;
          lat?: number;
          lng?: number;
        };
        Relationships: [
          {
            foreignKeyName: "route_points_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          }
        ];
      };
      spots: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          description: string | null;
          city: string | null;
          lat: number;
          lng: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          description?: string | null;
          city?: string | null;
          lat: number;
          lng: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          city?: string | null;
          lat?: number;
          lng?: number;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spots_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      route_sessions: {
        Row: {
          id: string;
          route_id: string;
          user_id: string;
          status: SessionStatus;
          is_location_shared: boolean;
          started_at: string;
          ended_at: string | null;
          last_lat: number | null;
          last_lng: number | null;
          last_speed_mps: number | null;
          last_heading_deg: number | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          user_id: string;
          status?: SessionStatus;
          is_location_shared?: boolean;
          started_at?: string;
          ended_at?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_speed_mps?: number | null;
          last_heading_deg?: number | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: SessionStatus;
          is_location_shared?: boolean;
          ended_at?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_speed_mps?: number | null;
          last_heading_deg?: number | null;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_sessions_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      session_locations: {
        Row: {
          id: number;
          session_id: string;
          user_id: string;
          route_id: string;
          lat: number;
          lng: number;
          speed_mps: number | null;
          heading_deg: number | null;
          accuracy_m: number | null;
          captured_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          user_id?: string;
          route_id?: string;
          lat: number;
          lng: number;
          speed_mps?: number | null;
          heading_deg?: number | null;
          accuracy_m?: number | null;
          captured_at?: string;
          created_at?: string;
        };
        Update: {
          lat?: number;
          lng?: number;
          speed_mps?: number | null;
          heading_deg?: number | null;
          accuracy_m?: number | null;
          captured_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_locations_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_locations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "route_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      active_route_riders: {
        Args: {
          p_route_id: string;
        };
        Returns: {
          session_id: string;
          user_id: string;
          username: string;
          last_lat: number | null;
          last_lng: number | null;
          last_seen_at: string | null;
        }[];
      };
      is_point_near_route_start: {
        Args: {
          p_route_id: string;
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      route_difficulty: RouteDifficulty;
      session_status: SessionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
