import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth';
import ReceptionistDashboard from './ReceptionistDashboard';
import TriageQueuePage from '../triage/TriageQueuePage';
import LaboratoryListPage from '../laboratory/LaboratoryListPage';
import ConsultationListPage from '../consultations/ConsultationListPage';
import AdminDashboard from './AdminDashboard';
import { 
  Activity, Users, Stethoscope, FlaskConical, LayoutGrid, Sparkles
} from 'lucide-react';

export default function RoleDashboard() {
  const { user } = useAuthStore();
  // @ts-ignore
  const userRole = user?.role || 'receptionist';
  const [activeTab, setActiveTab] = useState<'doctor' | 'receptionist' | 'nurse' | 'lab'>(
    userRole === 'doctor' ? 'doctor' : (userRole as any)
  );

  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  if (userRole === 'receptionist') {
    return <ReceptionistDashboard />;
  }

  if (userRole === 'lab_tech') {
    return <LaboratoryListPage />;
  }

  const isDoctor = userRole === 'doctor';
  const isNurse = userRole === 'nurse';

  // If doctor or nurse, render dashboard with switcher
  return (
    <div className="space-y-6">
      {/* Perspective Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              Perspective de Travail ({isDoctor ? 'Médecin' : 'Infirmier'})
              {isDoctor && (
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/20">
                  Mode Dieu
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {isDoctor 
                ? "Basculez entre les rôles pour faire des actions de garde ou d'assistance" 
                : "Basculez sur la réception pour pallier l'absence de réceptionniste"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDoctor && (
            <button
              onClick={() => setActiveTab('doctor')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'doctor'
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              Médecin
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('receptionist')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'receptionist'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Réception / Accueil
          </button>

          <button
            onClick={() => setActiveTab('nurse')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'nurse'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="h-4 w-4" />
            Infirmerie / Triage
          </button>

          {isDoctor && (
            <button
              onClick={() => setActiveTab('lab')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'lab'
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Laboratoire
            </button>
          )}
        </div>
      </div>

      {/* Render the selected perspective */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'doctor' && <ConsultationListPage />}
        {activeTab === 'receptionist' && <ReceptionistDashboard />}
        {activeTab === 'nurse' && <TriageQueuePage />}
        {activeTab === 'lab' && <LaboratoryListPage />}
      </div>
    </div>
  );
}
