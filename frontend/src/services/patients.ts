import api from '../lib/api';

export interface PatientListType {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: parseInt;
  gender: string;
  phone: string | null;
  city: string | null;
  is_deceased: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getPatients = async (params?: Record<string, any>): Promise<PaginatedResponse<PatientListType>> => {
  const response = await api.get('/patients/', { params });
  return response.data;
};

export const getPatientById = async (id: string) => {
  const response = await api.get(`/patients/${id}/`);
  return response.data;
};

export const getPatientTimeline = async (id: string) => {
  const response = await api.get(`/patients/${id}/timeline/`);
  return response.data;
};

export const createPatient = async (data: any) => {
  const response = await api.post('/patients/', data);
  return response.data;
};

export const updatePatient = async (id: string, data: any) => {
  const response = await api.patch(`/patients/${id}/`, data);
  return response.data;
};

export const deletePatient = async (id: string) => {
  const response = await api.delete(`/patients/${id}/`);
  return response.data;
};

export const createVisit = async (data: any) => {
  const response = await api.post('/visits/', data);
  return response.data;
};

export const toggleArchivePatient = async (id: string, is_archived: boolean) => {
  const archived_at = is_archived ? new Date().toISOString() : null;
  const response = await api.patch(`/patients/${id}/`, { is_archived, archived_at });
  return response.data;
};
