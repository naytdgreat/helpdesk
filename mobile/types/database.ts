export type DeviceStatus = 'Available' | 'Deployed' | 'Faulty' | 'Disposal';
export type ComplaintCategory = 'Software' | 'Hardware' | 'Network' | 'Other';
export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Escalated';
export type RequestStatus = 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected';

export interface Device {
    id: string;
    barcode: string;
    serial_number: string | null;
    brand: string | null;
    model: string | null;
    specifications: Record<string, any> | null;
    category_id: string | null;
    desk_id: string | null;
    office_id: string | null;
    ip_address: string | null;
    mac_address: string | null;
    status: DeviceStatus;
    maintenance_count: number;
    created_at: string;
    updated_at: string;
}

export interface MaintenanceLog {
    id: string;
    device_id: string;
    it_officer_id: string;
    description: string;
    parts_replaced: string | null;
    performed_at: string;
}

export interface Complaint {
    id: string;
    reporter_name: string;
    description: string;
    category: ComplaintCategory;
    status: ComplaintStatus;
    assigned_to_id: string | null;
    device_id: string | null;
    desk_id: string | null;
    created_at: string;
}
