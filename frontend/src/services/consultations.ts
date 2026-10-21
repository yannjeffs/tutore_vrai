import api from '../lib/api';

export interface Consultation {
    id: string;
    patient: string;
    patient_name?: string;
    doctor?: string;
    doctor_name?: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    type: 'general' | 'specialist' | 'follow_up' | 'emergency';
    chief_complaint: string;
    anamnesis: string;
    physical_examination: string;
    conclusion: string;
    started_at?: string;
    ended_at?: string;
    created_at?: string;
    diagnoses?: any[];
    vital_signs?: any[];
    prescriptions?: any[];
    visit?: string;
    hospitalization_required?: boolean;
    hospitalization_reason?: string;
}

export interface ICD10Code {
    id: number;
    code: string;
    description: string;
    category: string;
}

export const consultationService = {
    getAll: async (params?: any) => {
        const response = await api.get('/consultations/', { params });
        return response.data;
    },
    
    getById: async (id: string) => {
        const response = await api.get(`/consultations/${id}/`);
        return response.data;
    },
    
    create: async (data: Partial<Consultation>) => {
        const response = await api.post('/consultations/', data);
        return response.data;
    },
    
    update: async (id: string, data: Partial<Consultation>) => {
        const response = await api.patch(`/consultations/${id}/`, data);
        return response.data;
    },

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/consultations/${id}/`, { status });
        return response.data;
    },

    complete: async (id: string) => {
        const response = await api.post(`/consultations/${id}/complete/`);
        return response.data;
    },

    searchICD10: async (query: string) => {
        const response = await api.get('/icd10/', { params: { search: query } });
        return response.data;
    },

    addDiagnosis: async (consultationId: string, data: any) => {
        const response = await api.post(`/consultations/${consultationId}/diagnoses/`, data);
        return response.data;
    },

    addVitalSigns: async (data: any) => {
        const response = await api.post('/vitals/', data);
        return response.data;
    },

    createPrescription: async (consultationId: string, data: any) => {
        const response = await api.post(`/consultations/${consultationId}/prescriptions/`, data);
        return response.data;
    },

    addPrescriptionItem: async (consultationId: string, prescriptionId: string, data: any) => {
        const response = await api.post(`/consultations/${consultationId}/prescriptions/${prescriptionId}/items/`, data);
        return response.data;
    },

    downloadPrescriptionPDF: async (consultationId: string, prescriptionId: string) => {
        const response = await api.get(`/consultations/${consultationId}/prescriptions/${prescriptionId}/download_pdf/`, {
            responseType: 'blob',
        });
        return response.data;
    }
};
