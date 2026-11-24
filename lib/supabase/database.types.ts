export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      base_models: {
        Row: {
          body_mesh_pattern: string;
          camera_json: NonNullable<Json>;
          created_at: string;
          created_by: string | null;
          generation: string | null;
          glb_path: string;
          id: string;
          make: string | null;
          model: string | null;
          name: string;
          poster_path: string | null;
          scale: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body_mesh_pattern?: string;
          camera_json?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          generation?: string | null;
          glb_path: string;
          id?: string;
          make?: string | null;
          model?: string | null;
          name: string;
          poster_path?: string | null;
          scale?: number;
          updated_at?: string;
        };
        Update: {
          body_mesh_pattern?: string;
          camera_json?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          generation?: string | null;
          glb_path?: string;
          id?: string;
          make?: string | null;
          model?: string | null;
          name?: string;
          poster_path?: string | null;
          scale?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "base_models_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          car_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          period: unknown;
          reason: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          car_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period: unknown;
          reason?: string | null;
          updated_at?: string;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period?: unknown;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          car_id: string;
          comment: string | null;
          created_at: string;
          customer_email: string;
          customer_first_name: string;
          customer_last_name: string;
          customer_phone: string;
          deposit: number;
          experience_confirmed: boolean;
          id: string;
          ip_hash: string | null;
          license_year: number;
          locale: string;
          manager_note: string | null;
          number: number;
          period: unknown;
          platform_driver: Database["public"]["Enums"]["platform_driver"];
          price_breakdown: NonNullable<Json>;
          rejection_reason: string | null;
          rental_type: Database["public"]["Enums"]["rental_type"];
          status: Database["public"]["Enums"]["booking_status"];
          status_changed_at: string | null;
          status_changed_by: string | null;
          terms_accepted_at: string;
          total_price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          car_id: string;
          comment?: string | null;
          created_at?: string;
          customer_email: string;
          customer_first_name: string;
          customer_last_name: string;
          customer_phone: string;
          deposit: number;
          experience_confirmed?: boolean;
          id?: string;
          ip_hash?: string | null;
          license_year: number;
          locale?: string;
          manager_note?: string | null;
          number?: never;
          period: unknown;
          platform_driver: Database["public"]["Enums"]["platform_driver"];
          price_breakdown?: NonNullable<Json>;
          rejection_reason?: string | null;
          rental_type: Database["public"]["Enums"]["rental_type"];
          status?: Database["public"]["Enums"]["booking_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          terms_accepted_at: string;
          total_price: number;
          updated_at?: string;
        };
        Update: {
          car_id?: string;
          comment?: string | null;
          created_at?: string;
          customer_email?: string;
          customer_first_name?: string;
          customer_last_name?: string;
          customer_phone?: string;
          deposit?: number;
          experience_confirmed?: boolean;
          id?: string;
          ip_hash?: string | null;
          license_year?: number;
          locale?: string;
          manager_note?: string | null;
          number?: never;
          period?: unknown;
          platform_driver?: Database["public"]["Enums"]["platform_driver"];
          price_breakdown?: NonNullable<Json>;
          rejection_reason?: string | null;
          rental_type?: Database["public"]["Enums"]["rental_type"];
          status?: Database["public"]["Enums"]["booking_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          terms_accepted_at?: string;
          total_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      car_images: {
        Row: {
          alt_en: string | null;
          alt_lt: string | null;
          blur_data_url: string | null;
          car_id: string;
          created_at: string;
          height: number | null;
          id: string;
          is_cover: boolean;
          path: string;
          sort: number;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt_en?: string | null;
          alt_lt?: string | null;
          blur_data_url?: string | null;
          car_id: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          path: string;
          sort?: number;
          width?: number | null;
        };
        Update: {
          alt_en?: string | null;
          alt_lt?: string | null;
          blur_data_url?: string | null;
          car_id?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          path?: string;
          sort?: number;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "car_images_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
        ];
      };
      car_model_versions: {
        Row: {
          approved_at: string | null;
          car_id: string;
          created_at: string;
          created_by: string | null;
          glb_path: string;
          id: string;
          job_id: string | null;
          poster_path: string | null;
          rejected_at: string | null;
          size_bytes: number | null;
          source: Database["public"]["Enums"]["model_source"];
          triangles: number | null;
          view_settings: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          car_id: string;
          created_at?: string;
          created_by?: string | null;
          glb_path: string;
          id?: string;
          job_id?: string | null;
          poster_path?: string | null;
          rejected_at?: string | null;
          size_bytes?: number | null;
          source: Database["public"]["Enums"]["model_source"];
          triangles?: number | null;
          view_settings?: NonNullable<Json>;
        };
        Update: {
          approved_at?: string | null;
          car_id?: string;
          created_at?: string;
          created_by?: string | null;
          glb_path?: string;
          id?: string;
          job_id?: string | null;
          poster_path?: string | null;
          rejected_at?: string | null;
          size_bytes?: number | null;
          source?: Database["public"]["Enums"]["model_source"];
          triangles?: number | null;
          view_settings?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "car_model_versions_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_model_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_model_versions_job_fk";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "model_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      car_occupancy: {
        Row: {
          block_id: string | null;
          booking_id: string | null;
          car_id: string;
          id: number;
          period: unknown;
        };
        ComputedFields: never;
        Insert: {
          block_id?: string | null;
          booking_id?: string | null;
          car_id: string;
          id?: never;
          period: unknown;
        };
        Update: {
          block_id?: string | null;
          booking_id?: string | null;
          car_id?: string;
          id?: never;
          period?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "car_occupancy_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: true;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_occupancy_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "car_occupancy_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
        ];
      };
      cars: {
        Row: {
          active_model_version_id: string | null;
          base_model_id: string | null;
          body_type: Database["public"]["Enums"]["body_type"] | null;
          category_id: string;
          color: string | null;
          created_at: string;
          created_by: string | null;
          custom_specs: NonNullable<Json>;
          deposit: number | null;
          description_en: string | null;
          description_lt: string | null;
          features: NonNullable<Json>;
          id: string;
          livery_texture_path: string | null;
          make_id: string | null;
          model_source: Database["public"]["Enums"]["model_source"];
          plate: string | null;
          price_overrides: NonNullable<Json>;
          published_at: string | null;
          rental_rules: NonNullable<Json>;
          slug: string;
          sort: number;
          specs: NonNullable<Json>;
          status: Database["public"]["Enums"]["car_status"];
          title_en: string | null;
          title_lt: string;
          updated_at: string;
          vehicle_model_id: string | null;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          active_model_version_id?: string | null;
          base_model_id?: string | null;
          body_type?: Database["public"]["Enums"]["body_type"] | null;
          category_id: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_specs?: NonNullable<Json>;
          deposit?: number | null;
          description_en?: string | null;
          description_lt?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          livery_texture_path?: string | null;
          make_id?: string | null;
          model_source?: Database["public"]["Enums"]["model_source"];
          plate?: string | null;
          price_overrides?: NonNullable<Json>;
          published_at?: string | null;
          rental_rules?: NonNullable<Json>;
          slug: string;
          sort?: number;
          specs?: NonNullable<Json>;
          status?: Database["public"]["Enums"]["car_status"];
          title_en?: string | null;
          title_lt: string;
          updated_at?: string;
          vehicle_model_id?: string | null;
          year?: number | null;
        };
        Update: {
          active_model_version_id?: string | null;
          base_model_id?: string | null;
          body_type?: Database["public"]["Enums"]["body_type"] | null;
          category_id?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_specs?: NonNullable<Json>;
          deposit?: number | null;
          description_en?: string | null;
          description_lt?: string | null;
          features?: NonNullable<Json>;
          id?: string;
          livery_texture_path?: string | null;
          make_id?: string | null;
          model_source?: Database["public"]["Enums"]["model_source"];
          plate?: string | null;
          price_overrides?: NonNullable<Json>;
          published_at?: string | null;
          rental_rules?: NonNullable<Json>;
          slug?: string;
          sort?: number;
          specs?: NonNullable<Json>;
          status?: Database["public"]["Enums"]["car_status"];
          title_en?: string | null;
          title_lt?: string;
          updated_at?: string;
          vehicle_model_id?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cars_active_model_version_fk";
            columns: ["active_model_version_id", "id"];
            isOneToOne: false;
            referencedRelation: "car_model_versions";
            referencedColumns: ["id", "car_id"];
          },
          {
            foreignKeyName: "cars_base_model_id_fkey";
            columns: ["base_model_id"];
            isOneToOne: false;
            referencedRelation: "base_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cars_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cars_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cars_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "makes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cars_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          default_pricing: NonNullable<Json>;
          default_rental_rules: NonNullable<Json>;
          description_en: string | null;
          description_lt: string | null;
          icon: string | null;
          id: string;
          name_en: string;
          name_lt: string;
          slug: string;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_pricing?: NonNullable<Json>;
          default_rental_rules?: NonNullable<Json>;
          description_en?: string | null;
          description_lt?: string | null;
          icon?: string | null;
          id?: string;
          name_en: string;
          name_lt: string;
          slug: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_pricing?: NonNullable<Json>;
          default_rental_rules?: NonNullable<Json>;
          description_en?: string | null;
          description_lt?: string | null;
          icon?: string | null;
          id?: string;
          name_en?: string;
          name_lt?: string;
          slug?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      makes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      model_jobs: {
        Row: {
          ai_model: string | null;
          angles: NonNullable<Json>;
          car_id: string;
          cost_credits: number | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          finished_at: string | null;
          id: string;
          input_image_ids: string[];
          options: NonNullable<Json>;
          progress: number;
          provider: string;
          provider_task_id: string | null;
          result_version_id: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["model_job_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ai_model?: string | null;
          angles?: NonNullable<Json>;
          car_id: string;
          cost_credits?: number | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          input_image_ids?: string[];
          options?: NonNullable<Json>;
          progress?: number;
          provider: string;
          provider_task_id?: string | null;
          result_version_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["model_job_status"];
          updated_at?: string;
        };
        Update: {
          ai_model?: string | null;
          angles?: NonNullable<Json>;
          car_id?: string;
          cost_credits?: number | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          input_image_ids?: string[];
          options?: NonNullable<Json>;
          progress?: number;
          provider?: string;
          provider_task_id?: string | null;
          result_version_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["model_job_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "model_jobs_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "model_jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "model_jobs_result_version_id_fkey";
            columns: ["result_version_id"];
            isOneToOne: false;
            referencedRelation: "car_model_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_models: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null;
          created_at: string;
          id: string;
          make_id: string;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null;
          created_at?: string;
          id?: string;
          make_id: string;
          name: string;
          slug: string;
        };
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null;
          created_at?: string;
          id?: string;
          make_id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "makes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      car_busy_periods: {
        Row: {
          car_id: string;
          ends_at: string | null;
          period: unknown;
          starts_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          car_id?: string | null;
          ends_at?: never;
          period?: unknown;
          starts_at?: never;
        };
        Update: {
          car_id?: string | null;
          ends_at?: never;
          period?: unknown;
          starts_at?: never;
        };
        Relationships: [
          {
            foreignKeyName: "car_occupancy_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      available_cars: {
        Args: { p_from: string; p_to: string };
        Returns: {
          active_model_version_id: string | null;
          base_model_id: string | null;
          body_type: Database["public"]["Enums"]["body_type"] | null;
          category_id: string;
          color: string | null;
          created_at: string;
          created_by: string | null;
          custom_specs: NonNullable<Json>;
          deposit: number | null;
          description_en: string | null;
          description_lt: string | null;
          features: NonNullable<Json>;
          id: string;
          livery_texture_path: string | null;
          make_id: string | null;
          model_source: Database["public"]["Enums"]["model_source"];
          plate: string | null;
          price_overrides: NonNullable<Json>;
          published_at: string | null;
          rental_rules: NonNullable<Json>;
          slug: string;
          sort: number;
          specs: NonNullable<Json>;
          status: Database["public"]["Enums"]["car_status"];
          title_en: string | null;
          title_lt: string;
          updated_at: string;
          vehicle_model_id: string | null;
          year: number | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "cars";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      app_role: "admin" | "manager";
      body_type: "sedan" | "hatchback" | "wagon" | "suv" | "coupe" | "cabrio" | "minivan" | "van";
      booking_status: "pending" | "confirmed" | "rejected" | "cancelled";
      car_status: "draft" | "published" | "hidden" | "maintenance";
      model_job_status: "queued" | "processing" | "succeeded" | "failed" | "cancelled";
      model_source: "none" | "generated" | "uploaded" | "base_model";
      platform_driver: "yes" | "no" | "planning";
      rental_type: "hourly" | "daily" | "weekly" | "long_term";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager"],
      body_type: ["sedan", "hatchback", "wagon", "suv", "coupe", "cabrio", "minivan", "van"],
      booking_status: ["pending", "confirmed", "rejected", "cancelled"],
      car_status: ["draft", "published", "hidden", "maintenance"],
      model_job_status: ["queued", "processing", "succeeded", "failed", "cancelled"],
      model_source: ["none", "generated", "uploaded", "base_model"],
      platform_driver: ["yes", "no", "planning"],
      rental_type: ["hourly", "daily", "weekly", "long_term"],
    },
  },
} as const;
