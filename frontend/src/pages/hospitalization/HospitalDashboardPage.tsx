import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bed as BedIcon, Activity, Check, Clock, FileText, Plus, LogOut, 
  HeartPulse, History, Thermometer, UserPlus, Eye, ShieldAlert, X, Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  getWards, getBeds, createHospitalization, dischargeHospitalization, addInpatientLog
} from '../../services/hospitalization';
import type { HospitalizationType, BedType } from '../../services/hospitalization';
import { getVisits } from '../../services/visits';

export default function HospitalDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);
  
  // Modals state
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [selectedVisitForAdmission, setSelectedVisitForAdmission] = useState<any>(null);
  const [admissionReason, setAdmissionReason] = useState('');
  
  const [logNotes, setLogNotes] = useState('');
  const [logTemp, setLogTemp] = useState('');
  const [logBp, setLogBp] = useState('');
  const [logPulse, setLogPulse] = useState('');
  const [logMedication, setLogMedication] = useState('');
  
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [activeHospitalization, setActiveHospitalization] = useState<any>(null);

  // Fetch Wards
  const { data: wards, isLoading: WardsLoading } = useQuery({
    queryKey: ['hospital_wards'],
    queryFn: getWards
  });

  // Fetch Beds
  const { data: beds, isLoading: BedsLoading } = useQuery({
    queryKey: ['hospital_beds'],
    queryFn: getBeds,
    refetchInterval: 5000 // Poll every 5s
  });

  // Fetch queue of patients waiting for hospitalization
  const { data: queueData, isLoading: QueueLoading } = useQuery({
    queryKey: ['waiting_hospitalization_visits'],
    queryFn: () => getVisits({ status: 'waiting_hospitalization' }),
    refetchInterval: 5000 // Poll every 5s
  });

  const waitingQueue = queueData?.results || [];

  // Mutate: Admit Inpatient
  const admitMutation = useMutation({
    mutationFn: (data: { visit: string; patient: string; bed: string; reason?: string }) => 
      createHospitalization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital_beds'] });
      queryClient.invalidateQueries({ queryKey: ['hospital_wards'] });
      queryClient.invalidateQueries({ queryKey: ['waiting_hospitalization_visits'] });
      setShowAdmissionModal(false);
      setSelectedBed(null);
      setSelectedVisitForAdmission(null);
      setAdmissionReason('');
      alert('Patient admis et lit réservé avec succès !');
    },
    onError: (err: any) => {
      alert(err.response?.data?.bed || "Erreur lors de l'admission.");
    }
  });

  // Mutate: Add care log
  const logMutation = useMutation({
    mutationFn: (data: {
      id: string;
      temperature?: number;
      blood_pressure?: string;
      pulse_rate?: number;
      notes: string;
      medication_administered?: string;
    }) => addInpatientLog(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital_beds'] });
      setShowLogModal(false);
      setLogNotes('');
      setLogTemp('');
      setLogBp('');
      setLogPulse('');
      setLogMedication('');
      alert('Soin infirmier consigné !');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de l'enregistrement du soin.");
    }
  });

  // Mutate: Discharge Patient
  const dischargeMutation = useMutation({
    mutationFn: (data: { id: string; discharge_summary: string }) => 
      dischargeHospitalization(data.id, { discharge_summary: data.discharge_summary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital_beds'] });
      queryClient.invalidateQueries({ queryKey: ['hospital_wards'] });
      queryClient.invalidateQueries({ queryKey: ['waiting_hospitalization_visits'] });
      setShowDischargeModal(false);
      setSelectedBed(null);
      setDischargeSummary('');
      alert('Sortie validée ! Le patient est maintenant attendu à la caisse pour facturation.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de la sortie.");
    }
  });

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitForAdmission || !selectedBed) return;
    admitMutation.mutate({
      visit: selectedVisitForAdmission.id,
      patient: selectedVisitForAdmission.patient,
      bed: selectedBed.id,
      reason: admissionReason
    });
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalization) return;
    logMutation.mutate({
      id: activeHospitalization.id,
      temperature: logTemp ? parseFloat(logTemp) : undefined,
      blood_pressure: logBp || undefined,
      pulse_rate: logPulse ? parseInt(logPulse) : undefined,
      notes: logNotes,
      medication_administered: logMedication || undefined
    });
  };

  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalization) return;
    dischargeMutation.mutate({
      id: activeHospitalization.id,
      discharge_summary: dischargeSummary
    });
  };

  // Filter beds based on selected ward
  const filteredBeds = beds?.filter(bed => {
    if (selectedWard === 'all') return true;
    return bed.ward === selectedWard;
  }) || [];

  const occupiedBedsCount = beds?.filter(b => b.status === 'occupied').length || 0;
  const availableBedsCount = beds?.filter(b => b.status === 'available').length || 0;

  // Fetch full details of an active hospitalization
  const openHistory = async (hospId: string) => {
    try {
      const response = await queryClient.fetchQuery({
        queryKey: ['hospitalization_detail', hospId],
        queryFn: async () => {
          const res = await fetch(`/api/hospitalizations/${hospId}/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure we use auth if needed (api client wraps it)
            }
          });
          // To be aligned with standard client, let's import the api call if we had it, but actually the serializer embeds logs already!
          // Since the Bed object has current_occupant.hospitalization_id, we can fetch all hospitalizations and filter or query directly.
          // Wait, the serializer for Bed contains current_occupant, but wait, the BedSerializer doesn't include the logs timeline.
          // Let's just fetch all hospitalizations or get by id from the api client! Yes, we have getHospitalizations.
          const list = await getHospitalizations({ id: hospId });
          return list.find(h => h.id === hospId) || null;
        }
      });
      setActiveHospitalization(response);
      setShowHistoryModal(true);
    } catch (e) {
      console.error(e);
      alert('Impossible de charger l\'historique.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BedIcon className="h-7 w-7 text-primary" />
            Hospitalisations & Lits
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les lits disponibles, les admissions et consignez les fiches de soins des patients.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <BedIcon className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lits Disponibles</span>
            <strong className="text-xl font-extrabold text-slate-800">{availableBedsCount}</strong>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lits Occupés</span>
            <strong className="text-xl font-extrabold text-slate-800">{occupiedBedsCount}</strong>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Taux d'Occupation</span>
            <strong className="text-xl font-extrabold text-slate-800">
              {beds && beds.length > 0 ? Math.round((occupiedBedsCount / beds.length) * 100) : 0} %
            </strong>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">En attente d'attribution</span>
            <strong className="text-xl font-extrabold text-slate-800">{waitingQueue.length} patient(s)</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* main Wards and Beds List (Left) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-2 flex-wrap items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filtrer par Pavillon :</span>
            <button
              onClick={() => setSelectedWard('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedWard === 'all' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tous
            </button>
            {wards?.map((ward) => (
              <button
                key={ward.id}
                onClick={() => setSelectedWard(ward.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedWard === ward.id 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ward.name}
              </button>
            ))}
          </div>

          {/* Beds Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {BedsLoading ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">Chargement des lits...</div>
            ) : filteredBeds.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">Aucun lit défini pour cette sélection.</div>
            ) : (
              filteredBeds.map((bed) => {
                const occ = bed.current_occupant;
                return (
                  <div 
                    key={bed.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between hover:shadow-md ${
                      bed.status === 'occupied' 
                        ? 'border-red-200 ring-2 ring-red-500/5' 
                        : bed.status === 'maintenance'
                        ? 'border-amber-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Bed header */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{bed.name}</h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{bed.ward_name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                          bed.status === 'occupied'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : bed.status === 'maintenance'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {bed.status === 'occupied' ? 'Occupé' : bed.status === 'maintenance' ? 'Maintenance' : 'Libre'}
                        </span>
                      </div>

                      {/* Bed main info */}
                      {bed.status === 'occupied' && occ ? (
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-xs mb-4">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800 font-bold truncate max-w-[130px]">{occ.patient_name}</strong>
                            <span className="font-mono text-[9px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{occ.patient_mrn}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Admis le : {format(new Date(occ.admitted_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Docteur : {occ.doctor_name}
                          </div>
                          {occ.reason && (
                            <p className="text-[10px] text-slate-600 bg-white p-1.5 rounded border border-slate-200/50 mt-1 truncate">
                              Motif : {occ.reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 space-y-1 py-4">
                          <p>Tarif journalier : <strong className="text-slate-700">{bed.price_per_day.toLocaleString()} XAF</strong></p>
                          <p>Aucun patient assigné actuellement.</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {bed.status === 'occupied' && occ ? (
                        <>
                          <button
                            onClick={async () => {
                              // Retrieve hospitalization detailed object for logs
                              const list = await getHospitalizations({ id: occ.hospitalization_id });
                              const h = list.find((x: any) => x.id === occ.hospitalization_id);
                              setActiveHospitalization(h);
                              setShowLogModal(true);
                            }}
                            className="flex-1 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
                          >
                            <Heart className="w-3.5 h-3.5" /> Soins
                          </button>
                          <button
                            onClick={() => openHistory(occ.hospitalization_id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                            title="Historique des soins"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const list = await getHospitalizations({ id: occ.hospitalization_id });
                              const h = list.find((x: any) => x.id === occ.hospitalization_id);
                              setActiveHospitalization(h);
                              setSelectedBed(bed);
                              setShowDischargeModal(true);
                            }}
                            className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Sortie
                          </button>
                        </>
                      ) : bed.status === 'available' ? (
                        <button
                          disabled={waitingQueue.length === 0}
                          onClick={() => {
                            setSelectedBed(bed);
                            setSelectedVisitForAdmission(null);
                            setShowAdmissionModal(true);
                          }}
                          className="w-full py-1.5 bg-slate-100 hover:bg-primary hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Hospitaliser Patient
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 py-1 text-center w-full">Indisponible</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Admission Queue (Right Sidebar) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600 animate-pulse" />
              File d'Admission (Aujourd'hui)
            </h2>

            {QueueLoading ? (
              <div className="text-center py-6 text-slate-400 text-xs">Chargement de la file...</div>
            ) : waitingQueue.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <Check className="h-7 w-7 text-primary/50" />
                Aucun patient recommandé pour hospitalisation aujourd'hui.
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {waitingQueue.map((visit: any) => (
                  <div 
                    key={visit.id} 
                    className="p-4 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-slate-950 font-extrabold">{visit.patient_name}</strong>
                      <span className="font-mono text-[9px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded font-black">{visit.patient_mrn}</span>
                    </div>
                    {visit.reason_for_visit && (
                      <p className="text-[10px] text-slate-500 italic truncate">
                        Symptômes : {visit.reason_for_visit}
                      </p>
                    )}
                    <div className="bg-white p-2 rounded border border-indigo-100/40 text-[10px] text-slate-600">
                      <strong>Recommandation clinique :</strong>
                      <p className="mt-0.5 leading-relaxed">{visit.active_consultation_id ? "Dossier consultation actif" : "Aucun motif consigné"}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-indigo-100/50">
                      <span className="text-[10px] font-bold text-slate-400">Passage: {visit.passage_number.split('-').pop()}</span>
                      <button 
                        onClick={() => {
                          setSelectedVisitForAdmission(visit);
                          setSelectedBed(null);
                          setShowAdmissionModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                      >
                        <BedIcon className="w-3.5 h-3.5" />
                        Attribuer un lit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADMISSION */}
      {showAdmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="h-14 bg-primary/10 border-b border-primary/20 flex items-center justify-between px-6">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-primary" /> Admission en Hospitalisation
              </h3>
              <button onClick={() => setShowAdmissionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdmitSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Sélectionner le patient</label>
                <select
                  required
                  value={selectedVisitForAdmission ? selectedVisitForAdmission.id : ''}
                  onChange={(e) => {
                    const vis = waitingQueue.find((q: any) => q.id === e.target.value);
                    setSelectedVisitForAdmission(vis || null);
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Choisir un patient en attente --</option>
                  {waitingQueue.map((q: any) => (
                    <option key={q.id} value={q.id}>{q.patient_name} ({q.patient_mrn})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Attribuer un lit</label>
                <select
                  required
                  value={selectedBed ? selectedBed.id : ''}
                  onChange={(e) => {
                    const b = beds?.find(x => x.id === e.target.value);
                    setSelectedBed(b || null);
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Choisir un lit disponible --</option>
                  {beds?.filter(b => b.status === 'available').map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.ward_name} - {b.price_per_day.toLocaleString()} XAF)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Motif de l'admission & Instructions infirmières</label>
                <textarea
                  placeholder="Consignes physiologiques, médicaments à surveiller, soins particuliers..."
                  value={admissionReason}
                  onChange={e => setAdmissionReason(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[100px]"
                />
              </div>

              {selectedBed && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs text-slate-600 space-y-1">
                  <p>Pavillon : <strong className="text-slate-800">{selectedBed.ward_name}</strong></p>
                  <p>Coût journalier du lit : <strong className="text-slate-800">{selectedBed.price_per_day.toLocaleString()} XAF / jour</strong></p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={admitMutation.isPending || !selectedVisitForAdmission}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary/95 disabled:opacity-50"
                >
                  Admettre le Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONSIGNER UN SOIN (NURSING LOG) */}
      {showLogModal && activeHospitalization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="h-14 bg-primary/10 border-b border-primary/20 flex items-center justify-between px-6">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <Heart className="w-5 h-5 text-primary" /> Fiche de Soins : {activeHospitalization.patient_name}
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Température (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.2"
                    value={logTemp}
                    onChange={e => setLogTemp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tension Art. (ex: 12/8)</label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={logBp}
                    onChange={e => setLogBp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pouls (bpm)</label>
                  <input
                    type="number"
                    placeholder="75"
                    value={logPulse}
                    onChange={e => setLogPulse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Médicaments administrés (Posologie & heure)</label>
                <input
                  type="text"
                  placeholder="Ex: Paracétamol 1g à 14h, perf. NaCl 0.9%"
                  value={logMedication}
                  onChange={e => setLogMedication(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Notes d'observation clinique & Évolution</label>
                <textarea
                  required
                  placeholder="Décrivez l'état du patient, ses plaintes, observations cliniques infirmières..."
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={logMutation.isPending || !logNotes}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary/95 disabled:opacity-50"
                >
                  Consigner le soin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISCHARGE (SORTIE) */}
      {showDischargeModal && selectedBed && activeHospitalization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="h-14 bg-red-100 border-b border-red-200 flex items-center justify-between px-6">
              <h3 className="font-extrabold text-red-950 text-sm sm:text-base flex items-center gap-1.5">
                <LogOut className="w-5 h-5 text-red-700" /> Clôturer et Libérer Lit : {selectedBed.name}
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDischargeSubmit} className="p-6 space-y-4">
              <div className="bg-red-50 text-red-900 p-4 rounded-2xl border border-red-100 text-xs flex gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
                <div>
                  <strong className="block mb-0.5">Fin de l'Hospitalisation</strong>
                  Cette action libérera le lit immédiatement. Le statut du patient repassera à <span className="font-bold">"En attente caisse finale"</span> pour le règlement global de son passage (y compris les jours d'hospitalisation accumulés).
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Résumé de sortie & Consignes post-hospitalisation</label>
                <textarea
                  required
                  placeholder="Ordonnance de sortie, repos médical préconisé, prochain rendez-vous..."
                  value={dischargeSummary}
                  onChange={e => setDischargeSummary(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[120px]"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p>Patient : <strong className="text-slate-900">{activeHospitalization.patient_name}</strong></p>
                <p>Durée cumulée du séjour : <strong className="text-slate-900">{activeHospitalization.days_count} jour(s)</strong></p>
                <p>Total estimé du lit : <strong className="text-slate-900">{activeHospitalization.total_cost.toLocaleString()} XAF</strong></p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={dischargeMutation.isPending || !dischargeSummary}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-700 disabled:opacity-50"
                >
                  Valider la Sortie Clinique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIQUE DES SOINS (NURSING HISTORY) */}
      {showHistoryModal && activeHospitalization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="h-14 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-6">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <History className="w-5 h-5 text-slate-600" /> Dossier de Suivi : {activeHospitalization.patient_name}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Patient info details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">NIP (MRN) :</p>
                  <strong className="text-slate-800 text-sm">{activeHospitalization.patient_mrn}</strong>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Lit occupé :</p>
                  <strong className="text-slate-800 text-sm">{activeHospitalization.bed_name} ({activeHospitalization.ward_name})</strong>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Date d'admission :</p>
                  <strong className="text-slate-800">{format(new Date(activeHospitalization.admitted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</strong>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Médecin référant :</p>
                  <strong className="text-slate-800">{activeHospitalization.admitted_by_name}</strong>
                </div>
                {activeHospitalization.reason && (
                  <div className="col-span-2 border-t border-slate-200 pt-3">
                    <p className="text-slate-500 font-medium">Raison clinique d'hospitalisation :</p>
                    <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">{activeHospitalization.reason}</p>
                  </div>
                )}
              </div>

              {/* Logs Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chronologie des Soins Consignés</h4>
                
                {(!activeHospitalization.logs || activeHospitalization.logs.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    Aucun soin ou constante n'a été consigné pour cette hospitalisation.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
                    {activeHospitalization.logs.map((log: any, idx: number) => (
                      <div key={log.id} className="relative">
                        {/* Timeline node icon */}
                        <div className="absolute -left-[35px] top-1 h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center ring-4 ring-white shadow-sm">
                          <Heart className="h-3 w-3" />
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Consigné par : <strong>{log.recorded_by_name}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(log.recorded_at), 'dd/MM/yyyy à HH:mm')}
                            </span>
                          </div>

                          {/* Vitals in chips */}
                          {(log.temperature || log.blood_pressure || log.pulse_rate) && (
                            <div className="flex gap-2 flex-wrap">
                              {log.temperature && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-md text-[10px] font-extrabold">
                                  <Thermometer className="w-3 h-3 text-red-500" /> {log.temperature} °C
                                </span>
                              )}
                              {log.blood_pressure && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-extrabold">
                                  TA: {log.blood_pressure}
                                </span>
                              )}
                              {log.pulse_rate && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-extrabold">
                                  Pouls: {log.pulse_rate} bpm
                                </span>
                              )}
                            </div>
                          )}

                          {log.medication_administered && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                              <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Traitement Administré</span>
                              <p className="text-slate-700 font-medium">{log.medication_administered}</p>
                            </div>
                          )}

                          <div className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap">
                            <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Observations</span>
                            {log.notes}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-14 border-t border-slate-100 flex items-center justify-end px-6 bg-slate-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-350 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
