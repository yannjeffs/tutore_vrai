import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, MoreVertical, FileText, 
  Clock, CheckCircle, XCircle, Stethoscope, Activity, PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { consultationService } from '../../services/consultations';
import { getVisits } from '../../services/visits';

export default function ConsultationListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['consultations', page, searchTerm, statusFilter],
    queryFn: () => consultationService.getAll({
      page,
      search: searchTerm,
      status: statusFilter,
    }),
  });

  const { data: visitsData, isLoading: queueLoading } = useQuery({
    queryKey: ['doctor_visits_queue'],
    queryFn: () => getVisits({
      created_date: todayStr,
    }),
    refetchInterval: 5000,
  });

  const activeQueue = visitsData?.results?.filter((v: any) => 
    ['waiting_doctor', 'in_doctor_care', 'lab_results_ready'].includes(v.status)
  ) || [];

  const getPriorityColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-500 text-white animate-pulse font-bold ring-2 ring-red-400';
      case 2: return 'bg-orange-500 text-white font-semibold';
      case 3: return 'bg-amber-500 text-white';
      case 4: return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getVisitTypeBadge = (type: string) => {
    switch (type) {
      case 'nursing_only': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Soin Infirmier</span>;
      case 'follow_up_results': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Retour Examens</span>;
      case 'emergency': 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">Urgence</span>;
      default: 
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Consultation</span>;
    }
  };

  const getParcoursLabel = (status: string) => {
    switch (status) {
      case 'waiting_doctor':
        return <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-[10px] font-bold border border-yellow-200">En attente médecin</span>;
      case 'in_doctor_care':
        return <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-200">En consultation</span>;
      case 'lab_results_ready':
        return <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md text-[10px] font-bold border border-green-200 animate-pulse">Résultats labo prêts</span>;
      default:
        return <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200">{status}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_triage':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1"><FileText className="w-3 h-3" /> En attente triage</span>;
      case 'waiting_doctor':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> En attente médecin</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> En cours</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Terminée</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Annulée</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'general': 'Générale',
      'specialist': 'Spécialiste',
      'follow_up': 'Suivi',
      'emergency': 'Urgence'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Consultations
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les consultations médicales de la clinique</p>
        </div>
        <button 
          onClick={() => navigate('/consultations/new')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle consultation
        </button>
      </div>

      {/* File d'Attente Clinique (Aujourd'hui) */}
      <div className="card p-6 space-y-4 border border-primary/20 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            File d'Attente Clinique (Aujourd'hui)
          </h2>
          <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
            {activeQueue.length} patient(s) en attente
          </span>
        </div>

        {queueLoading ? (
          <div className="text-center py-6 text-sm text-slate-500">Chargement de la file d'attente...</div>
        ) : activeQueue.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            Aucun patient en attente dans votre file actuellement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-medium">
                  <th className="px-4 py-3">Heure d'arrivée</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Urgence</th>
                  <th className="px-4 py-3">État du parcours</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeQueue.map((visit: any, index: number) => {
                  const hasDraft = !!visit.active_consultation_id;
                  return (
                    <tr 
                      key={visit.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        visit.priority_level === 1 ? 'bg-red-50/50 hover:bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(visit.created_at), 'HH:mm', { locale: fr })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {visit.passage_number.split('-').pop()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{visit.patient_name}</div>
                        <div className="text-[10px] text-slate-400">{visit.patient_mrn}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getVisitTypeBadge(visit.visit_type)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${getPriorityColor(visit.priority_level)}`}>
                          P{visit.priority_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {getParcoursLabel(visit.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (hasDraft) {
                              navigate(`/consultations/${visit.active_consultation_id}`);
                            } else {
                              navigate(`/consultations/new?visit_id=${visit.id}`);
                            }
                          }}
                          className={`shadow-sm px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 ml-auto ${
                            hasDraft
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-primary text-white hover:bg-primary/95'
                          }`}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {hasDraft ? 'Reprendre draft' : 'Consulter'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par patient..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary appearance-none text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="pending_triage">En attente triage</option>
              <option value="waiting_doctor">En attente médecin</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white text-sm">
                <th className="px-6 py-4 font-semibold first:rounded-tl-xl">Date & Heure</th>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Médecin</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Chargement des consultations...
                  </td>
                </tr>
              ) : data?.results?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Aucune consultation trouvée.
                  </td>
                </tr>
              ) : (
                data?.results?.map((consultation: any, index: number) => (
                  <tr key={consultation.id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {format(new Date(consultation.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {consultation.patient_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      Dr. {consultation.doctor_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {getTypeLabel(consultation.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(consultation.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/consultations/${consultation.id}`)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Voir la consultation"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data?.count > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500">
              Affichage de {((page - 1) * 20) + 1} à {Math.min(page * 20, data.count)} sur {data.count} consultations
            </span>
            <div className="flex gap-2">
              <button
                disabled={!data.previous}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
              >
                Précédent
              </button>
              <button
                disabled={!data.next}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
