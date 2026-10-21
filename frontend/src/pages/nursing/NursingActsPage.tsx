import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Syringe, Search, Clock, CheckCircle, AlertCircle, Plus, Activity, Bandage } from 'lucide-react';
import { nursingService } from '../../services/nursing';
import type { NursingActType, NursingAct } from '../../services/nursing';
import { getVisits } from '../../services/visits';

export default function NursingActsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  
  // Nouveaux états pour le formulaire
  const [selectedActType, setSelectedActType] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // 1. Récupérer la file d'attente
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['visits', 'waiting_nursing_act'],
    queryFn: () => getVisits({ status: 'waiting_nursing_act', visit_type: 'nursing_only' }),
  });

  // 2. Récupérer l'historique des actes terminés
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['nursing-acts', 'completed'],
    queryFn: () => nursingService.getActs({ status: 'completed' }),
  });

  // 3. Récupérer le catalogue des actes infirmiers
  const { data: actTypesData } = useQuery({
    queryKey: ['nursing-act-types'],
    queryFn: () => nursingService.getActTypes(),
  });

  // Sélection de la visite courante
  const selectedVisit = queueData?.results?.find((v: any) => v.id === selectedVisitId);

  // Mutation: Créer et terminer un acte en une passe
  const recordActMutation = useMutation({
    mutationFn: async (data: { visit: number, patient: number, act_type: number, notes?: string }) => {
      // Étape 1 : Créer
      const act = await nursingService.createAct(data);
      // Étape 2 : Terminer
      return await nursingService.completeAct(act.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['nursing-acts'] });
      setSelectedVisitId(null);
      setSelectedActType('');
      setNotes('');
    }
  });

  const handleSubmitAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !selectedActType) return;

    recordActMutation.mutate({
      visit: selectedVisit.id,
      patient: selectedVisit.patient,
      act_type: Number(selectedActType),
      notes: notes
    });
  };

  const getPriorityColor = (priority: number) => {
    switch(priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Soins Infirmiers & Traitements</h1>
          <p className="text-slate-500 mt-1">Actes isolés (injections, pansements, etc.)</p>
        </div>
        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'queue' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            File d'Attente ({queueData?.count || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Historique ({historyData?.count || 0})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne Liste */}
        <div className="lg:col-span-2">
          {activeTab === 'queue' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  File d'Attente (Patients)
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {queueLoading ? (
                  <div className="p-8 text-center text-slate-500">Chargement...</div>
                ) : queueData?.results?.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <p className="text-slate-600 font-medium">Aucun patient en attente</p>
                  </div>
                ) : (
                  queueData?.results?.map((visit: any) => (
                    <div 
                      key={visit.id} 
                      className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${selectedVisitId === visit.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                      onClick={() => setSelectedVisitId(visit.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{visit.patient_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(visit.priority_level)}`}>
                              Priorité {visit.priority_level}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            Passage: {visit.passage_number} • Arrivé à {new Date(visit.created_at).toLocaleTimeString()}
                          </div>
                          {visit.reason_for_visit && (
                            <p className="text-sm mt-2 text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="font-medium">Motif :</span> {visit.reason_for_visit}
                            </p>
                          )}
                        </div>
                        <button 
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          Sélectionner
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Actes Réalisés Aujourd'hui
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Heure</th>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Acte Réalisé</th>
                      <th className="px-4 py-3 font-medium">Infirmier(e)</th>
                      <th className="px-4 py-3 font-medium text-right">Tarif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chargement...</td></tr>
                    ) : historyData?.results?.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun historique disponible</td></tr>
                    ) : (
                      historyData?.results?.map((act: any) => (
                        <tr key={act.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(act.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{act.patient_name}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium text-xs border border-emerald-100">
                              <Bandage className="h-3.5 w-3.5" />
                              {act.act_type_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{act.performed_by_name}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{act.price.toLocaleString()} FCFA</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Colonne Formulaire (Action) */}
        <div className="lg:col-span-1">
          {selectedVisit ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="p-4 border-b border-slate-200 bg-primary text-white">
                <h3 className="font-semibold text-lg">{selectedVisit.patient_name}</h3>
                <p className="text-primary-100 text-sm opacity-90">{selectedVisit.passage_number}</p>
              </div>
              
              <div className="p-5">
                <form onSubmit={handleSubmitAct} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type d'acte infirmier *</label>
                    <select
                      required
                      value={selectedActType}
                      onChange={(e) => setSelectedActType(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Sélectionner un acte...</option>
                      {actTypesData?.results?.map((type: NursingActType) => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.default_price.toLocaleString()} FCFA
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes d'intervention (Optionnel)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Observations suite à l'acte..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedActType || recordActMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                  >
                    {recordActMutation.isPending ? 'Enregistrement...' : 'Enregistrer et Terminer'}
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-2">
                    L'acte sera facturé et le patient passera en Caisse.
                  </p>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-8 text-center flex flex-col items-center justify-center h-64 sticky top-24">
              <Syringe className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Sélectionnez un patient dans la file pour enregistrer un acte.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
