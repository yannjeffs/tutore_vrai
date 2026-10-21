import api from '../lib/api';

export interface VisitType {
  id: string;
  patient: string;
  patient_name: string;
  patient_mrn: string;
  patient_outstanding_balance: string;
  passage_number: string;
  status: string;
  visit_type: string;
  priority_level: number;
  reason_for_visit: string;
  assigned_doctor: string | null;
  assigned_doctor_name: string | null;
  department: string | null;
  invoice_created: boolean;
  is_paid: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  active_consultation_id?: string | null;
  prescribed_exams?: any[];
}

export interface PaginatedVisitsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VisitType[];
}

export const getVisits = async (params?: Record<string, any>): Promise<PaginatedVisitsResponse> => {
  const response = await api.get('/visits/', { params });
  return response.data;
};

export const getVisitById = async (id: string): Promise<VisitType> => {
  const response = await api.get(`/visits/${id}/`);
  return response.data;
};

export const registerArrival = async (data: {
  patient: string;
  visit_type: string;
  priority_level: number;
  reason_for_visit?: string;
  assigned_doctor?: string | null;
  department?: string | null;
  force_emergency?: boolean;
  force_cashier?: boolean;
}): Promise<VisitType> => {
  const response = await api.post('/visits/register-arrival/', data);
  return response.data;
};

export const updateVisit = async (id: string, data: Partial<VisitType>): Promise<VisitType> => {
  const response = await api.patch(`/visits/${id}/`, data);
  return response.data;
};

export const recordVitals = async (
  visitId: string,
  data: {
    temperature?: number | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    heart_rate?: number | null;
    respiratory_rate?: number | null;
    oxygen_saturation?: number | null;
    weight?: number | null;
    height?: number | null;
    notes?: string;
    priority_level?: number;
    assigned_doctor?: string | null;
  }
): Promise<{ visit: VisitType; vitals: any }> => {
  const response = await api.post(`/visits/${visitId}/record-vitals/`, data);
  return response.data;
};

export const collectPayment = async (visitId: string): Promise<VisitType> => {
  const response = await api.post(`/visits/${visitId}/collect-payment/`);
  return response.data;
};

