export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'user'

export type ProjectStatus =
  | 'briefing'
  | 'building'
  | 'internal_review'
  | 'client_review'
  | 'approved'
  | 'changes_requested'
  | 'delivered'

export type ProjectAccessLevel = 'owner' | 'editor' | 'viewer'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          client_name: string | null
          client_business: string | null
          status: ProjectStatus
          created_by: string
          assigned_to: string | null
          selected_template_id: string | null
          brand_data: Json
          briefing_data: Json
          page_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          client_name?: string | null
          client_business?: string | null
          status?: ProjectStatus
          created_by: string
          assigned_to?: string | null
          selected_template_id?: string | null
          brand_data?: Json
          briefing_data?: Json
          page_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_name?: string | null
          client_business?: string | null
          status?: ProjectStatus
          created_by?: string
          assigned_to?: string | null
          selected_template_id?: string | null
          brand_data?: Json
          briefing_data?: Json
          page_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          access_level: ProjectAccessLevel
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          access_level?: ProjectAccessLevel
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          access_level?: ProjectAccessLevel
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
