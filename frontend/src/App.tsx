import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPatients } from './services/patients';
import { Users, UserCircle } from 'lucide-react';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import PatientListPage from './pages/patients/PatientListPage';
import PatientCreatePage from './pages/patients/PatientCreatePage';
import PatientCreateProvisionalPage from './pages/patients/PatientCreateProvisionalPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import PatientMergePage from './pages/patients/PatientMergePage';
import PatientEditPage from './pages/patients/PatientEditPage';
import PatientRecordPrintView from './pages/patients/PatientRecordPrintView';
import ConsultationListPage from './pages/consultations/ConsultationListPage';
import ConsultationCreatePage from './pages/consultations/ConsultationCreatePage';
import ConsultationDetailPage from './pages/consultations/ConsultationDetailPage';
import LaboratoryListPage from './pages/laboratory/LaboratoryListPage';
import TriageQueuePage from './pages/triage/TriageQueuePage';
import CashierQueuePage from './pages/billing/CashierQueuePage';
import HospitalDashboardPage from './pages/hospitalization/HospitalDashboardPage';
import NursingActsPage from './pages/nursing/NursingActsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import ArchivedRecordsPage from './pages/archives/ArchivedRecordsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import { useAuthStore } from './store/auth';

import RoleDashboard from './pages/dashboard/RoleDashboard';

export default function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } />
        
        <Route path="/patients/:id/export" element={<PatientRecordPrintView />} />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<RoleDashboard />} />
          <Route path="triage" element={<TriageQueuePage />} />
          <Route path="patients">
            <Route index element={<PatientListPage />} />
            <Route path="new" element={<PatientCreatePage />} />
            <Route path="new-provisional" element={<PatientCreateProvisionalPage />} />
            <Route path="merge" element={<PatientMergePage />} />
            <Route path=":id" element={<PatientDetailPage />} />
            <Route path=":id/edit" element={<PatientEditPage />} />
          </Route>
          <Route path="consultations">
            <Route index element={<ConsultationListPage />} />
            <Route path="new" element={<ConsultationCreatePage />} />
            <Route path=":id" element={<ConsultationDetailPage />} />
          </Route>
          <Route path="laboratory" element={<LaboratoryListPage />} />
          <Route path="soins-infirmiers" element={<NursingActsPage />} />
          <Route path="caisse" element={<CashierQueuePage />} />
          <Route path="hospitalisation" element={<HospitalDashboardPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="archives" element={<ArchivedRecordsPage />} />
          <Route path="admin/users" element={<UserManagementPage />} />
          <Route path="settings" element={<div>Paramètres (En construction)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
