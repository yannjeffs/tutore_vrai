import api from '../lib/api';

export const getAdminDashboardStats = async (period: string = 'today') => {
  const response = await api.get(`/dashboard/admin/?period=${period}`);
  return response.data;
};
