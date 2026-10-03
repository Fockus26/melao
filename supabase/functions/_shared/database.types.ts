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
      audio_latency: {
        Row: {
          device_key: string
          device_label: string | null
          id: string
          measured_at: string
          offset_ms: number
          platform: Database["public"]["Enums"]["client_platform"]
          sd_ms: number | null
          taps: number | null
          user_id: string
        }
        Insert: {
          device_key: string
          device_label?: string | null
          id?: string
          measured_at?: string
          offset_ms: number
          platform: Database["public"]["Enums"]["client_platform"]
          sd_ms?: number | null
          taps?: number | null
          user_id: string
        }
        Update: {
          device_key?: string
          device_label?: string | null
          id?: string
          measured_at?: string
          offset_ms?: number
          platform?: Database["public"]["Enums"]["client_platform"]
          sd_ms?: number | null
          taps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_latency_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_units: {
        Row: {
          course_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          published: boolean
          style_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          style_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          style_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: true
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      dance_styles: {
        Row: {
          beats_per_phrase: number
          call_beat: number
          call_span_beats: number
          created_at: string
          difficulty_bpm_bands: number[] | null
          has_roles: boolean
          id: string
          lead_in_phrases: number
          name: string
          published: boolean
          slug: string
          sort_order: number
          spoken_beats: number[]
          start_position_id: string | null
          updated_at: string
        }
        Insert: {
          beats_per_phrase?: number
          call_beat?: number
          call_span_beats?: number
          created_at?: string
          difficulty_bpm_bands?: number[] | null
          has_roles?: boolean
          id?: string
          lead_in_phrases?: number
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          spoken_beats: number[]
          start_position_id?: string | null
          updated_at?: string
        }
        Update: {
          beats_per_phrase?: number
          call_beat?: number
          call_span_beats?: number
          created_at?: string
          difficulty_bpm_bands?: number[] | null
          has_roles?: boolean
          id?: string
          lead_in_phrases?: number
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          spoken_beats?: number[]
          start_position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dance_styles_start_position_fk"
            columns: ["id", "start_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["style_id", "id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_steps: {
        Row: {
          lesson_id: string
          position: number
          step_id: string
        }
        Insert: {
          lesson_id: string
          position: number
          step_id: string
        }
        Update: {
          lesson_id?: string
          position?: number
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          final_song_id: string | null
          id: string
          intro: string | null
          position: number
          practice_phrases: number | null
          practice_song_id: string | null
          title: string
          unit_id: string
        }
        Insert: {
          final_song_id?: string | null
          id?: string
          intro?: string | null
          position: number
          practice_phrases?: number | null
          practice_song_id?: string | null
          title: string
          unit_id: string
        }
        Update: {
          final_song_id?: string | null
          id?: string
          intro?: string | null
          position?: number
          practice_phrases?: number | null
          practice_song_id?: string | null
          title?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_final_song_id_fkey"
            columns: ["final_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_practice_song_id_fkey"
            columns: ["practice_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "course_units"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          id: string
          includes_coaching: boolean
          is_active: boolean
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          includes_coaching?: boolean
          is_active?: boolean
          name: string
          price_cents: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          includes_coaching?: boolean
          is_active?: boolean
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          id: string
          name: string
          slug: string
          style_id: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          style_id: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_session_steps: {
        Row: {
          phrases: number
          session_id: string
          step_id: string
        }
        Insert: {
          phrases: number
          session_id: string
          step_id: string
        }
        Update: {
          phrases?: number
          session_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_session_steps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_session_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          filters: Json
          id: string
          lesson_id: string | null
          mode: Database["public"]["Enums"]["session_mode"]
          phrases_available: number
          plan: Json
          seed: number
          song_id: string
          style_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          filters?: Json
          id?: string
          lesson_id?: string | null
          mode: Database["public"]["Enums"]["session_mode"]
          phrases_available: number
          plan: Json
          seed: number
          song_id: string
          style_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          filters?: Json
          id?: string
          lesson_id?: string | null
          mode?: Database["public"]["Enums"]["session_mode"]
          phrases_available?: number
          plan?: Json
          seed?: number
          song_id?: string
          style_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"]
          coach_spoken_count: boolean
          coach_voice_volume: number
          created_at: string
          dance_role: Database["public"]["Enums"]["dance_role"] | null
          default_style_id: string | null
          display_name: string | null
          experience_level: Database["public"]["Enums"]["experience_level"] | null
          id: string
          onboarded_at: string | null
          theme: Database["public"]["Enums"]["theme_pref"]
          updated_at: string
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"]
          coach_spoken_count?: boolean
          coach_voice_volume?: number
          created_at?: string
          dance_role?: Database["public"]["Enums"]["dance_role"] | null
          default_style_id?: string | null
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id: string
          onboarded_at?: string | null
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"]
          coach_spoken_count?: boolean
          coach_voice_volume?: number
          created_at?: string
          dance_role?: Database["public"]["Enums"]["dance_role"] | null
          default_style_id?: string | null
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          onboarded_at?: string | null
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_style_id_fkey"
            columns: ["default_style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      song_styles: {
        Row: {
          song_id: string
          style_id: string
        }
        Insert: {
          song_id: string
          style_id: string
        }
        Update: {
          song_id?: string
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_styles_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string
          audio_path: string | null
          beat_grid: Json | null
          bpm: number | null
          created_at: string
          dance_end_ms: number | null
          difficulty_override: number | null
          duration_ms: number | null
          id: string
          license_document_path: string | null
          license_expires_at: string | null
          license_notes: string | null
          license_source: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          audio_path?: string | null
          beat_grid?: Json | null
          bpm?: number | null
          created_at?: string
          dance_end_ms?: number | null
          difficulty_override?: number | null
          duration_ms?: number | null
          id?: string
          license_document_path?: string | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_source?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          audio_path?: string | null
          beat_grid?: Json | null
          bpm?: number | null
          created_at?: string
          dance_end_ms?: number | null
          difficulty_override?: number | null
          duration_ms?: number | null
          id?: string
          license_document_path?: string | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_source?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      srs_cards: {
        Row: {
          created_at: string
          difficulty: number
          due_at: string
          lapses: number
          last_review_at: string | null
          reps: number
          role: Database["public"]["Enums"]["dance_role"]
          stability: number
          state: Database["public"]["Enums"]["card_state"]
          step_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number
          due_at?: string
          lapses?: number
          last_review_at?: string | null
          reps?: number
          role: Database["public"]["Enums"]["dance_role"]
          stability?: number
          state?: Database["public"]["Enums"]["card_state"]
          step_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          due_at?: string
          lapses?: number
          last_review_at?: string | null
          reps?: number
          role?: Database["public"]["Enums"]["dance_role"]
          stability?: number
          state?: Database["public"]["Enums"]["card_state"]
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_cards_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      step_prerequisites: {
        Row: {
          requires_step_id: string
          step_id: string
        }
        Insert: {
          requires_step_id: string
          step_id: string
        }
        Update: {
          requires_step_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_prerequisites_requires_step_id_fkey"
            columns: ["requires_step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_prerequisites_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_reviews: {
        Row: {
          context: Database["public"]["Enums"]["review_context"]
          due_after: string | null
          id: string
          lesson_id: string | null
          rating: number
          reviewed_at: string
          role: Database["public"]["Enums"]["dance_role"]
          session_id: string | null
          step_id: string
          user_id: string
        }
        Insert: {
          context: Database["public"]["Enums"]["review_context"]
          due_after?: string | null
          id?: string
          lesson_id?: string | null
          rating: number
          reviewed_at?: string
          role: Database["public"]["Enums"]["dance_role"]
          session_id?: string | null
          step_id: string
          user_id: string
        }
        Update: {
          context?: Database["public"]["Enums"]["review_context"]
          due_after?: string | null
          id?: string
          lesson_id?: string | null
          rating?: number
          reviewed_at?: string
          role?: Database["public"]["Enums"]["dance_role"]
          session_id?: string | null
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_reviews_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      step_videos: {
        Row: {
          aspect: string
          created_at: string
          duration_ms: number | null
          id: string
          poster_path: string | null
          role: Database["public"]["Enums"]["video_role"]
          step_id: string
          video_path: string
        }
        Insert: {
          aspect?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          poster_path?: string | null
          role: Database["public"]["Enums"]["video_role"]
          step_id: string
          video_path: string
        }
        Update: {
          aspect?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          poster_path?: string | null
          role?: Database["public"]["Enums"]["video_role"]
          step_id?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_videos_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          beat_notes: Json
          can_end: boolean
          can_start: boolean
          category: Database["public"]["Enums"]["step_category"]
          created_at: string
          description: string | null
          difficulty: number
          end_position_id: string
          id: string
          name: string
          phrases: number
          published: boolean
          repeatable: boolean
          slug: string
          sort_order: number
          start_position_id: string
          style_id: string
          updated_at: string
          variation_of: string | null
          voice_clip_path: string | null
        }
        Insert: {
          beat_notes?: Json
          can_end?: boolean
          can_start?: boolean
          category: Database["public"]["Enums"]["step_category"]
          created_at?: string
          description?: string | null
          difficulty: number
          end_position_id: string
          id?: string
          name: string
          phrases?: number
          published?: boolean
          repeatable?: boolean
          slug: string
          sort_order?: number
          start_position_id: string
          style_id: string
          updated_at?: string
          variation_of?: string | null
          voice_clip_path?: string | null
        }
        Update: {
          beat_notes?: Json
          can_end?: boolean
          can_start?: boolean
          category?: Database["public"]["Enums"]["step_category"]
          created_at?: string
          description?: string | null
          difficulty?: number
          end_position_id?: string
          id?: string
          name?: string
          phrases?: number
          published?: boolean
          repeatable?: boolean
          slug?: string
          sort_order?: number
          start_position_id?: string
          style_id?: string
          updated_at?: string
          variation_of?: string | null
          voice_clip_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_style_id_end_position_id_fkey"
            columns: ["style_id", "end_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["style_id", "id"]
          },
          {
            foreignKeyName: "steps_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_style_id_start_position_id_fkey"
            columns: ["style_id", "start_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["style_id", "id"]
          },
          {
            foreignKeyName: "steps_style_id_variation_of_fkey"
            columns: ["style_id", "variation_of"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["style_id", "id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          provider: Database["public"]["Enums"]["subscription_provider"]
          provider_ref: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          provider: Database["public"]["Enums"]["subscription_provider"]
          provider_ref?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          provider?: Database["public"]["Enums"]["subscription_provider"]
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_song_favorites: {
        Row: {
          created_at: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_song_favorites_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_song_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_steps: {
        Row: {
          favorite: boolean
          status: Database["public"]["Enums"]["step_status"]
          step_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          favorite?: boolean
          status?: Database["public"]["Enums"]["step_status"]
          step_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          favorite?: boolean
          status?: Database["public"]["Enums"]["step_status"]
          step_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_styles: {
        Row: {
          created_at: string
          style_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          style_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          style_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "dance_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_styles_user_id_fkey"
            columns: ["user_id"]
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
      admin_save_step: {
        Args: {
          p_prerequisites: string[]
          p_step: Json
          p_step_id: string | null
          p_style_id: string
        }
        Returns: string
      }
      admin_step_issues: { Args: { p_step_id: string }; Returns: string[] }
      admin_steps: {
        Args: { p_style_id: string }
        Returns: {
          category: Database["public"]["Enums"]["step_category"]
          difficulty: number
          has_voice_clip: boolean
          id: string
          lesson_count: number
          name: string
          published: boolean
          slug: string
          sort_order: number
          videos_complete: boolean
        }[]
      }
      complete_onboarding: {
        Args: {
          p_dance_role: Database["public"]["Enums"]["dance_role"]
          p_level: Database["public"]["Enums"]["experience_level"]
          p_style_ids: string[]
        }
        Returns: undefined
      }
      course_path: {
        Args: { p_style_id: string }
        Returns: {
          course_id: string
          lesson_count: number
          lesson_id: string
          lesson_number: number
          lesson_position: number
          lesson_title: string
          status: string
          step_count: number
          unit_id: string
          unit_position: number
          unit_title: string
        }[]
      }
      due_steps: {
        Args: { p_style_id: string }
        Returns: {
          due_at: string
          name: string
          slug: string
          step_id: string
        }[]
      }
      ef_activate_subscription: {
        Args: { p_plan_slug: string; p_user: string }
        Returns: Json
      }
      ef_password_recently_used: {
        Args: { p_candidate: string; p_user: string }
        Returns: boolean
      }
      ef_plan_session: {
        Args: { p_payload: Json; p_user: string }
        Returns: Json
      }
      ef_plan_session_state: {
        Args: {
          p_lesson?: string
          p_song: string
          p_style: string
          p_user: string
        }
        Returns: Json
      }
      ef_review_state: {
        Args: { p_step_ids: string[]; p_user: string }
        Returns: Json
      }
      ef_review_steps: {
        Args: { p_payload: Json; p_user: string }
        Returns: Json
      }
      hardest_steps: {
        Args: { p_limit?: number; p_style_id: string }
        Returns: {
          difficulty: number
          lapses: number
          last_rating: number
          last_reviewed_at: string
          name: string
          slug: string
          step_id: string
        }[]
      }
      has_active_subscription: { Args: never; Returns: boolean }
      my_subscription: {
        Args: never
        Returns: {
          billing_interval: string | null
          canceled_at: string | null
          currency: string | null
          current_period_end: string
          plan_name: string | null
          price_cents: number | null
          state: string
          status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      practice_songs: {
        Args: { p_style: string }
        Returns: {
          artist: string
          beat_grid: Json
          bpm: number
          dance_end_ms: number
          difficulty: number
          duration_ms: number
          favorite: boolean
          popularity: number
          ready: boolean
          sessions_30d: number
          song_id: string
          title: string
        }[]
      }
      review_forecast: {
        Args: { p_days?: number; p_style_id: string; p_tz?: string }
        Returns: {
          day: string
          due_count: number
        }[]
      }
      save_audio_latency: {
        Args: {
          p_device_key: string
          p_device_label: string | null
          p_offset_ms: number
          p_platform: Database["public"]["Enums"]["client_platform"]
          p_sd_ms?: number | null
          p_taps?: number | null
        }
        Returns: {
          device_key: string
          device_label: string | null
          id: string
          measured_at: string
          offset_ms: number
          platform: Database["public"]["Enums"]["client_platform"]
          sd_ms: number | null
          taps: number | null
          user_id: string
        }
      }
      set_app_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target: string
        }
        Returns: undefined
      }
      song_popularity: {
        Args: never
        Returns: {
          percentile: number
          sessions_30d: number
          song_id: string
        }[]
      }
      step_catalog: {
        Args: { p_style_id: string }
        Returns: {
          category: Database["public"]["Enums"]["step_category"]
          difficulty: number
          due_at: string
          favorite: boolean
          name: string
          slug: string
          status: Database["public"]["Enums"]["step_status"]
          step_id: string
        }[]
      }
      step_detail: {
        Args: { p_slug: string; p_style_id: string }
        Returns: {
          beat_notes: Json
          category: Database["public"]["Enums"]["step_category"]
          description: string
          difficulty: number
          due_at: string
          end_position: string
          favorite: boolean
          free: boolean
          history: Json
          name: string
          phrases: number
          related: Json
          role: Database["public"]["Enums"]["dance_role"]
          slug: string
          start_position: string
          status: Database["public"]["Enums"]["step_status"]
          step_id: string
          style_id: string
          videos: Json
        }[]
      }
      step_popularity: {
        Args: { style: string }
        Returns: {
          appearances_30d: number
          percentile: number
          step_id: string
        }[]
      }
      step_status_counts: {
        Args: { p_style_id: string }
        Returns: {
          known_count: number
          learning_count: number
          total: number
          unknown_count: number
        }[]
      }
      style_progress: {
        Args: never
        Returns: {
          chosen: boolean
          completed_count: number
          has_course: boolean
          has_roles: boolean
          lesson_count: number
          name: string
          style_id: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      card_state: "new" | "learning" | "review" | "relearning"
      client_platform: "web" | "android" | "ios"
      dance_role: "leader" | "follower"
      experience_level: "beginner" | "knows_steps"
      review_context: "lesson" | "practice" | "catalog"
      session_mode: "lesson" | "free"
      step_category:
        | "base"
        | "vuelta"
        | "entrada"
        | "salida"
        | "figura"
        | "variacion"
        | "libre"
      step_status: "unknown" | "learning" | "known"
      subscription_provider:
        | "placeholder"
        | "stripe"
        | "google_play"
        | "app_store"
      subscription_status: "active" | "past_due" | "canceled" | "expired"
      theme_pref: "system" | "light" | "dark"
      video_role: "leader" | "follower" | "both"
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
    Enums: {
      app_role: ["student", "teacher", "admin"],
      card_state: ["new", "learning", "review", "relearning"],
      client_platform: ["web", "android", "ios"],
      dance_role: ["leader", "follower"],
      experience_level: ["beginner", "knows_steps"],
      review_context: ["lesson", "practice", "catalog"],
      session_mode: ["lesson", "free"],
      step_category: [
        "base",
        "vuelta",
        "entrada",
        "salida",
        "figura",
        "variacion",
        "libre",
      ],
      step_status: ["unknown", "learning", "known"],
      subscription_provider: [
        "placeholder",
        "stripe",
        "google_play",
        "app_store",
      ],
      subscription_status: ["active", "past_due", "canceled", "expired"],
      theme_pref: ["system", "light", "dark"],
      video_role: ["leader", "follower", "both"],
    },
  },
} as const
