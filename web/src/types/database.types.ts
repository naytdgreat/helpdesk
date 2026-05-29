export type Database = {
  public: {
    Tables: {
      hospitals: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      wings: {
        Row: { id: string; hospital_id: string; name: string; created_at: string };
        Insert: { id?: string; hospital_id: string; name: string; created_at?: string };
        Update: { id?: string; hospital_id?: string; name?: string; created_at?: string };
      };
      offices: {
        Row: { id: string; wing_id: string; name: string; created_at: string };
        Insert: { id?: string; wing_id: string; name: string; created_at?: string };
        Update: { id?: string; wing_id?: string; name?: string; created_at?: string };
      };
      desks: {
        Row: { id: string; office_id: string; name: string; assigned_to_user: string | null; last_audit_at: string | null; created_at: string };
        Insert: { id?: string; office_id: string; name: string; assigned_to_user?: string | null; last_audit_at?: string | null; created_at?: string };
        Update: { id?: string; office_id?: string; name?: string; assigned_to_user?: string | null; last_audit_at?: string | null; created_at?: string };
      };
      profiles: {
        Row: { id: string; name: string | null; role: 'SUPER_ADMIN' | 'ADMIN' | 'IT_OFFICER'; hospital_id: string | null; created_at: string; updated_at: string };
        Insert: { id: string; name?: string | null; role?: 'SUPER_ADMIN' | 'ADMIN' | 'IT_OFFICER'; hospital_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string | null; role?: 'SUPER_ADMIN' | 'ADMIN' | 'IT_OFFICER'; hospital_id?: string | null; created_at?: string; updated_at?: string };
      };
      device_categories: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      devices: {
        Row: {
          id: string;
          hospital_id: string | null;
          barcode: string;
          serial_number: string | null;
          brand: string | null;
          model: string | null;
          specifications: any | null;
          category_id: string | null;
          desk_id: string | null;
          office_id: string | null;
          ip_address: string | null;
          mac_address: string | null;
          status: 'Available' | 'Deployed' | 'Faulty' | 'Disposal';
          maintenance_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hospital_id?: string | null;
          barcode: string;
          serial_number?: string | null;
          brand?: string | null;
          model?: string | null;
          specifications?: any | null;
          category_id?: string | null;
          desk_id?: string | null;
          office_id?: string | null;
          ip_address?: string | null;
          mac_address?: string | null;
          status?: 'Available' | 'Deployed' | 'Faulty' | 'Disposal';
          maintenance_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string | null;
          barcode?: string;
          serial_number?: string | null;
          brand?: string | null;
          model?: string | null;
          specifications?: any | null;
          category_id?: string | null;
          desk_id?: string | null;
          office_id?: string | null;
          ip_address?: string | null;
          mac_address?: string | null;
          status?: 'Available' | 'Deployed' | 'Faulty' | 'Disposal';
          maintenance_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      maintenance_logs: {
        Row: { id: string; device_id: string; it_officer_id: string; description: string; parts_replaced: string | null; performed_at: string };
        Insert: { id?: string; device_id: string; it_officer_id: string; description: string; parts_replaced?: string | null; performed_at?: string };
        Update: { id?: string; device_id?: string; it_officer_id?: string; description?: string; parts_replaced?: string | null; performed_at?: string };
      };
      complaints: {
        Row: { id: string; reporter_name: string; description: string; category: 'Software' | 'Hardware' | 'Network' | 'Other'; status: 'Open' | 'In Progress' | 'Resolved' | 'Escalated'; assigned_to_id: string | null; device_id: string | null; desk_id: string | null; notes: string | null; created_at: string };
        Insert: { id?: string; reporter_name: string; description: string; category: 'Software' | 'Hardware' | 'Network' | 'Other'; status?: 'Open' | 'In Progress' | 'Resolved' | 'Escalated'; assigned_to_id?: string | null; device_id?: string | null; desk_id?: string | null; notes?: string | null; created_at?: string };
        Update: { id?: string; reporter_name?: string; description?: string; category?: 'Software' | 'Hardware' | 'Network' | 'Other'; status?: 'Open' | 'In Progress' | 'Resolved' | 'Escalated'; assigned_to_id?: string | null; device_id?: string | null; desk_id?: string | null; notes?: string | null; created_at?: string };
      };
      requests: {
        Row: { id: string; reporter_name: string; item_type: string; quantity: number; status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected'; created_at: string };
        Insert: { id?: string; reporter_name: string; item_type: string; quantity?: number; status?: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected'; created_at?: string };
        Update: { id?: string; reporter_name?: string; item_type?: string; quantity?: number; status?: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected'; created_at?: string };
      };
      notifications: {
        Row: { id: string; user_id: string | null; title: string; message: string; link: string | null; is_read: boolean; created_at: string };
        Insert: { id?: string; user_id?: string | null; title: string; message: string; link?: string | null; is_read?: boolean; created_at?: string };
        Update: { id?: string; user_id?: string | null; title?: string; message?: string; link?: string | null; is_read?: boolean; created_at?: string };
      };
    };
  };
};
