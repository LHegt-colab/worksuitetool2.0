// WorkSuite Tool 2.0 - Database Types (v2_ schema)

export interface V2Profile {
  id: string
  email: string | null
  full_name: string | null
  language: string
  theme: string
  created_at: string
  updated_at: string
}

export interface V2Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface V2Action {
  id: string
  user_id: string
  title: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  meeting_id: string | null
  created_at: string
  updated_at: string
  tags?: V2Tag[]
}

export interface V2Meeting {
  id: string
  user_id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  participants: string | null
  notes: string | null
  created_at: string
  updated_at: string
  tags?: V2Tag[]
  decisions?: V2Decision[]
  actions?: V2Action[]
}

export interface V2Decision {
  id: string
  meeting_id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
}

export interface V2JournalEntry {
  id: string
  user_id: string
  entry_date: string
  content: string | null
  created_at: string
  updated_at: string
}

export interface V2KnowledgePage {
  id: string
  user_id: string
  title: string
  content: string | null
  url: string | null
  category: string | null
  created_at: string
  updated_at: string
  tags?: V2Tag[]
}

export interface V2CalendarEvent {
  id: string
  user_id: string
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  color: string
  all_day: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface V2Settings {
  id: string
  user_id: string
  language: string
  theme: string
  week_start_day: number
  created_at: string
  updated_at: string
}

export type CalendarItemType = string

export interface CalendarItem {
  id: string
  type: CalendarItemType
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  color: string
  status?: string
  priority?: string
  all_day?: boolean
}

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Database {
  public: {
    Tables: {
      v2_profiles: {
        Row: { id: string; email: string | null; full_name: string | null; language: string; theme: string; created_at: string; updated_at: string }
        Insert: { id?: string; email?: string | null; full_name?: string | null; language?: string; theme?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string | null; full_name?: string | null; language?: string; theme?: string; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_tags: {
        Row: { id: string; user_id: string; name: string; color: string; created_at: string }
        Insert: { id?: string; user_id: string; name: string; color: string; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; color?: string; created_at?: string }
        Relationships: Rel[]
      }
      v2_actions: {
        Row: { id: string; user_id: string; title: string; description: string | null; status: string; priority: string; start_date: string | null; due_date: string | null; completed_at: string | null; meeting_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; description?: string | null; status?: string; priority?: string; start_date?: string | null; due_date?: string | null; completed_at?: string | null; meeting_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; description?: string | null; status?: string; priority?: string; start_date?: string | null; due_date?: string | null; completed_at?: string | null; meeting_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_action_tags: {
        Row: { action_id: string; tag_id: string }
        Insert: { action_id: string; tag_id: string }
        Update: { action_id?: string; tag_id?: string }
        Relationships: Rel[]
      }
      v2_meetings: {
        Row: { id: string; user_id: string; title: string; date: string; start_time: string | null; end_time: string | null; location: string | null; participants: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; date: string; start_time?: string | null; end_time?: string | null; location?: string | null; participants?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; date?: string; start_time?: string | null; end_time?: string | null; location?: string | null; participants?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_meeting_tags: {
        Row: { meeting_id: string; tag_id: string }
        Insert: { meeting_id: string; tag_id: string }
        Update: { meeting_id?: string; tag_id?: string }
        Relationships: Rel[]
      }
      v2_decisions: {
        Row: { id: string; meeting_id: string; user_id: string; title: string; description: string | null; created_at: string }
        Insert: { id?: string; meeting_id: string; user_id: string; title: string; description?: string | null; created_at?: string }
        Update: { id?: string; meeting_id?: string; user_id?: string; title?: string; description?: string | null; created_at?: string }
        Relationships: Rel[]
      }
      v2_journal_entries: {
        Row: { id: string; user_id: string; entry_date: string; content: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; entry_date: string; content?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; entry_date?: string; content?: string | null; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_knowledge_pages: {
        Row: { id: string; user_id: string; title: string; content: string | null; url: string | null; category: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; content?: string | null; url?: string | null; category?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; content?: string | null; url?: string | null; category?: string | null; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_knowledge_tags: {
        Row: { knowledge_id: string; tag_id: string }
        Insert: { knowledge_id: string; tag_id: string }
        Update: { knowledge_id?: string; tag_id?: string }
        Relationships: Rel[]
      }
      v2_calendar_events: {
        Row: { id: string; user_id: string; title: string; event_date: string; start_time: string | null; end_time: string | null; color: string; all_day: boolean; description: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title: string; event_date: string; start_time?: string | null; end_time?: string | null; color?: string; all_day?: boolean; description?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; event_date?: string; start_time?: string | null; end_time?: string | null; color?: string; all_day?: boolean; description?: string | null; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
      v2_settings: {
        Row: { id: string; user_id: string; language: string; theme: string; week_start_day: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; language?: string; theme?: string; week_start_day?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; language?: string; theme?: string; week_start_day?: number; created_at?: string; updated_at?: string }
        Relationships: Rel[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
