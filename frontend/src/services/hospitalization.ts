import api from '../lib/api';

export interface WardType {
  id: string;
  name: string;
  department: string;
  beds_count: number;
  available_beds_count: number;
  created_at: string;
}

export interface BedType {
  id: string;
  name: string;
  ward: string;
  ward_name: string;
  status: 'available' | 'occupied' | 'maintenance';
  price_per_day: number;
  current_occupant?: {
    hospitalization_id: string;
    patient_id: string;
    patient_name: string;
    patient_mrn: string;
    visit_id: string;
    visit_number: string;
    admitted_at: string;
    reason: string;
    doctor_name: string;
  } | null;
}

export interface InpatientLogType {
  id: string;
  hospitalization: string;
  recorded_by: string;
  recorded_by_name: string;
  recorded_at: string;
  temperature?: number;
  blood_pressure?: string;
  pulse_rate?: number;
  notes: string;
  medication_administered?: string;
}

export interface HospitalizationType {
  id: string;
  visit: string;
  patient: string;
  patient_name: string;
  patient_mrn: string;
  bed: string;
  bed_name: string;
  ward_name: string;
  reason?: string;
  admitted_by: string;
  admitted_by_name: string;
  admitted_at: string;
  discharged_by?: string;
  discharged_by_name?: string;
  discharged_at?: string;
  discharge_summary?: string;
  status: 'active' | 'discharged';
  is_paid: boolean;
  days_count: number;
  total_cost: number;
  logs: InpatientLogType[];
}

export const getWards = async (): Promise<WardType[]> => {
  const response = await api.get('/wards/');
  return response.data.results || response.data;
};

export const getBeds = async (): Promise<BedType[]> => {
  const response = await api.get('/beds/');
  return response.data.results || response.data;
};

export const getHospitalizations = async (params?: Record<string, any>): Promise<HospitalizationType[]> => {
  const response = await api.get('/hospitalizations/', { params });
  return response.data.results || response.data;
};

export const createHospitalization = async (data: {
  visit: string;
  patient: string;
  bed: string;
  reason?: string;
}): Promise<HospitalizationType> => {
  const response = await api.post('/hospitalizations/', data);
  return response.data;
};

export const dischargeHospitalization = async (
  id: string,
  data: { discharge_summary?: string }
): Promise<HospitalizationType> => {
  const response = await api.post(`/hospitalizations/${id}/discharge/`, data);
  return response.data;
};

export const addInpatientLog = async (
  id: string,
  data: {
    temperature?: number;
    blood_pressure?: string;
    pulse_rate?: number;
    notes: string;
    medication_administered?: string;
  }
): Promise<HospitalizationType> => {
  const response = await api.post(`/hospitalizations/${id}/add-log/`, data);
  return response.data;
};
