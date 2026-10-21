import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Stethoscope, Activity, FileText, Pill, FlaskConical, Download, 
  Plus, CheckCircle, ChevronLeft, Thermometer, Calendar, History, X
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { consultationService } from '../../services/consultations';
import { laboratoryService } from '../../services/laboratory';
import { getPatientTimeline } from '../../services/patients';
import { appointmentService } from '../../services/appointments';
import PatientHistoryTimeline from '../../components/patients/PatientHistoryTimeline';

export default function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'soap' | 'diagnoses' | 'prescriptions' | 'lab'>('soap');
  const [vitalsData, setVitalsData] = useState({
    temperature: '', weight: '', blood_pressure_systolic: '', blood_pressure_diastolic: ''
  });

  // Search state for ICD10
  const [icdSearch, setIcdSearch] = useState('');
  const [selectedIcd, setSelectedIcd] = useState<any>(null);
  
  // Prescription state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionItem, setPrescriptionItem] = useState({
    medication_name: '', dosage: '', frequency: '', duration: '', instructions: ''
  });
  
  // Lab Request state
  const [showLabModal, setShowLabModal] = useState(false);
  const [labRequestType, setLabRequestType] = useState('');
  const [labNotes, setLabNotes] = useState('');

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationService.getById(id!),
    enabled: !!id
  });

  const { data: icdResults } = useQuery({
    queryKey: ['icd10', icdSearch],
    queryFn: () => consultationService.searchICD10(icdSearch),
    enabled: icdSearch.length > 2
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam_types'],
    queryFn: () => laboratoryService.getExamTypes()
  });

  const { data: labRequestsData, refetch: refetchLabRequests } = useQuery({
    queryKey: ['lab_requests', id],
    queryFn: () => laboratoryService.getLabRequests({ consultation: id })
  });
  const labRequests = labRequestsData?.results || [];

  // Hospitalization recommendation states
  const [hospRequired, setHospRequired] = useState(false);
  const [hospReason, setHospReason] = useState('');

  useEffect(() => {
    if (consultation) {
      setHospRequired(consultation.hospitalization_required || false);
      setHospReason(consultation.hospitalization_reason || '');
    }
  }, [consultation]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { data: timelineEvents, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['patient-timeline', consultation?.patient],
    queryFn: () => getPatientTimeline(consultation!.patient),
    enabled: !!consultation?.patient && isDrawerOpen
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', reason: '' });

  const scheduleMutation = useMutation({
    mutationFn: (data: any) => appointmentService.create(data),
    onSuccess: () => {
      alert("Rendez-vous de suivi programmé avec succès.");
      setShowScheduleModal(false);
      setScheduleData({ date: '', time: '', reason: '' });
    }
  });

  const handleSchedule = () => {
    if (scheduleData.date && scheduleData.time && scheduleData.reason) {
      scheduleMutation.mutate({
        patient: consultation.patient,
        doctor: consultation.doctor,
        appointment_date: `${scheduleData.date}T${scheduleData.time}:00`,
        reason: scheduleData.reason,
        status: 'SCHEDULED'
      });
    }
  };

  const saveHospMutation = useMutation({
    mutationFn: (data: { hospitalization_required?: boolean; hospitalization_reason?: string }) => 
      consultationService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
    }
  });

  const addDiagnosisMutation = useMutation({
    mutationFn: (data: any) => consultationService.addDiagnosis(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      setIcdSearch('');
      setSelectedIcd(null);
    }
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: () => consultationService.createPrescription(id!, { notes: '' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      return data;
    }
  });

  const addPrescriptionItemMutation = useMutation({
    mutationFn: (data: { prescriptionId: string, itemData: any }) => 
      consultationService.addPrescriptionItem(id!, data.prescriptionId, data.itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      setPrescriptionItem({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });
      setShowPrescriptionModal(false);
    }
  });

  const createLabRequestMutation = useMutation({
    mutationFn: (data: any) => laboratoryService.createLabRequest(data),
    onSuccess: () => {
      toast.success('Demande d\'examen envoyée au laboratoire !');
      setShowLabModal(false);
      setLabRequestType('');
      setLabNotes('');
      refetchLabRequests();
    },
    onError: () => {
      toast.error('Erreur lors de la création de la demande.');
    }
  });

  const addVitalsMutation = useMutation({
    mutationFn: (data: any) => consultationService.addVitalSigns(id!, data),
    onSuccess: () => {
      // Once vitals added, move to waiting_doctor
      updateStatusMutation.mutate('waiting_doctor');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => consultationService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
    }
  });

  const completeMutation = useMutation({
    mutationFn: () => consultationService.complete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['doctor_visits_queue'] });
      alert('Consultation clôturée avec succès !');
      navigate('/consultations');
    }
  });

  const handleFinishTriage = () => {
    addVitalsMutation.mutate({
      patient: consultation.patient,
      temperature: vitalsData.temperature ? parseFloat(vitalsData.temperature) : null,
      weight: vitalsData.weight ? parseFloat(vitalsData.weight) : null,
      blood_pressure_systolic: vitalsData.blood_pressure_systolic ? parseInt(vitalsData.blood_pressure_systolic) : null,
      blood_pressure_diastolic: vitalsData.blood_pressure_diastolic ? parseInt(vitalsData.blood_pressure_diastolic) : null,
    });
  };

  const handleAddDiagnosis = () => {
    if (selectedIcd) {
      addDiagnosisMutation.mutate({
        icd10_code: selectedIcd.id,
        is_primary: consultation?.diagnoses?.length === 0,
        notes: ''
      });
    }
  };

  const handleAddPrescriptionItem = async () => {
    let currentPrescriptionId = consultation?.prescriptions?.[0]?.id;
    if (!currentPrescriptionId) {
      const newPresc = await createPrescriptionMutation.mutateAsync();
      currentPrescriptionId = newPresc.id;
    }
    
    addPrescriptionItemMutation.mutate({
      prescriptionId: currentPrescriptionId,
      itemData: prescriptionItem
    });
  };

  const handleAddLabRequest = () => {
    if (labRequestType) {
      createLabRequestMutation.mutate({
        consultation: id,
        patient: consultation.patient,
        visit: consultation.visit,
        exam_type: labRequestType,
        clinical_notes: labNotes
      });
    }
  };

  const downloadPrescription = async (prescriptionId: string) => {
    try {
      const blob = await consultationService.downloadPrescriptionPDF(id!, prescriptionId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordonnance_${prescriptionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Download failed', error);
      alert('Erreur lors du téléchargement PDF');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement de la consultation...</div>;
  if (!consultation) return <div className="p-8 text-center text-red-500">Consultation introuvable.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne de gauche: Consultation Actuelle */}
        <div className="flex-1 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/consultations')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Consultation de {consultation.patient_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {format(new Date(consultation.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })} • Dr. {consultation.doctor_name}
          </p>
          {consultation.status === 'pending_triage' && (
            <span className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              Étape : Triage
            </span>
          )}
        </div>
        {consultation.status !== 'completed' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              RDV Suivi
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Dossier
            </button>
            <button
              onClick={() => {
                if (confirm('Voulez-vous vraiment clôturer cette consultation ? Cette action est irréversible et aiguillera le patient vers la suite de son parcours.')) {
                  completeMutation.mutate();
                }
              }}
              disabled={completeMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {completeMutation.isPending ? 'Clôture...' : 'Clôturer la Consultation'}
            </button>
          </div>
        )}
      </div>

      {/* Hospitalization recommendation panel */}
      {consultation.status !== 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hosp_req"
              checked={hospRequired}
              onChange={(e) => {
                setHospRequired(e.target.checked);
                saveHospMutation.mutate({ hospitalization_required: e.target.checked });
              }}
              className="h-5 w-5 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="hosp_req" className="text-sm font-extrabold text-slate-800 cursor-pointer">
              Recommander une Hospitalisation pour ce patient
            </label>
          </div>
          
          {hospRequired && (
            <div className="space-y-2 pl-8">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Motif d'hospitalisation / Consignes initiales
              </label>
              <textarea
                value={hospReason}
                onChange={(e) => setHospReason(e.target.value)}
                onBlur={() => saveHospMutation.mutate({ hospitalization_reason: hospReason })}
                placeholder="Spécifiez la raison de l'admission et les consignes pour l'équipe infirmière..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm min-h-[80px]"
              />
              <span className="text-[10px] text-slate-400 italic">
                Les modifications sont enregistrées automatiquement lors de la perte de focus.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('soap')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'soap' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Activity className="h-4 w-4" /> Notes Cliniques (SOAP)
        </button>
        <button
          onClick={() => setActiveTab('diagnoses')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'diagnoses' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Stethoscope className="h-4 w-4" /> Diagnostics (CIM-10)
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'prescriptions' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Pill className="h-4 w-4" /> Ordonnances
        </button>
        <button
          onClick={() => setActiveTab('lab')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'lab' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <FlaskConical className="h-4 w-4" /> Demandes Labo
        </button>
      </div>

      {consultation.status === 'pending_triage' ? (
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Prise de constantes vitales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Température (°C)</label>
              <input type="number" step="0.1" value={vitalsData.temperature} onChange={e => setVitalsData({...vitalsData, temperature: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Poids (kg)</label>
              <input type="number" step="0.1" value={vitalsData.weight} onChange={e => setVitalsData({...vitalsData, weight: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TA Systolique</label>
              <input type="number" value={vitalsData.blood_pressure_systolic} onChange={e => setVitalsData({...vitalsData, blood_pressure_systolic: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TA Diastolique</label>
              <input type="number" value={vitalsData.blood_pressure_diastolic} onChange={e => setVitalsData({...vitalsData, blood_pressure_diastolic: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleFinishTriage}
              disabled={addVitalsMutation.isPending || updateStatusMutation.isPending}
              className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Terminer le triage & Envoyer au médecin
            </button>
          </div>
        </div>
      ) : (
      <>
        {/* Tab Content */}
        <div className="card p-6">
        
        {/* SOAP Tab */}
        {activeTab === 'soap' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Notes Cliniques</h2>
            
            {/* Triage Vitals inside detail view */}
            {consultation.vital_signs && consultation.vital_signs.length > 0 && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-primary" />
                  Constantes Vitales du Triage (Physiques)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs">
                  {(() => {
                    const v = consultation.vital_signs[0];
                    return (
                      <>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Température</span>
                          <strong className="text-slate-800 text-sm">{v.temperature ? `${v.temperature} °C` : '--'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Pression</span>
                          <strong className="text-slate-800 text-sm">
                            {v.blood_pressure_systolic && v.blood_pressure_diastolic
                              ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
                              : '--'}
                          </strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Pouls</span>
                          <strong className="text-slate-800 text-sm">{v.heart_rate ? `${v.heart_rate} bpm` : '--'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">SpO2</span>
                          <strong className="text-slate-800 text-sm">{v.oxygen_saturation ? `${v.oxygen_saturation} %` : '--'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Poids</span>
                          <strong className="text-slate-800 text-sm">{v.weight ? `${v.weight} kg` : '--'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Taille</span>
                          <strong className="text-slate-800 text-sm">{v.height ? `${v.height} cm` : '--'}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Respi</span>
                          <strong className="text-slate-800 text-sm">{v.respiratory_rate ? `${v.respiratory_rate} cpm` : '--'}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {consultation.vital_signs[0].notes && (
                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                    <strong className="text-slate-700">Notes de triage :</strong> {consultation.vital_signs[0].notes}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-2">S - Subjectif (Motif)</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{consultation.chief_complaint}</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Anamnèse</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{consultation.anamnesis}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-2">O - Objectif (Examen)</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{consultation.physical_examination}</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">A/P - Conclusion & Plan</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{consultation.conclusion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diagnoses Tab */}
        {activeTab === 'diagnoses' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Diagnostics</h2>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <label className="text-sm font-medium text-slate-700">Ajouter un diagnostic (CIM-10)</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Rechercher code ou description CIM-10..."
                    value={icdSearch}
                    onChange={(e) => setIcdSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  {icdResults && icdResults.length > 0 && icdSearch.length > 2 && !selectedIcd && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {icdResults.map((icd: any) => (
                        <li 
                          key={icd.id} 
                          onClick={() => { setSelectedIcd(icd); setIcdSearch(`${icd.code} - ${icd.description}`); }}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <strong>{icd.code}</strong> - {icd.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button 
                  onClick={handleAddDiagnosis}
                  disabled={!selectedIcd || addDiagnosisMutation.isPending}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {consultation.diagnoses && consultation.diagnoses.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {consultation.diagnoses.map((diag: any) => (
                    <li key={diag.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">{diag.icd10_code}</span>
                        <span className="text-slate-600 ml-2">{diag.icd10_description}</span>
                        {diag.is_primary && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Principal</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">Aucun diagnostic n'a encore été ajouté.</p>
              )}
            </div>
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Ordonnances</h2>
              <button 
                onClick={() => setShowPrescriptionModal(true)}
                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Ajouter un médicament
              </button>
            </div>

            {consultation.prescriptions && consultation.prescriptions.length > 0 ? (
              <div className="space-y-6">
                {consultation.prescriptions.map((presc: any) => (
                  <div key={presc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Ordonnance N° {presc.id}</span>
                      <button 
                        onClick={() => downloadPrescription(presc.id)}
                        className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium"
                      >
                        <Download className="h-4 w-4" /> Télécharger PDF
                      </button>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {presc.items.map((item: any) => (
                        <li key={item.id} className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="block text-xs text-slate-500">Médicament</span>
                            <strong className="text-slate-900">{item.medication_name}</strong>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-500">Posologie & Fréq.</span>
                            <span className="text-slate-700">{item.dosage}, {item.frequency}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-500">Durée</span>
                            <span className="text-slate-700">{item.duration}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-500">Instructions</span>
                            <span className="text-slate-700">{item.instructions || '-'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Aucune ordonnance rédigée.</p>
            )}

            {/* Prescription Add Modal/Form */}
            {showPrescriptionModal && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-800">Nouveau médicament</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nom du médicament" value={prescriptionItem.medication_name} onChange={e => setPrescriptionItem({...prescriptionItem, medication_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Posologie (ex: 500mg)" value={prescriptionItem.dosage} onChange={e => setPrescriptionItem({...prescriptionItem, dosage: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Fréquence (ex: 1 matin 1 soir)" value={prescriptionItem.frequency} onChange={e => setPrescriptionItem({...prescriptionItem, frequency: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Durée (ex: 5 jours)" value={prescriptionItem.duration} onChange={e => setPrescriptionItem({...prescriptionItem, duration: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Instructions spéciales" value={prescriptionItem.instructions} onChange={e => setPrescriptionItem({...prescriptionItem, instructions: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowPrescriptionModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Annuler</button>
                  <button onClick={handleAddPrescriptionItem} disabled={!prescriptionItem.medication_name} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">Ajouter</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lab Requests Tab */}
        {activeTab === 'lab' && (
           <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Demandes d'Examens</h2>
              <button 
                onClick={() => setShowLabModal(true)}
                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Nouvelle demande
              </button>
            </div>

            {showLabModal && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-800">Prescrire un examen</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Type d'examen</label>
                    <select 
                      value={labRequestType} 
                      onChange={e => setLabRequestType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">Sélectionner...</option>
                      {examTypes?.results?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Notes cliniques pour le labo</label>
                    <input 
                      type="text" 
                      value={labNotes} 
                      onChange={e => setLabNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowLabModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Annuler</button>
                  <button onClick={handleAddLabRequest} disabled={!labRequestType || createLabRequestMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {createLabRequestMutation.isPending ? 'Envoi...' : 'Prescrire'}
                  </button>
                </div>
              </div>
            )}

            {labRequests.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700">Examens prescrits</h3>
                <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-slate-600">Examen</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Catégorie</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Statut</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Résultat</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Notes (Labo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labRequests.map((req: any) => (
                        <tr key={req.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {req.exam_type_name || examTypes?.results?.find((e:any) => e.id === req.exam_type)?.name || 'Inconnu'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {examTypes?.results?.find((e:any) => e.id === req.exam_type)?.category || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {req.status === 'completed' ? 'Terminé' :
                               req.status === 'in_progress' ? 'En cours' : 'En attente'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'completed' && req.result ? (
                              <div className="flex flex-col gap-1">
                                <span className={`font-medium ${req.result.flag === 'critical' ? 'text-red-600' : req.result.flag === 'high' ? 'text-orange-500' : req.result.flag === 'low' ? 'text-blue-500' : 'text-slate-700'}`}>
                                  {req.result.value}
                                </span>
                                {req.result.attachment && (
                                  <a href={req.result.attachment} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                    Voir la pièce jointe
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {req.result?.notes ? (
                              <span className="italic">{req.result.notes}</span>
                            ) : (
                              <span>{req.clinical_notes || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">Aucune demande de laboratoire pour cette consultation.</p>
              </div>
            )}
           </div>
        )}

      </div>
      </>
      )}

      {/* Drawer (Mobile Only) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col transform transition-transform">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Dossier Médical
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-white rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingTimeline ? (
                <div className="text-center p-8 text-sm text-slate-500">Chargement...</div>
              ) : (
                <PatientHistoryTimeline events={timelineEvents || []} />
              )}
            </div>
          </div>
        </div>
      )}

        </div> {/* End of Left Column */}

        {/* Colonne de droite: Historique Permanent (Desktop Only) */}
        <div className="hidden lg:flex w-96 shrink-0 flex-col border-l border-slate-200 pl-6 sticky top-6 h-[calc(100vh-48px)]">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-800">Dossier Médical</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoadingTimeline ? (
              <div className="text-center p-8 text-sm text-slate-500">Chargement de l'historique...</div>
            ) : (
              <PatientHistoryTimeline events={timelineEvents || []} />
            )}
          </div>
        </div>

      </div> {/* End of Flex Layout */}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Programmer un suivi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={scheduleData.date} onChange={e => setScheduleData({...scheduleData, date: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Heure</label>
                <input type="time" value={scheduleData.time} onChange={e => setScheduleData({...scheduleData, time: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                <input type="text" value={scheduleData.reason} onChange={e => setScheduleData({...scheduleData, reason: e.target.value})} placeholder="Ex: Contrôle post-traitement" className="w-full px-4 py-2 border rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Annuler</button>
              <button onClick={handleSchedule} disabled={!scheduleData.date || !scheduleData.time || !scheduleData.reason || scheduleMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-xl font-medium disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
