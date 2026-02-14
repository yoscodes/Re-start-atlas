/**
 * Supabase Database Types
 * マイグレーション: 20250125000000_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string | null
          phase_level: number
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          phase_level?: number
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          phase_level?: number
          created_at?: string
        }
      }
      recovery_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          summary: string
          problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
          phase_at_post: number
          started_at: string | null
          recovered_at: string | null
          current_status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          summary: string
          problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
          phase_at_post: number
          started_at?: string | null
          recovered_at?: string | null
          current_status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          summary?: string
          problem_category?: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
          phase_at_post?: number
          started_at?: string | null
          recovered_at?: string | null
          current_status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      recovery_steps: {
        Row: {
          id: string
          post_id: string
          step_order: number
          content: string
          is_failure: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          step_order: number
          content: string
          is_failure?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          step_order?: number
          content?: string
          is_failure?: boolean
          created_at?: string
        }
      }
      regions: {
        Row: {
          id: number
          prefecture: string
          city: string | null
          created_at: string
        }
        Insert: {
          id?: number
          prefecture: string
          city?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          prefecture?: string
          city?: string | null
          created_at?: string
        }
      }
      post_regions: {
        Row: {
          post_id: string
          region_id: number
        }
        Insert: {
          post_id: string
          region_id: number
        }
        Update: {
          post_id?: string
          region_id?: number
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          post_id: string
          user_id: string
          type: 'empathy' | 'respect'
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          type: 'empathy' | 'respect'
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          type?: 'empathy' | 'respect'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_recovery_post: {
        Args: {
          p_title: string
          p_summary: string
          p_problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
          p_phase_at_post: number
          p_started_at: string | null
          p_recovered_at: string | null
          p_current_status: string
          p_steps: Json
          p_region_ids: number[]
          p_tag_names: string[]
        }
        Returns: {
          post_id: string // UUID
          created_at: string // TIMESTAMPTZ
        }[]
      }
      update_recovery_post: {
        Args: {
          p_post_id: string // UUID
          p_title: string
          p_summary: string
          p_problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
          p_phase_at_post: number
          p_started_at: string | null
          p_recovered_at: string | null
          p_current_status: string
          p_steps: Json
          p_region_ids: number[]
          p_tag_names: string[]
        }
        Returns: {
          post_id: string // UUID
          updated_at: string // TIMESTAMPTZ
        }[]
      }
      delete_recovery_post: {
        Args: {
          p_post_id: string // UUID
        }
        Returns: {
          post_id: string // UUID
          deleted_at: string // TIMESTAMPTZ
        }[]
      }
      restore_recovery_post: {
        Args: {
          p_post_id: string // UUID
        }
        Returns: {
          post_id: string // UUID
          restored_at: string // TIMESTAMPTZ
        }[]
      }
    }
    Enums: {
      problem_category: 'debt' | 'unemployed' | 'dropout' | 'addiction' | 'relationship'
      reaction_type: 'empathy' | 'respect'
    }
  }
}

// 便利な型エイリアス
export type User = Database['public']['Tables']['users']['Row']
export type RecoveryPost = Database['public']['Tables']['recovery_posts']['Row']
export type RecoveryStep = Database['public']['Tables']['recovery_steps']['Row']
export type Region = Database['public']['Tables']['regions']['Row']
export type PostRegion = Database['public']['Tables']['post_regions']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type PostTag = Database['public']['Tables']['post_tags']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Reaction = Database['public']['Tables']['reactions']['Row']

export type ProblemCategory = Database['public']['Enums']['problem_category']
export type ReactionType = Database['public']['Enums']['reaction_type']

// 後方互換（DB enum の型名をそのまま参照している箇所向け）
export type problem_category_enum = ProblemCategory
