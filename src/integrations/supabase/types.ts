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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          user_agent: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_categories: {
        Row: {
          color: string
          created_at: string
          hotkey: string
          icon: string
          id: string
          name: string
          order_index: number
          post_seconds: number
          pre_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          hotkey?: string
          icon?: string
          id?: string
          name: string
          order_index?: number
          post_seconds?: number
          pre_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          hotkey?: string
          icon?: string
          id?: string
          name?: string
          order_index?: number
          post_seconds?: number
          pre_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_events: {
        Row: {
          category_color: string
          category_id: string | null
          category_name: string
          created_at: string
          id: string
          label: string
          notes: string
          post_seconds: number
          pre_seconds: number
          source: string
          timestamp_seconds: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          category_color?: string
          category_id?: string | null
          category_name?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string
          post_seconds?: number
          pre_seconds?: number
          source?: string
          timestamp_seconds: number
          updated_at?: string
          user_id?: string
          video_id: string
        }
        Update: {
          category_color?: string
          category_id?: string | null
          category_name?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string
          post_seconds?: number
          pre_seconds?: number
          source?: string
          timestamp_seconds?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "analysis_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "analysis_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_videos: {
        Row: {
          competition: string
          created_at: string
          duration_seconds: number | null
          id: string
          match_date: string | null
          notes: string
          opponent: string
          season_team_id: string | null
          source: string
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          competition?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          match_date?: string | null
          notes?: string
          opponent?: string
          season_team_id?: string | null
          source?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Update: {
          competition?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          match_date?: string | null
          notes?: string
          opponent?: string
          season_team_id?: string | null
          source?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          player_id: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          player_id: string
          status?: string
          team_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          player_id?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_team_id: string
          competition: string
          created_at: string
          home_team_id: string
          id: string
          match_date: string | null
          matchday: string
          notes: string
          own_team_id: string | null
          season_id: string
          user_id: string
        }
        Insert: {
          away_team_id: string
          competition?: string
          created_at?: string
          home_team_id: string
          id?: string
          match_date?: string | null
          matchday?: string
          notes?: string
          own_team_id?: string | null
          season_id: string
          user_id?: string
        }
        Update: {
          away_team_id?: string
          competition?: string
          created_at?: string
          home_team_id?: string
          id?: string
          match_date?: string | null
          matchday?: string
          notes?: string
          own_team_id?: string | null
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_own_team_id_fkey"
            columns: ["own_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          effective_minute: number | null
          effective_seconds: number | null
          finishing_foot: string
          fixture_id: string | null
          goal_x: number | null
          goal_y: number | null
          id: string
          live_match_id: string | null
          match_id: string | null
          minute: number | null
          ordinal: number
          period: number | null
          pitch_x: number | null
          pitch_y: number | null
          players_on_court: string[]
          previous_action: string
          real_seconds: number | null
          score_against: number
          score_for: number
          scorer_id: string | null
          second_post: boolean
          side: string
          subcategory: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          effective_minute?: number | null
          effective_seconds?: number | null
          finishing_foot?: string
          fixture_id?: string | null
          goal_x?: number | null
          goal_y?: number | null
          id?: string
          live_match_id?: string | null
          match_id?: string | null
          minute?: number | null
          ordinal?: number
          period?: number | null
          pitch_x?: number | null
          pitch_y?: number | null
          players_on_court?: string[]
          previous_action?: string
          real_seconds?: number | null
          score_against?: number
          score_for?: number
          scorer_id?: string | null
          second_post?: boolean
          side: string
          subcategory?: string
          user_id?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          effective_minute?: number | null
          effective_seconds?: number | null
          finishing_foot?: string
          fixture_id?: string | null
          goal_x?: number | null
          goal_y?: number | null
          id?: string
          live_match_id?: string | null
          match_id?: string | null
          minute?: number | null
          ordinal?: number
          period?: number | null
          pitch_x?: number | null
          pitch_y?: number | null
          players_on_court?: string[]
          previous_action?: string
          real_seconds?: number | null
          score_against?: number
          score_for?: number
          scorer_id?: string | null
          second_post?: boolean
          side?: string
          subcategory?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      live_events: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          effective_minute: number | null
          effective_seconds: number | null
          goal_x: number | null
          goal_y: number | null
          id: string
          kind: string
          live_match_id: string
          minute: number | null
          on_court_ids: string[]
          period: number
          pitch_x: number | null
          pitch_y: number | null
          player_id: string | null
          real_seconds: number | null
          subcategory: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          effective_minute?: number | null
          effective_seconds?: number | null
          goal_x?: number | null
          goal_y?: number | null
          id?: string
          kind: string
          live_match_id: string
          minute?: number | null
          on_court_ids?: string[]
          period?: number
          pitch_x?: number | null
          pitch_y?: number | null
          player_id?: string | null
          real_seconds?: number | null
          subcategory?: string
          user_id?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          effective_minute?: number | null
          effective_seconds?: number | null
          goal_x?: number | null
          goal_y?: number | null
          id?: string
          kind?: string
          live_match_id?: string
          minute?: number | null
          on_court_ids?: string[]
          period?: number
          pitch_x?: number | null
          pitch_y?: number | null
          player_id?: string | null
          real_seconds?: number | null
          subcategory?: string
          user_id?: string
        }
        Relationships: []
      }
      live_matches: {
        Row: {
          away_team_id: string | null
          called_player_ids: string[]
          created_at: string
          current_period: number
          elapsed_seconds: number
          finished_at: string | null
          fixture_id: string | null
          fouls_away_p1: number
          fouls_away_p2: number
          fouls_home_p1: number
          fouls_home_p2: number
          home_team_id: string | null
          id: string
          on_court_ids: string[]
          own_side: string
          own_team_id: string | null
          real_duration_p1: number | null
          real_duration_p2: number | null
          real_duration_p3: number | null
          real_duration_p4: number | null
          score_away: number
          score_home: number
          season_id: string | null
          status: string
          timeout_away_p1: boolean
          timeout_away_p2: boolean
          timeout_home_p1: boolean
          timeout_home_p2: boolean
          user_id: string
        }
        Insert: {
          away_team_id?: string | null
          called_player_ids?: string[]
          created_at?: string
          current_period?: number
          elapsed_seconds?: number
          finished_at?: string | null
          fixture_id?: string | null
          fouls_away_p1?: number
          fouls_away_p2?: number
          fouls_home_p1?: number
          fouls_home_p2?: number
          home_team_id?: string | null
          id?: string
          on_court_ids?: string[]
          own_side?: string
          own_team_id?: string | null
          real_duration_p1?: number | null
          real_duration_p2?: number | null
          real_duration_p3?: number | null
          real_duration_p4?: number | null
          score_away?: number
          score_home?: number
          season_id?: string | null
          status?: string
          timeout_away_p1?: boolean
          timeout_away_p2?: boolean
          timeout_home_p1?: boolean
          timeout_home_p2?: boolean
          user_id?: string
        }
        Update: {
          away_team_id?: string | null
          called_player_ids?: string[]
          created_at?: string
          current_period?: number
          elapsed_seconds?: number
          finished_at?: string | null
          fixture_id?: string | null
          fouls_away_p1?: number
          fouls_away_p2?: number
          fouls_home_p1?: number
          fouls_home_p2?: number
          home_team_id?: string | null
          id?: string
          on_court_ids?: string[]
          own_side?: string
          own_team_id?: string | null
          real_duration_p1?: number | null
          real_duration_p2?: number | null
          real_duration_p3?: number | null
          real_duration_p4?: number | null
          score_away?: number
          score_home?: number
          season_id?: string | null
          status?: string
          timeout_away_p1?: boolean
          timeout_away_p2?: boolean
          timeout_home_p1?: boolean
          timeout_home_p2?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_matches_own_team_id_fkey"
            columns: ["own_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_player_time: {
        Row: {
          current_stint_started_at: number | null
          id: string
          live_match_id: string
          player_id: string
          total_seconds: number
          user_id: string
        }
        Insert: {
          current_stint_started_at?: number | null
          id?: string
          live_match_id: string
          player_id: string
          total_seconds?: number
          user_id?: string
        }
        Update: {
          current_stint_started_at?: number | null
          id?: string
          live_match_id?: string
          player_id?: string
          total_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          competition: string
          created_at: string
          home_away: string
          id: string
          match_date: string | null
          matchday: string
          notes: string
          opponent: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          competition?: string
          created_at?: string
          home_away?: string
          id?: string
          match_date?: string | null
          matchday?: string
          notes?: string
          opponent?: string
          team_id?: string | null
          user_id?: string
        }
        Update: {
          competition?: string
          created_at?: string
          home_away?: string
          id?: string
          match_date?: string | null
          matchday?: string
          notes?: string
          opponent?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_audit_log: {
        Row: {
          admin_user_id: string
          conflicts: number
          created_at: string
          dest_user_ids: string[]
          details: Json
          duration_ms: number
          entity_type: string
          id: string
          items_copied: number
          items_failed: number
          items_requested: number
          items_skipped: number
          operation: string
          result: string
          source_user_id: string | null
        }
        Insert: {
          admin_user_id: string
          conflicts?: number
          created_at?: string
          dest_user_ids?: string[]
          details?: Json
          duration_ms?: number
          entity_type: string
          id?: string
          items_copied?: number
          items_failed?: number
          items_requested?: number
          items_skipped?: number
          operation: string
          result?: string
          source_user_id?: string | null
        }
        Update: {
          admin_user_id?: string
          conflicts?: number
          created_at?: string
          dest_user_ids?: string[]
          details?: Json
          duration_ms?: number
          entity_type?: string
          id?: string
          items_copied?: number
          items_failed?: number
          items_requested?: number
          items_skipped?: number
          operation?: string
          result?: string
          source_user_id?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string
          description: string
          id: string
          is_system: boolean
          key: string
          label: string
          route: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          key: string
          label: string
          route?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          route?: string
        }
        Relationships: []
      }
      planning_events: {
        Row: {
          created_at: string
          created_by: string
          data: Json
          duration_minutes: number | null
          event_date: string
          event_time: string | null
          fixture_id: string | null
          id: string
          intensity: string | null
          location: string
          notes: string
          season_id: string | null
          team_id: string
          title: string
          training_session_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          data?: Json
          duration_minutes?: number | null
          event_date: string
          event_time?: string | null
          fixture_id?: string | null
          id?: string
          intensity?: string | null
          location?: string
          notes?: string
          season_id?: string | null
          team_id: string
          title?: string
          training_session_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: Json
          duration_minutes?: number | null
          event_date?: string
          event_time?: string | null
          fixture_id?: string | null
          id?: string
          intensity?: string | null
          location?: string
          notes?: string
          season_id?: string | null
          team_id?: string
          title?: string
          training_session_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_events_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_events_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_macrocycles: {
        Row: {
          color: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          name: string
          objective: string
          season_id: string | null
          start_date: string
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string
          end_date: string
          id?: string
          name: string
          objective?: string
          season_id?: string | null
          start_date: string
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          name?: string
          objective?: string
          season_id?: string | null
          start_date?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_macrocycles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_macrocycles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_mesocycles: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          expected_load: string
          focus: string
          id: string
          macrocycle_id: string
          name: string
          notes: string
          start_date: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          end_date: string
          expected_load?: string
          focus?: string
          id?: string
          macrocycle_id: string
          name: string
          notes?: string
          start_date: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          expected_load?: string
          focus?: string
          id?: string
          macrocycle_id?: string
          name?: string
          notes?: string
          start_date?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_mesocycles_macrocycle_id_fkey"
            columns: ["macrocycle_id"]
            isOneToOne: false
            referencedRelation: "planning_macrocycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_mesocycles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_microcycles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mesocycle_id: string
          name: string
          notes: string
          planned_load: string
          team_id: string
          updated_at: string
          week_end: string
          week_start: string
          weekly_objective: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          mesocycle_id: string
          name: string
          notes?: string
          planned_load?: string
          team_id: string
          updated_at?: string
          week_end: string
          week_start: string
          weekly_objective?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mesocycle_id?: string
          name?: string
          notes?: string
          planned_load?: string
          team_id?: string
          updated_at?: string
          week_end?: string
          week_start?: string
          weekly_objective?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_microcycles_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "planning_mesocycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_microcycles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_team_goals: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          season_id: string | null
          status: string
          target_value: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          season_id?: string | null
          status?: string
          target_value?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          season_id?: string | null
          status?: string
          target_value?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_team_goals_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_team_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          created_at: string
          dominant_foot: string
          dominant_hand: string | null
          email: string
          first_name: string
          id: string
          jersey_number: number | null
          last_name: string
          phone: string
          photo_url: string | null
          position: string
          sport_name: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          dominant_foot?: string
          dominant_hand?: string | null
          email?: string
          first_name?: string
          id?: string
          jersey_number?: number | null
          last_name?: string
          phone?: string
          photo_url?: string | null
          position?: string
          sport_name?: string
          team_id?: string | null
          user_id?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          dominant_foot?: string
          dominant_hand?: string | null
          email?: string
          first_name?: string
          id?: string
          jersey_number?: number | null
          last_name?: string
          phone?: string
          photo_url?: string | null
          position?: string
          sport_name?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_attendance: {
        Row: {
          created_at: string
          id: string
          player_id: string
          status: string
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          status?: string
          training_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          status?: string
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "presence_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_callups: {
        Row: {
          created_at: string
          id: string
          player_id: string
          training_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          training_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_callups_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "presence_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_trainings: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string
          season_id: string | null
          source_session_id: string | null
          team_id: string
          time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string
          season_id?: string | null
          source_session_id?: string | null
          team_id: string
          time?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string
          season_id?: string | null
          source_session_id?: string | null
          team_id?: string
          time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_trainings_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          avatar_url: string | null
          created_at: string
          default_team_id: string | null
          email: string
          full_name: string
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          default_team_id?: string | null
          email: string
          full_name?: string
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          default_team_id?: string | null
          email?: string
          full_name?: string
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scouting_clips: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string
          season_team_id: string
          side: string
          source: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          notes?: string
          season_team_id: string
          side: string
          source?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string
          season_team_id?: string
          side?: string
          source?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      season_teams: {
        Row: {
          city: string
          coach: string
          created_at: string
          id: string
          is_own: boolean
          logo_url: string | null
          name: string
          notes: string
          own_team_id: string | null
          season_id: string
          short_name: string
          user_id: string
        }
        Insert: {
          city?: string
          coach?: string
          created_at?: string
          id?: string
          is_own?: boolean
          logo_url?: string | null
          name: string
          notes?: string
          own_team_id?: string | null
          season_id: string
          short_name?: string
          user_id?: string
        }
        Update: {
          city?: string
          coach?: string
          created_at?: string
          id?: string
          is_own?: boolean
          logo_url?: string | null
          name?: string
          notes?: string
          own_team_id?: string | null
          season_id?: string
          short_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_teams_own_team_id_fkey"
            columns: ["own_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          team_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          description: string
          duration: string
          id: string
          image_url: string | null
          keywords: string
          material: string
          other_notes: string
          players: string
          secondary_category: string | null
          surface: string
          task_number: number
          user_id: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          image_url?: string | null
          keywords?: string
          material?: string
          other_notes?: string
          players?: string
          secondary_category?: string | null
          surface?: string
          task_number?: number
          user_id?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          image_url?: string | null
          keywords?: string
          material?: string
          other_notes?: string
          players?: string
          secondary_category?: string | null
          surface?: string
          task_number?: number
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          category: string
          competition: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          competition?: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          competition?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_attendance: {
        Row: {
          created_at: string
          id: string
          player_id: string
          present: boolean
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          present?: boolean
          session_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          present?: boolean
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_tasks: {
        Row: {
          block: string
          created_at: string
          id: string
          order_index: number
          session_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          block: string
          created_at?: string
          id?: string
          order_index?: number
          session_id: string
          task_id: string
          user_id?: string
        }
        Update: {
          block?: string
          created_at?: string
          id?: string
          order_index?: number
          session_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_texts: {
        Row: {
          block: string
          content: string
          created_at: string
          id: string
          order_index: number
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block: string
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          session_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          block?: string
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_texts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          competitive_period: string
          created_at: string
          id: string
          microcycle: string
          objectives: string
          other_notes: string
          rival: string
          session_date: string | null
          session_number: string
          session_time: string
          team_id: string
          updated_at: string
          user_id: string
          venue: string
        }
        Insert: {
          competitive_period?: string
          created_at?: string
          id?: string
          microcycle?: string
          objectives?: string
          other_notes?: string
          rival?: string
          session_date?: string | null
          session_number?: string
          session_time?: string
          team_id: string
          updated_at?: string
          user_id?: string
          venue?: string
        }
        Update: {
          competitive_period?: string
          created_at?: string
          id?: string
          microcycle?: string
          objectives?: string
          other_notes?: string
          rival?: string
          session_date?: string | null
          session_number?: string
          session_time?: string
          team_id?: string
          updated_at?: string
          user_id?: string
          venue?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          confirmation_token: string
          created_at: string
          device_id: string
          id: string
          last_seen_at: string
          status: string
          user_agent: string
          user_id: string
        }
        Insert: {
          confirmation_token?: string
          created_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          status?: string
          user_agent?: string
          user_id: string
        }
        Update: {
          confirmation_token?: string
          created_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          status?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          created_at: string
          id: string
          max_clubs: number | null
          max_teams: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_clubs?: number | null
          max_teams?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_clubs?: number | null
          max_teams?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_modules: {
        Row: {
          created_at: string
          disabled: boolean
          ends_at: string
          id: string
          module_id: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          ends_at: string
          id?: string
          module_id: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          ends_at?: string
          id?: string
          module_id?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
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
      clone_tasks_to_user: {
        Args: {
          _dest_user_id: string
          _numbering_mode?: string
          _task_ids: string[]
        }
        Returns: Json
      }
      clone_team_to_user: {
        Args: {
          _conflict_strategy?: string
          _dest_user_id: string
          _source_team_id: string
        }
        Returns: Json
      }
      get_my_approval_status: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
