import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, Search, Filter, CheckCircle, Clock, Save, FileText, X,
  ShieldAlert, CreditCard, Play, Lock, Unlock, Check, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { laboratoryService } from '../../services/laboratory';

export default function LaboratoryListPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [page, setPage] = useState(1);
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [resultData, setResultData] = useState({
    value: '',
    numeric_value: '',
    flag: 'normal',
    notes: '',
    attachment: null as File | null
  });

  // Query lab requests
  const { data, isLoading } = useQuery({
    queryKey: ['labRequests', page, searchTerm],
    queryFn: () => laboratoryService.getLabRequests({
      page,
      search: searchTerm || undefined,
    }),
  });

  // Mutation to start analysis
  const startAnalysisMutation = useMutation({
    mutationFn: (id: string) => laboratoryService.updateLabRequest(id, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labRequests'] });
    }
  });

  // Mutation to simulate cashier payment (for dev testing)
  const payRequestMutation = useMutation({
    mutationFn: (id: string) => laboratoryService.updateLabRequest(id, { is_paid: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labRequests'] });
    }
  });

  // Mutation to add result
  const addResultMutation = useMutation({
    mutationFn: (data: any) => laboratoryService.addLabResult(selectedRequest.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labRequests'] });
      setSelectedRequest(null);
      setResultData({ value: '', numeric_value: '', flag: 'normal', notes: '', attachment: null });
    },
    onError: (err: any) => {
      console.error(err);
      alert('Erreur lors de la validation des résultats. Veuillez vérifier vos saisies.');
    }
  });

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultData.value) {
      alert('Veuillez saisir le résultat.');
      return;
    }
    
    const formData = new FormData();
    formData.append('value', resultData.value);
    if (resultData.numeric_value) {
      formData.append('numeric_value', resultData.numeric_value);
    }
    formData.append('flag', resultData.flag);
    if (resultData.notes) {
      formData.append('notes', resultData.notes);
    }
    if (resultData.attachment) {
      formData.append('attachment', resultData.attachment);
    }

    addResultMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold border border-yellow-200 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> En attente</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold border border-blue-200 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> En cours</span>;
      case 'completed':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Terminé</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium w-fit">{status}</span>;
    }
  };

  // Filter lists based on activeTab
  const rawResults = data?.results || [];
  const filteredRequests = rawResults.filter((req: any) => {
    if (activeTab === 'active') {
      return ['pending', 'in_progress'].includes(req.status);
    } else {
      return ['completed', 'cancelled'].includes(req.status);
    }
  });

  const checkPaymentStatus = (req: any) => {
    if (req.patient_payment_type === 'INSURANCE') {
      return { allowed: true, badge: <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-md flex items-center gap-1 w-fit"><Check className="w-3.5 h-3.5" /> Assurance</span> };
    }
    
    if (req.is_paid) {
      return { allowed: true, badge: <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-md flex items-center gap-1 w-fit"><Check className="w-3.5 h-3.5" /> Payé (Cash)</span> };
    }

    return { allowed: false, badge: <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 text-[10px] font-extrabold rounded-md flex items-center gap-1 w-fit"><ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Non Payé</span> };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Laboratoire & Analyses
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gérez le parcours d'analyse biologique et de validation des résultats</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('active'); setPage(1); }}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" /> File Active
          {rawResults.filter((r: any) => ['pending', 'in_progress'].includes(r.status)).length > 0 && (
            <span className="ml-1 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
              {rawResults.filter((r: any) => ['pending', 'in_progress'].includes(r.status)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('history'); setPage(1); }}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> Historique
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par patient..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-primary text-white text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold first:rounded-tl-2xl">Date & Heure</th>
                <th className="px-6 py-4 font-bold">Patient</th>
                <th className="px-6 py-4 font-bold">Examen</th>
                <th className="px-6 py-4 font-bold">Prescripteur</th>
                <th className="px-6 py-4 font-bold">Facturation</th>
                <th className="px-6 py-4 font-bold">État</th>
                <th className="px-6 py-4 font-bold text-right last:rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Chargement des demandes de laboratoire...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Aucun examen en attente dans cette section.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req: any, index: number) => {
                  const payment = checkPaymentStatus(req);
                  return (
                    <tr 
                      key={req.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        !payment.allowed && activeTab === 'active' ? 'bg-red-50/20' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {req.patient_name}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {req.exam_type_details?.name || 'Examen'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        Dr. {req.requested_by_name || 'Inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {payment.badge}
                          {!payment.allowed && activeTab === 'active' && (
                            <button
                              onClick={() => payRequestMutation.mutate(req.id)}
                              disabled={payRequestMutation.isPending}
                              className="text-[10px] text-primary hover:text-primary/80 font-bold underline text-left flex items-center gap-0.5"
                              title="Simuler le paiement pour débloquer le test"
                            >
                              <CreditCard className="w-3 h-3" /> Simuler Caisse
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <button
                            disabled={!payment.allowed || startAnalysisMutation.isPending}
                            onClick={() => startAnalysisMutation.mutate(req.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                              payment.allowed
                                ? 'bg-primary text-white hover:bg-primary/95 shadow-sm hover:scale-[1.02]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            {payment.allowed ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            Commencer
                          </button>
                        ) : req.status === 'in_progress' ? (
                          <button 
                            disabled={!payment.allowed}
                            onClick={() => setSelectedRequest(req)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                              payment.allowed
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:scale-[1.02]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            {payment.allowed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            Saisir résultats
                          </button>
                        ) : (
                          <span className="text-slate-400 flex items-center justify-end gap-1 text-xs font-semibold">
                            <FileText className="w-4 h-4 text-primary/60" /> Résultat validé
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data?.count > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-500">
              Affichage de {((page - 1) * 20) + 1} à {Math.min(page * 20, data.count)} sur {data.count} demandes
            </span>
            <div className="flex gap-2">
              <button disabled={!data.previous} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors">Précédent</button>
              <button disabled={!data.next} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Result Entry Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Validation des Résultats
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Examen: <strong className="text-slate-700">{selectedRequest.exam_type_details?.name}</strong> • Patient: {selectedRequest.patient_name}
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <form id="result-form" onSubmit={handleAddResult} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">Résultat / Valeur (Texte) *</label>
                <input 
                  required 
                  type="text" 
                  value={resultData.value} 
                  onChange={e => setResultData({...resultData, value: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                  placeholder="Ex: 5.2 mmol/L, Négatif, Positif..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">Valeur Numérique (optionnel)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={resultData.numeric_value} 
                    onChange={e => setResultData({...resultData, numeric_value: e.target.value})} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                    placeholder="Ex: 5.2" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">Alerte Clinique (Flag)</label>
                  <select 
                    value={resultData.flag} 
                    onChange={e => setResultData({...resultData, flag: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="low">Bas</option>
                    <option value="high">Élevé</option>
                    <option value="critical">Critique (Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">Interprétation & Notes</label>
                <textarea 
                  rows={3} 
                  value={resultData.notes} 
                  onChange={e => setResultData({...resultData, notes: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none text-xs" 
                  placeholder="Notes cliniques, observations du laborantin..." 
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">Pièce jointe (Radio, PDF, Image)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={e => setResultData({...resultData, attachment: e.target.files?.[0] || null})} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-xs" 
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedRequest(null)} className="px-5 py-2 text-xs sm:text-sm text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Annuler</button>
              <button type="submit" form="result-form" disabled={addResultMutation.isPending} className="bg-primary hover:bg-primary/95 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
                <Save className="w-4 h-4" /> 
                {addResultMutation.isPending ? 'Enregistrement...' : 'Valider & Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
