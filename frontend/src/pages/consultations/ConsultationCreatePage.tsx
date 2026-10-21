import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, X, Stethoscope, Activity, FileText, Search, Thermometer } from 'lucide-react';
import { consultationService } from '../../services/consultations';
import { getPatients } from '../../services/patients';
import { getVisitById } from '../../services/visits';

export default function ConsultationCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get('visit_id');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    patient: '',
    visit: '',
    type: 'general',
    chief_complaint: '',
    anamnesis: '',
    physical_examination: '',
    conclusion: '',
    status: 'in_progress'
  });

  const [patientSearch, setPatientSearch] = useState('');

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => getPatients({ search: patientSearch }),
    enabled: patientSearch.length >= 0 && !visitId,
  });

  const { data: visitData, isLoading: visitLoading } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisitById(visitId!),
    enabled: !!visitId,
  });

  useEffect(() => {
    if (visitData) {
      setFormData(prev => ({
        ...prev,
        patient: visitData.patient,
        visit: visitData.id,
        chief_complaint: visitData.reason_for_visit || '',
        type: (visitData.visit_type === 'emergency' ? 'emergency' : 'general') as any,
      }));
    }
  }, [visitData]);

  const createMutation = useMutation({
    mutationFn: (data: any) => consultationService.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['doctor_visits_queue'] });
      navigate(`/consultations/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient) {
      alert('Veuillez sélectionner un patient.');
      return;
    }
    createMutation.mutate(formData);
  };

  const vitals = visitData?.vital_signs;

  if (visitId && visitLoading) {
    return <div className="p-8 text-center text-slate-500">Chargement des données de la visite...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Nouvelle Consultation
          </h1>
          <p className="text-sm text-slate-500 mt-1">Saisie des informations de la consultation (SOAP)</p>
        </div>
        <button
          onClick={() => navigate('/consultations')}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Triage Vitals Panel */}
      {vitals && (
        <div className="card p-6 border border-primary/20 bg-primary/5 space-y-4">
          <h2 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-primary/10 pb-3">
            <Thermometer className="h-5 w-5 text-primary" />
            Constantes Vitales du Triage
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Température</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.temperature ? `${vitals.temperature} °C` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pression Artérielle</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic
                  ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`
                  : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fréquence Cardiaque</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.heart_rate ? `${vitals.heart_rate} bpm` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SpO2 (Saturation)</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.oxygen_saturation ? `${vitals.oxygen_saturation} %` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Poids</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.weight ? `${vitals.weight} kg` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Taille</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.height ? `${vitals.height} cm` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fréquence Respi</span>
              <span className="text-lg font-extrabold text-slate-800 mt-1">
                {vitals.respiratory_rate ? `${vitals.respiratory_rate} cpm` : '--'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prise par</span>
              <span className="text-xs font-extrabold text-slate-700 mt-1 truncate">
                {vitals.recorded_by_name || 'Infirmier'}
              </span>
            </div>
          </div>
          {vitals.notes && (
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
              <strong className="text-slate-800">Observations triage :</strong> {vitals.notes}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection & Basic Info */}
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
            <FileText className="h-5 w-5 text-primary" />
            Informations Générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Sélectionner un patient *</label>
              {visitData ? (
                <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800">
                  {visitData.patient_name} ({visitData.patient_mrn})
                </div>
              ) : (
                <select
                  required
                  value={formData.patient}
                  onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                >
                  <option value="">-- Choisir un patient --</option>
                  {patientsData?.results?.map((patient: any) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} ({patient.mrn})
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Type de consultation</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              >
                <option value="general">Générale</option>
                <option value="specialist">Spécialiste</option>
                <option value="follow_up">Suivi</option>
                <option value="emergency">Urgence</option>
              </select>
            </div>
          </div>
        </div>

        {/* SOAP Form */}
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Activity className="h-5 w-5 text-primary" />
            Notes Cliniques (SOAP)
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Motif de consultation (Subjectif)</label>
              <input
                type="text"
                required
                value={formData.chief_complaint}
                onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                placeholder="Raison principale de la visite..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Anamnèse / Histoire de la maladie</label>
              <textarea
                rows={4}
                value={formData.anamnesis}
                onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
                placeholder="Détails des symptômes, antécédents récents..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Examen Physique (Objectif)</label>
              <textarea
                rows={4}
                value={formData.physical_examination}
                onChange={(e) => setFormData({ ...formData, physical_examination: e.target.value })}
                placeholder="Observations cliniques, signes vitaux pertinents..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Conclusion / Plan (Évaluation & Plan)</label>
              <textarea
                rows={4}
                value={formData.conclusion}
                onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                placeholder="Diagnostic de présomption, conduite à tenir..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Fixed Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/consultations')}
              className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
