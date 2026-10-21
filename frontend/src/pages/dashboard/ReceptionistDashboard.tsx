import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, UserPlus, AlertCircle, Clock, Stethoscope, UserCircle, 
  ChevronRight, Calendar, AlertTriangle, ShieldAlert, Sparkles, Filter, CreditCard
} from 'lucide-react';
import { getPatients } from '../../services/patients';
import { getStaffList } from '../../services/staff';
import { getVisits, registerArrival, updateVisit } from '../../services/visits';

export default function ReceptionistDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showArrivalForm, setShowArrivalForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [unpaidError, setUnpaidError] = useState<any>(null);

  // Form states for visit registration
  const [visitType, setVisitType] = useState('normal');
  const [priorityLevel, setPriorityLevel] = useState(4);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [department, setDepartment] = useState('Générale');

  const todayStr = new Date().toISOString().split('T')[0];

  // Queries
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['patients', 'search', searchTerm],
    queryFn: () => getPatients({ search: searchTerm }),
    enabled: searchTerm.length > 1
  });

  const { data: doctors } = useQuery({
    queryKey: ['staff', 'doctors'],
    queryFn: () => getStaffList({ role: 'doctor' })
  });

  const { data: visitsData, isLoading: loadingVisits } = useQuery({
    queryKey: ['visits', 'today', filterStatus],
    queryFn: () => getVisits({ created_date: todayStr, status: filterStatus || undefined })
  });

  // Mutation
  const registerMutation = useMutation({
    mutationFn: registerArrival,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      // Reset form
      setSelectedPatient(null);
      setReasonForVisit('');
      setAssignedDoctor('');
      setVisitType('normal');
      setPriorityLevel(4);
      setShowArrivalForm(false);
      setUnpaidError(null);
    },
    onError: (err: any) => {
      if (err.response?.status === 402 && err.response?.data?.error === "UNPAID_BALANCE") {
        setUnpaidError(err.response.data);
      } else {
        alert("Erreur lors de l'enregistrement de l'admission.");
      }
    }
  });

  const updateVisitStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateVisit(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    }
  });

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setShowArrivalForm(true);
    setSearchTerm('');
  };

  const handleRegisterArrivalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    registerMutation.mutate({
      patient: selectedPatient.id,
      visit_type: visitType,
      priority_level: Number(priorityLevel),
      reason_for_visit: reasonForVisit,
      assigned_doctor: assignedDoctor || null,
      department: department
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_nurse': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Constantes</span>;
      case 'in_nurse_care': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">Infirmerie</span>;
      case 'waiting_doctor': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Attente Docteur</span>;
      case 'in_doctor_care': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Consultation</span>;
      case 'waiting_lab': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">Labo / Caisse</span>;
      case 'lab_results_ready': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">Résultats Prêts</span>;
      case 'hospitalized': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Hospitalisé</span>;
      case 'waiting_cashier': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Caisse Finale</span>;
      case 'closed': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">Clôturé</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'nursing_only': return 'Soins Infirmiers';
      case 'follow_up_results': return 'Retour Examens';
      case 'emergency': return 'Urgence';
      default: return 'Consultation';
    }
  };

  const patientsList = searchResults?.results || [];
  const visits = visitsData?.results || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Unpaid Debt Blocker Modal */}
      {unpaidError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-red-900 mb-2">Admission Bloquée : Impayé</h2>
              <p className="text-sm text-red-700/80">
                Ce patient a une dette impayée de <strong className="font-black text-red-900">{unpaidError.outstanding_balance} XAF</strong>.<br/>
                Vous ne pouvez pas l'enregistrer pour une consultation standard.
              </p>
            </div>
            <div className="p-6 space-y-3 bg-white">
              <button
                onClick={() => {
                  registerMutation.mutate({
                    patient: selectedPatient.id,
                    visit_type: visitType,
                    priority_level: Number(priorityLevel),
                    reason_for_visit: reasonForVisit,
                    assigned_doctor: assignedDoctor || null,
                    department: department,
                    force_cashier: true
                  });
                }}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Créer ticket Recouvrement (Envoi à la caisse)
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr qu'il s'agit d'une urgence absolue ? L'administrateur sera notifié.")) {
                    registerMutation.mutate({
                      patient: selectedPatient.id,
                      visit_type: 'emergency',
                      priority_level: 1,
                      reason_for_visit: reasonForVisit,
                      assigned_doctor: assignedDoctor || null,
                      department: 'Urgences',
                      force_emergency: true
                    });
                  }
                }}
                className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                Forcer (Urgence Vitale Uniquement)
              </button>
              <button
                onClick={() => setUnpaidError(null)}
                className="w-full py-3 px-4 bg-transparent hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-center transition-colors mt-2"
              >
                Annuler l'admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-emerald-800 to-primary p-6 sm:p-8 rounded-3xl shadow-xl text-white">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-300 animate-spin" />
            Module Réception / Accueil
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base">Gérez les admissions physiques et le parcours patient du jour</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigate('/patients/new')}
            className="px-4 py-2.5 bg-white text-primary font-bold rounded-xl hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-md text-sm"
          >
            <UserPlus className="h-4 w-4" />
            Nouveau Patient
          </button>
          <button 
            onClick={() => navigate('/patients/new-provisional')}
            className="px-4 py-2.5 bg-destructive text-destructive-foreground font-bold rounded-xl hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-md text-sm"
          >
            <AlertTriangle className="h-4 w-4" />
            Admission Urgence (Inconnu)
          </button>
        </div>
      </div>

      {/* Grid search patient & register arrival */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Search and Admission */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Rechercher un Patient
            </h2>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="Nom, prénom, N° Dossier (MRN), Téléphone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            </div>

            {/* Live Search Results */}
            {searchTerm.length > 1 && (
              <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-[300px] overflow-y-auto bg-slate-50">
                {searching ? (
                  <div className="p-4 text-center text-xs text-slate-400">Recherche...</div>
                ) : patientsList.length > 0 ? (
                  patientsList.map((patient: any) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full p-3 text-left hover:bg-primary/5 flex items-center justify-between transition-colors text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {patient.first_name} {patient.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {patient.mrn} • Tel: {patient.phone || 'Non renseigné'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {patient.outstanding_balance > 0 && (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-extrabold border border-red-200">
                            Impayé
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">Aucun patient trouvé</div>
                )}
              </div>
            )}
          </div>

          {/* Admission Form */}
          {showArrivalForm && selectedPatient && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-1 rounded-md">
                    Enregistrer Venue (Admission)
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-800 mt-2">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedPatient.mrn}</p>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  Annuler
                </button>
              </div>

              {/* Outstanding Balance Banner */}
              {Number(selectedPatient.outstanding_balance) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-red-700">Alerte Impayé Clinique</p>
                    <p>Le patient a un solde débiteur de <strong className="font-black text-red-950">{selectedPatient.outstanding_balance} XAF</strong>.</p>
                    <p className="text-red-700/85">Veuillez l'orienter vers la caisse pour règlement avant d'engager d'autres soins non urgents.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegisterArrivalSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Type d'Admission</label>
                  <select 
                    value={visitType} 
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="normal">Consultation Standard</option>
                    <option value="nursing_only">Soins Infirmiers Autonomes (Injection, Pansement...)</option>
                    <option value="follow_up_results">Retour Examens (Interpretation gratuite/reduite)</option>
                    <option value="emergency">Urgence Médicale</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Niveau d'Urgence</label>
                    <select 
                      value={priorityLevel} 
                      onChange={(e) => setPriorityLevel(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="5">P5 - Très Faible</option>
                      <option value="4">P4 - Standard / Normal</option>
                      <option value="3">P3 - Urgence Modérée</option>
                      <option value="2">P2 - Urgence Majeure</option>
                      <option value="1">P1 - Urgence Vitale</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Département</label>
                    <select 
                      value={department} 
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Générale">Médecine Générale</option>
                      <option value="Pédiatrie">Pédiatrie</option>
                      <option value="Cardiologie">Cardiologie</option>
                      <option value="Gynécologie">Gynécologie</option>
                      <option value="Urgences">Urgences</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Médecin Préféré / Consulté</label>
                  <select 
                    value={assignedDoctor} 
                    onChange={(e) => setAssignedDoctor(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Premier médecin disponible --</option>
                    {doctors?.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title || 'Dr.'} {doc.user.first_name} {doc.user.last_name} ({doc.specialization || 'Généraliste'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Motif de Consultation / Plaintes</label>
                  <textarea 
                    rows={3}
                    placeholder="Symptômes décrits par le patient, motif de venue..."
                    value={reasonForVisit} 
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Clock className="h-4 w-4" />
                  {registerMutation.isPending ? 'Enregistrement...' : 'Enregistrer et Envoyer en Triage'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right column: Queue table */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  File d'Attente Active (Aujourd'hui)
                </h2>
                <p className="text-xs text-slate-500">Parcours physiques enregistrés ce jour</p>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-600 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Tous les statuts</option>
                  <option value="waiting_nurse">En attente Constantes</option>
                  <option value="in_nurse_care">Chez l'infirmier</option>
                  <option value="waiting_doctor">En attente Médecin</option>
                  <option value="in_doctor_care">En consultation</option>
                  <option value="waiting_lab">En attente Labo / Caisse</option>
                  <option value="lab_results_ready">Résultats Labo Prêts</option>
                  <option value="waiting_cashier">En attente Caisse Finale</option>
                  <option value="hospitalized">Hospitalisé</option>
                  <option value="closed">Clôturés</option>
                </select>
              </div>
            </div>

            {loadingVisits ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chargement de la file...</div>
            ) : visits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-600 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Urg.</th>
                      <th className="py-3 px-4">État Physique</th>
                      <th className="py-3 px-4">Cible / Doc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {visit.passage_number.split('-').pop()}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => navigate(`/patients/${visit.patient}`)}
                            className="font-bold text-slate-800 hover:text-primary hover:underline text-left block"
                          >
                            {visit.patient_name}
                          </button>
                          <span className="text-[10px] text-slate-400 block">{visit.patient_mrn}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {getVisitTypeLabel(visit.visit_type)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(visit.priority_level)}`}>
                            P{visit.priority_level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(visit.status)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="font-semibold">{visit.department || 'Générale'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {visit.assigned_doctor_name || 'Premier dispo'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                Aucune visite enregistrée pour ce filtre aujourd'hui.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
