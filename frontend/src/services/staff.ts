import api from '../lib/api';

export interface UserType {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface StaffType {
  id: string;
  user: UserType;
  employee_number: string;
  title: string | null;
  specialization: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active_staff: boolean;
  role: 'doctor' | 'nurse' | 'receptionist' | 'lab_tech' | 'admin';
}

export const getStaffList = async (params?: { role?: string }): Promise<StaffType[]> => {
  const response = await api.get('/staff/', { params });
  return response.data.results || response.data;
};

export const createStaff = async (data: any): Promise<StaffType> => {
  const response = await api.post('/staff/', data);
  return response.data;
};

export const updateStaff = async (id: string, data: any): Promise<StaffType> => {
  const response = await api.patch(`/staff/${id}/`, data);
  return response.data;
};

export const deleteStaff = async (id: string): Promise<void> => {
  await api.delete(`/staff/${id}/`);
};
