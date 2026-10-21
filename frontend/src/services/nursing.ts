import api from '../lib/api';

export interface NursingActType {
  id: number;
  name: string;
  category: string;
  category_display: string;
  default_price: number;
  is_active: boolean;
}

export interface NursingAct {
  id: number;
  visit: number;
  patient: number;
  patient_name: string;
  act_type: number;
  act_type_name: string;
  price: number;
  notes?: string;
  status: 'pending' | 'completed';
  performed_by?: number;
  performed_by_name?: string;
  completed_at?: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export const nursingService = {
  getActTypes: async () => {
    const response = await api.get('/nursing-act-types/');
    return response.data;
  },
  
  getActs: async (params?: Record<string, any>) => {
    const response = await api.get('/nursing-acts/', { params });
    return response.data;
  },
  
  createAct: async (data: { visit: number, patient: number, act_type: number, notes?: string }) => {
    const response = await api.post('/nursing-acts/', data);
    return response.data;
  },
  
  completeAct: async (id: number) => {
    const response = await api.post(`/nursing-acts/${id}/complete/`);
    return response.data;
  }
};
