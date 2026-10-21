import api from '../lib/api';

export const laboratoryService = {
    getExamTypes: async (params?: any) => {
        const response = await api.get('/exam-types/', { params });
        return response.data;
    },

    getLabRequests: async (params?: any) => {
        const response = await api.get('/lab-requests/', { params });
        return response.data;
    },

    createLabRequest: async (data: any) => {
        const response = await api.post('/lab-requests/', data);
        return response.data;
    },

    addLabResult: async (labRequestId: string, data: any) => {
        const response = await api.post(`/lab-requests/${labRequestId}/add_result/`, data);
        return response.data;
    },

    updateLabRequest: async (labRequestId: string, data: any) => {
        const response = await api.patch(`/lab-requests/${labRequestId}/`, data);
        return response.data;
    },

    getImagingRequests: async (params?: any) => {
        const response = await api.get('/imaging-requests/', { params });
        return response.data;
    },

    createImagingRequest: async (data: any) => {
        const response = await api.post('/imaging-requests/', data);
        return response.data;
    },

    addImagingReport: async (imagingRequestId: string, reportText: string) => {
        const response = await api.post(`/imaging-requests/${imagingRequestId}/add_report/`, { report: reportText });
        return response.data;
    }
};
