export type UserRole = 'primary_advisor' | 'advisor' | 'contributor' | 'observer'

export type GrantStatus =
  | 'idea'
  | 'research'
  | 'review'
  | 'pending_vote'
  | 'approved'
  | 'submitted'
  | 'paid'
  | 'declined'
  | 'closed'

export type Recommendation = 'approve' | 'decline' | 'abstain'

export type MeetingType = 'quarterly' | 'annual' | 'adhoc'
export type MeetingFormat = 'zoom' | 'call' | 'in_person'
export type GrantRecurrence = 'one_time' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export interface Database {
  public: {
    Tables: {
      foundations: {
        Row: {
          id: string
          name: string
          mission: string | null
          focus_areas: string[]
          geographic_scope: string | null
          annual_budget: number | null
          daf_balance: number | null
          ytd_granted: number | null
          annual_giving_goal: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          mission?: string | null
          focus_areas?: string[]
          geographic_scope?: string | null
          annual_budget?: number | null
          daf_balance?: number | null
          ytd_granted?: number | null
          annual_giving_goal?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          mission?: string | null
          focus_areas?: string[]
          geographic_scope?: string | null
          annual_budget?: number | null
          daf_balance?: number | null
          ytd_granted?: number | null
          annual_giving_goal?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          auth_id: string
          email: string
          name: string
          role: UserRole
          foundation_id: string
          photo_url: string | null
          bio: string | null
          philanthropic_interests: string[]
          notification_prefs: Record<string, boolean>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          name: string
          role?: UserRole
          foundation_id: string
          photo_url?: string | null
          bio?: string | null
          philanthropic_interests?: string[]
          notification_prefs?: Record<string, boolean>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          email?: string
          name?: string
          role?: UserRole
          foundation_id?: string
          photo_url?: string | null
          bio?: string | null
          philanthropic_interests?: string[]
          notification_prefs?: Record<string, boolean>
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          foundation_id: string
          name: string
          ein: string | null
          website: string | null
          mission: string | null
          annual_budget: number | null
          tax_status: string | null
          tags: string[]
          overall_rating: number | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          notes: string | null
          recommender: string | null
          personal_involvement: boolean
          impact_goals: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          foundation_id: string
          name: string
          ein?: string | null
          website?: string | null
          mission?: string | null
          annual_budget?: number | null
          tax_status?: string | null
          tags?: string[]
          overall_rating?: number | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          notes?: string | null
          recommender?: string | null
          personal_involvement?: boolean
          impact_goals?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          foundation_id?: string
          name?: string
          ein?: string | null
          website?: string | null
          mission?: string | null
          annual_budget?: number | null
          tax_status?: string | null
          tags?: string[]
          overall_rating?: number | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          notes?: string | null
          recommender?: string | null
          personal_involvement?: boolean
          impact_goals?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      grants: {
        Row: {
          id: string
          foundation_id: string
          organization_id: string
          status: GrantStatus
          amount: number
          purpose: string | null
          focus_areas: string[]
          start_date: string | null
          end_date: string | null
          proposed_by: string
          approved_by: string | null
          recurrence_type: GrantRecurrence
          next_payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          foundation_id: string
          organization_id: string
          status?: GrantStatus
          amount: number
          purpose?: string | null
          focus_areas?: string[]
          start_date?: string | null
          end_date?: string | null
          proposed_by: string
          approved_by?: string | null
          recurrence_type?: GrantRecurrence
          next_payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          foundation_id?: string
          organization_id?: string
          status?: GrantStatus
          amount?: number
          purpose?: string | null
          focus_areas?: string[]
          start_date?: string | null
          end_date?: string | null
          proposed_by?: string
          approved_by?: string | null
          recurrence_type?: GrantRecurrence
          next_payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grant_payments: {
        Row: {
          id: string
          grant_id: string
          amount: number
          payment_date: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grant_id: string
          amount: number
          payment_date: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grant_id?: string
          amount?: number
          payment_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      grant_reviews: {
        Row: {
          id: string
          grant_id: string
          reviewer_id: string
          mission_alignment: number
          impact: number
          capacity: number
          financial_health: number
          comments: string | null
          recommendation: Recommendation
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grant_id: string
          reviewer_id: string
          mission_alignment: number
          impact: number
          capacity: number
          financial_health: number
          comments?: string | null
          recommendation: Recommendation
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grant_id?: string
          reviewer_id?: string
          mission_alignment?: number
          impact?: number
          capacity?: number
          financial_health?: number
          comments?: string | null
          recommendation?: Recommendation
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          foundation_id: string
          type: MeetingType
          title: string
          date_time: string
          agenda_items: string[]
          attendees: string[]
          minutes: string | null
          format: MeetingFormat
          meeting_link: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          foundation_id: string
          type?: MeetingType
          title: string
          date_time: string
          agenda_items?: string[]
          attendees?: string[]
          minutes?: string | null
          format?: MeetingFormat
          meeting_link?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          foundation_id?: string
          type?: MeetingType
          title?: string
          date_time?: string
          agenda_items?: string[]
          attendees?: string[]
          minutes?: string | null
          format?: MeetingFormat
          meeting_link?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          foundation_id: string
          entity_type: 'organization' | 'grant' | 'meeting'
          entity_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          foundation_id: string
          entity_type: 'organization' | 'grant' | 'meeting'
          entity_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          foundation_id?: string
          entity_type?: 'organization' | 'grant' | 'meeting'
          entity_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      grant_comments: {
        Row: {
          id: string
          grant_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grant_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grant_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          foundation_id: string
          email: string
          role: UserRole
          invited_by: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          foundation_id: string
          email: string
          role?: UserRole
          invited_by: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          foundation_id?: string
          email?: string
          role?: UserRole
          invited_by?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      grant_status: GrantStatus
      recommendation: Recommendation
      meeting_type: MeetingType
    }
  }
}

// Helper types for easier usage
export type Foundation = Database['public']['Tables']['foundations']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Grant = Database['public']['Tables']['grants']['Row']
export type GrantReview = Database['public']['Tables']['grant_reviews']['Row']
export type Meeting = Database['public']['Tables']['meetings']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type GrantComment = Database['public']['Tables']['grant_comments']['Row']
export type GrantPayment = Database['public']['Tables']['grant_payments']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']

// Insert types
export type FoundationInsert = Database['public']['Tables']['foundations']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type GrantInsert = Database['public']['Tables']['grants']['Insert']
export type GrantReviewInsert = Database['public']['Tables']['grant_reviews']['Insert']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type GrantCommentInsert = Database['public']['Tables']['grant_comments']['Insert']
export type GrantPaymentInsert = Database['public']['Tables']['grant_payments']['Insert']
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert']

// Extended types with relations
export type GrantWithOrganization = Grant & {
  organization: Organization
}

export type GrantWithDetails = Grant & {
  organization: Organization
  proposed_by_user: User
  approved_by_user?: User
  reviews: (GrantReview & { reviewer: User })[]
  comments: (GrantComment & { user: User })[]
  documents: Document[]
}

export type OrganizationWithGrants = Organization & {
  grants: Grant[]
}

export type MeetingWithAttendees = Meeting & {
  attendee_users: User[]
}
