import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, User, X, Check, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { appointmentService } from '../../services/appointments';

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', filterDate],
    queryFn: () => appointmentService.getAll({ date: filterDate }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      appointmentService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement de l'agenda...</div>;

  const appointmentsList = appointments?.results || [];
  const scheduled = appointmentsList.filter((a: any) => a.status === 'SCHEDULED');
  const completed = appointmentsList.filter((a: any) => a.status === 'COMPLETED');
  const cancelled = appointmentsList.filter((a: any) => a.status === 'CANCELLED');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda & Rendez-vous</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez la planification des consultations</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <CalendarIcon className="h-5 w-5 text-slate-400" />
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border-none focus:ring-0 text-sm font-medium text-slate-700 bg-transparent outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduled List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            Rendez-vous programmés <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{scheduled.length}</span>
          </h2>
          {scheduled.length > 0 ? (
            <div className="space-y-3">
              {scheduled.map((appt: any) => (
                <div key={appt.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-center w-14 h-14 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                    <div className="text-center">
                      <span className="block text-sm font-bold leading-none">{format(parseISO(appt.appointment_date), 'HH')}</span>
                      <span className="block text-xs font-semibold leading-none mt-1">{format(parseISO(appt.appointment_date), 'mm')}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{appt.patient_name} <span className="text-slate-400 font-normal text-xs ml-1">({appt.patient_mrn})</span></h3>
                    <p className="text-sm text-slate-600 truncate mt-0.5">Motif: {appt.reason}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5">
                      <User className="h-3.5 w-3.5" /> Dr. {appt.doctor_name}
                    </p>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'CANCELLED' })}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center flex-1"
                      title="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'COMPLETED' })}
                      className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center flex-1"
                      title="Marquer Terminé"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Aucun rendez-vous programmé à cette date.</p>
            </div>
          )}
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Terminés / Honorés</h3>
            <div className="space-y-3">
              {completed.length > 0 ? completed.map((appt: any) => (
                <div key={appt.id} className="text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center opacity-70">
                  <div>
                    <span className="font-semibold text-slate-800 block">{appt.patient_name}</span>
                    <span className="text-xs text-slate-500">{format(parseISO(appt.appointment_date), 'HH:mm')}</span>
                  </div>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )) : <p className="text-xs text-slate-500 italic">Aucun pour le moment.</p>}
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Annulés</h3>
            <div className="space-y-3">
              {cancelled.length > 0 ? cancelled.map((appt: any) => (
                <div key={appt.id} className="text-sm p-3 bg-red-50/50 rounded-lg border border-red-100 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block">{appt.patient_name}</span>
                    <span className="text-xs text-slate-500">{format(parseISO(appt.appointment_date), 'HH:mm')}</span>
                  </div>
                  <X className="h-4 w-4 text-red-500" />
                </div>
              )) : <p className="text-xs text-slate-500 italic">Aucun pour le moment.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
