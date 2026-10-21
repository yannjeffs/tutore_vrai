import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Activity, Clock, Stethoscope, UserCircle, 
  ChevronRight, Thermometer, ShieldAlert, Heart, FileSpreadsheet,
  AlertTriangle, Check, X, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getVisits, recordVitals } from '../../services/visits';
import { getStaffList } from '../../services/staff';

export default function TriageQueuePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  // Vitals form state
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respRate, setRespRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [notes, setNotes] = useState('');
  const [priorityLevel, setPriorityLevel] = useState(4);
  const [assignedDoctor, setAssignedDoctor] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Queries
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['triage_queue', searchTerm],
    queryFn: () => getVisits({
      created_date: todayStr,
      status: 'waiting_nurse',
      search: searchTerm || undefined
    })
  });

  const { data: doctors } = useQuery({
    queryKey: ['staff', 'doctors'],
    queryFn: () => getStaffList({ role: 'doctor' })
  });

  // Mutation
  const saveVitalsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => recordVitals(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage_queue'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      closeVitalsModal();
    }
  });

  const openVitalsModal = (visit: any) => {
    setSelectedVisit(visit);
    setPriorityLevel(visit.priority_level);
    setAssignedDoctor(visit.assigned_doctor || '');
    
    // Clear form fields
    setTemperature('');
    setWeight('');
    setHeight('');
    setBpSystolic('');
    setBpDiastolic('');
    setHeartRate('');
    setRespRate('');
    setSpo2('');
    setNotes('');
    
    setShowVitalsModal(true);
  };

  const closeVitalsModal = () => {
    setSelectedVisit(null);
    setShowVitalsModal(false);
  };

  const handleSubmitVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    saveVitalsMutation.mutate({
      id: selectedVisit.id,
      data: {
        temperature: temperature ? parseFloat(temperature) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        blood_pressure_systolic: bpSystolic ? parseInt(bpSystolic) : null,
        blood_pressure_diastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
        heart_rate: heartRate ? parseInt(heartRate) : null,
        respiratory_rate: respRate ? parseInt(respRate) : null,
        oxygen_saturation: spo2 ? parseInt(spo2) : null,
        notes: notes,
        priority_level: Number(priorityLevel),
        assigned_doctor: assignedDoctor || null
      }
    });
  };

  const getPriorityColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-500 text-white animate-pulse font-bold ring-2 ring-red-400';
      case 2: return 'bg-orange-500 text-white font-semibold';
      case 3: return 'bg-amber-500 text-white';
      case 4: return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 1: return 'P1 - Urgence Vitale';
      case 2: return 'P2 - Urgence Majeure';
      case 3: return 'P3 - Urgence Modérée';
      case 4: return 'P4 - Standard';
      default: return 'P5 - Faible';
    }
  };

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'nursing_only': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Soin Infirmier Uniquement</span>;
      case 'follow_up_results': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Retour Examens</span>;
      case 'emergency': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">Urgence</span>;
      default: 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Consultation</span>;
    }
  };

  const visits = visitsData?.results || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            File d'Attente (Triage & Constantes)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Patients en attente de prise de constantes physiques ou de soins infirmiers</p>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par patient ou ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          {visits.length} patient(s) en attente
        </div>
      </div>

      {/* Main Queue List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-primary text-white text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold first:rounded-tl-2xl">Heure d'arrivée</th>
                <th className="px-6 py-4 font-bold">Ticket</th>
                <th className="px-6 py-4 font-bold">Patient</th>
                <th className="px-6 py-4 font-bold">Type de visite</th>
                <th className="px-6 py-4 font-bold">Priorité triage</th>
                <th className="px-6 py-4 font-bold">Motif / Plaintes</th>
                <th className="px-6 py-4 font-bold text-right last:rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Chargement de la file d'attente...
                  </td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <ShieldCheck className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                    Aucun patient en attente dans la file triage actuellement.
                  </td>
                </tr>
              ) : (
                visits.map((visit: any, index: number) => (
                  <tr 
                    key={visit.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      visit.priority_level === 1 
                        ? 'bg-red-50/50 hover:bg-red-50' 
                        : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {format(new Date(visit.created_at), 'HH:mm', { locale: fr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {visit.passage_number.split('-').pop()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{visit.patient_name}</div>
                      <div className="text-[10px] text-slate-500">{visit.patient_mrn}</div>
                      {Number(visit.patient_outstanding_balance) > 0 && (
                        <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-extrabold border border-red-200">
                          ⚠️ IMPAYÉ : {visit.patient_outstanding_balance} XAF
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getVisitTypeBadge(visit.visit_type)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider ${getPriorityColor(visit.priority_level)}`}>
                        P{visit.priority_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate font-medium">
                      {visit.reason_for_visit || 'Non spécifié'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openVitalsModal(visit)}
                        className="bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Prendre Constantes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vitals Recording Modal */}
      {showVitalsModal && selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Thermometer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Saisie des Constantes Vitales
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <strong className="text-slate-700">{selectedVisit.patient_name}</strong> • MRN: {selectedVisit.patient_mrn}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeVitalsModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Impayé Alert in Modal */}
            {Number(selectedVisit.patient_outstanding_balance) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-red-700">Rappel Impayé Caisse</p>
                  <p>Ce patient a un reliquat de <strong className="font-black text-red-950">{selectedVisit.patient_outstanding_balance} XAF</strong> en caisse.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitVitals} className="space-y-6">
              
              {/* Form Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Température (°C)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="ex: 37.2" 
                    value={temperature} 
                    onChange={e => setTemperature(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Poids (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="ex: 72" 
                    value={weight} 
                    onChange={e => setWeight(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Taille (cm)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 175" 
                    value={height} 
                    onChange={e => setHeight(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Systolique (mmHg)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 120" 
                    value={bpSystolic} 
                    onChange={e => setBpSystolic(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Diastolique (mmHg)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 80" 
                    value={bpDiastolic} 
                    onChange={e => setBpDiastolic(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Pouls (bpm)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 75" 
                    value={heartRate} 
                    onChange={e => setHeartRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Freq. Respi (cpm)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 16" 
                    value={respRate} 
                    onChange={e => setRespRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SpO2 (%)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 98" 
                    value={spo2} 
                    onChange={e => setSpo2(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  />
                </div>

              </div>

              {/* Triage adjustments */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Réévaluer l'Urgence (Triage)
                  </label>
                  <select 
                    value={priorityLevel} 
                    onChange={(e) => setPriorityLevel(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="5">P5 - Très Faible</option>
                    <option value="4">P4 - Standard / Normal</option>
                    <option value="3">P3 - Urgence Modérée</option>
                    <option value="2">P2 - Urgence Majeure</option>
                    <option value="1">P1 - Urgence Vitale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Réaiguiller le Médecin
                  </label>
                  <select 
                    value={assignedDoctor} 
                    onChange={(e) => setAssignedDoctor(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Premier médecin disponible --</option>
                    {doctors?.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title || 'Dr.'} {doc.user.first_name} {doc.user.last_name} ({doc.specialization || 'Généraliste'})
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notes Cliniques & Observations</label>
                <textarea 
                  rows={2}
                  placeholder="ex: Signes de déshydratation, patient agité..."
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 bg-white">
                <button 
                  type="button" 
                  onClick={closeVitalsModal} 
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={saveVitalsMutation.isPending}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/95 shadow-md flex items-center gap-2 transition-all"
                >
                  <Check className="h-4 w-4" />
                  {saveVitalsMutation.isPending ? 'Enregistrement...' : 'Valider & Aiguiller'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
