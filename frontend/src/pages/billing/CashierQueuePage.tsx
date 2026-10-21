import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, Search, Clock, Check, FileText, Printer, ShieldAlert,
  User, Clipboard, Calculator, Award
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getVisits, collectPayment } from '../../services/visits';

export default function CashierQueuePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  
  const todayStr = new Date().toISOString().split('T')[0];

  // Query visits
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ['cashier_visits', searchTerm],
    queryFn: () => getVisits({
      created_date: todayStr,
      search: searchTerm || undefined
    }),
    refetchInterval: 5000, // Poll every 5 seconds for live cashier queue
  });

  // Mutation to collect payment
  const paymentMutation = useMutation({
    mutationFn: (visitId: string) => collectPayment(visitId),
    onSuccess: (updatedVisit) => {
      queryClient.invalidateQueries({ queryKey: ['cashier_visits'] });
      // Keep selected visit updated
      setSelectedVisit(updatedVisit);
      alert('Paiement encaissé avec succès !');
    },
    onError: (err) => {
      console.error(err);
      alert("Erreur lors de l'enregistrement du paiement.");
    }
  });

  const getConsultationPrice = (visitType: string) => {
    switch (visitType) {
      case 'nursing_only':
        return 3000;
      case 'emergency':
        return 8000;
      case 'follow_up_results':
        return 0;
      default:
        return 5000;
    }
  };

  const getConsultationLabel = (visitType: string) => {
    switch (visitType) {
      case 'nursing_only':
        return 'Acte Infirmier Uniquement';
      case 'emergency':
        return 'Ticket Consultation Urgence';
      case 'follow_up_results':
        return 'Retour Examens / Suivi (Gratuit)';
      default:
        return 'Ticket Consultation Médecine Générale';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_nurse': return 'En attente constantes';
      case 'waiting_doctor': return 'En attente médecin';
      case 'in_doctor_care': return 'En consultation';
      case 'waiting_lab': return 'En attente examens labo';
      case 'lab_results_ready': return 'Résultats labo prêts';
      case 'waiting_cashier': return 'Prêt pour sortie (Attente caisse)';
      case 'closed': return 'Parcours clôturé';
      default: return status;
    }
  };

  // Filter active cashier queue
  const visits = visitsData?.results || [];
  const activeQueue = visits.filter((v: any) => {
    if (v.status === 'closed') return false;
    
    // Always show if explicitly waiting for cashier
    if (v.status === 'waiting_cashier') return true;
    
    // Show if consultation ticket is unpaid
    if (!v.is_paid) return true;
    
    // Show if there is any unpaid prescribed exam
    const hasUnpaidExams = v.prescribed_exams?.some((ex: any) => !ex.is_paid);
    if (hasUnpaidExams) return true;
    
    // Show if there is any unpaid nursing act
    const hasUnpaidNursingActs = v.nursing_acts?.some((act: any) => !act.is_paid);
    if (hasUnpaidNursingActs) return true;
    
    return false;
  });

  // Calculate invoice details for selected patient
  const calculateInvoice = (visit: any) => {
    if (!visit) return null;
    
    const items = [];
    
    // 1. Consultation Ticket
    const consultPrice = getConsultationPrice(visit.visit_type);
    items.push({
      id: 'consult',
      name: getConsultationLabel(visit.visit_type),
      price: consultPrice,
      is_paid: visit.is_paid
    });
    
    // 2. Prescribed Lab / Imaging Exams
    if (visit.prescribed_exams) {
      visit.prescribed_exams.forEach((ex: any) => {
        items.push({
          id: ex.id,
          name: `${ex.category === 'imaging' ? 'Radio: ' : 'Analyses: '}${ex.name}`,
          price: ex.price || 2500,
          is_paid: ex.is_paid
        });
      });
    }

    // 3. Hospitalization stay
    if (visit.hospitalization_details) {
      const h = visit.hospitalization_details;
      items.push({
        id: `hosp-${h.id}`,
        name: `Hospitalisation (${h.ward_name} - ${h.bed_name}) : ${h.days} jour(s) à ${h.price_per_day.toLocaleString()} XAF/j`,
        price: h.total_price,
        is_paid: h.is_paid
      });
    }

    // 4. Nursing acts
    if (visit.nursing_acts) {
      visit.nursing_acts.forEach((act: any) => {
        items.push({
          id: `act-${act.id}`,
          name: `Acte Infirmier : ${act.name}`,
          price: act.price,
          is_paid: act.is_paid
        });
      });
    }

    // 5. Past Debt
    if (visit.patient_outstanding_balance && Number(visit.patient_outstanding_balance) > 0) {
      items.push({
        id: 'past-debt',
        name: 'Arriérés (Dette des visites précédentes)',
        price: Number(visit.patient_outstanding_balance),
        is_paid: false
      });
    }

    const unpaidItems = items.filter(i => !i.is_paid);
    const subtotal = unpaidItems.reduce((acc, item) => acc + item.price, 0);
    
    // Insurance policy calculation
    const isInsurance = visit.patient_payment_type === 'INSURANCE';
    const insuranceRate = isInsurance ? 0.8 : 0.0; // 80% coverage
    const insurancePart = subtotal * insuranceRate;
    const patientPart = subtotal - insurancePart;

    return {
      items,
      unpaidItems,
      subtotal,
      isInsurance,
      insurancePart,
      patientPart
    };
  };

  const invoice = selectedVisit ? calculateInvoice(selectedVisit) : null;

  const handlePrint = () => {
    if (!selectedVisit || !invoice) return;
    
    const printContent = document.getElementById('invoice-receipt')?.innerHTML;
    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (winPrint) {
      winPrint.document.write(`
        <html>
          <head>
            <title>Facture - ${selectedVisit.patient_name}</title>
            <style>
              body { font-family: monospace; padding: 20px; font-size: 12px; line-height: 1.5; color: #333; }
              .header { text-align: center; margin-bottom: 20px; }
              .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; }
              th { text-align: left; }
              td.num { text-align: right; }
              .total { font-weight: bold; font-size: 14px; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      winPrint.document.close();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      
      {/* Queue List (Left) */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Caisse & Facturation
          </h1>
          <p className="text-sm text-slate-500 mt-1">Encaissez les tickets modérateurs et les examens de laboratoire</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher patient ou ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {activeQueue.length} en attente
          </span>
        </div>

        {/* Queue List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Chargement de la file caisse...</div>
          ) : activeQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Check className="h-8 w-8 text-primary/40" />
              Aucun patient en attente de paiement actuellement.
            </div>
          ) : (
            activeQueue.map((visit: any) => {
              const inv = calculateInvoice(visit);
              const isSelected = selectedVisit?.id === visit.id;
              return (
                <button
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-center ${
                    isSelected ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {visit.passage_number.split('-').pop()}
                      </span>
                      <strong className="text-slate-900 text-sm">{visit.patient_name}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      État : {getStatusLabel(visit.status)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-slate-900 text-sm">
                      {inv ? inv.patientPart.toLocaleString() : 0} XAF
                    </div>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      visit.patient_payment_type === 'INSURANCE' ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {visit.patient_payment_type === 'INSURANCE' ? 'Assurance' : 'Cash'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bill & Checkout Details (Right) */}
      <div className="lg:col-span-7">
        {selectedVisit ? (
          <div className="space-y-6">
            
            {/* Facturation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{selectedVisit.patient_name}</h3>
                    <p className="text-xs text-slate-500">MRN: {selectedVisit.patient_mrn} • Ticket: {selectedVisit.passage_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    selectedVisit.patient_payment_type === 'INSURANCE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {selectedVisit.patient_payment_type === 'INSURANCE' ? 'Régime Assurance (80%)' : 'Régime Cash (Privé)'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Clipboard className="w-4 h-4 text-slate-400" /> Détails des Actes du Passage
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="px-4 py-3">Désignation</th>
                        <th className="px-4 py-3 text-right">Tarif</th>
                        <th className="px-4 py-3 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice?.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{item.price.toLocaleString()} XAF</td>
                          <td className="px-4 py-3 text-right">
                            {item.is_paid ? (
                              <span className="text-emerald-700 font-extrabold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Payé</span>
                            ) : (
                              <span className="text-red-700 font-extrabold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-100">Non payé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Summary */}
              {invoice && (
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total actes non réglés :</span>
                    <span className="font-bold text-slate-800">{invoice.subtotal.toLocaleString()} XAF</span>
                  </div>
                  
                  {invoice.isInsurance && (
                    <>
                      <div className="flex justify-between text-emerald-700">
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" /> Part Couverte par l'Assurance (80%) :
                        </span>
                        <span className="font-bold">-{invoice.insurancePart.toLocaleString()} XAF</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 my-2"></div>
                    </>
                  )}

                  <div className="flex justify-between text-slate-900 font-extrabold text-base pt-1">
                    <span>Net à encaisser (Part Patient) :</span>
                    <span className="text-primary">{invoice.patientPart.toLocaleString()} XAF</span>
                  </div>
                </div>
              )}

              {/* Warning if still hospitalized */}
              {selectedVisit?.hospitalization_details?.status === 'active' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <strong className="block text-amber-900 font-bold mb-0.5">Patient toujours hospitalisé</strong>
                    Ce patient occupe actuellement le lit <span className="font-bold underline">{selectedVisit.hospitalization_details.bed_name}</span> ({selectedVisit.hospitalization_details.ward_name}). Vous devez enregistrer sa sortie clinique dans le module Hospitalisation pour figer sa facture avant de pouvoir procéder à l'encaissement.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimer reçu
                </button>
                
                {invoice && invoice.unpaidItems.length > 0 ? (
                  <button
                    disabled={paymentMutation.isPending || selectedVisit?.hospitalization_details?.status === 'active'}
                    onClick={() => paymentMutation.mutate(selectedVisit.id)}
                    className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-md hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
                  >
                    <Check className="w-4 h-4" />
                    {paymentMutation.isPending ? 'Enregistrement...' : `Encaisser ${invoice.patientPart.toLocaleString()} XAF`}
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Tout est payé & clôturé
                  </div>
                )}
              </div>

            </div>

            {/* Print Wrapper (Hidden on screen, structured for thermal/monospace printing) */}
            <div className="hidden">
              <div id="invoice-receipt">
                <div className="header">
                  <div className="title">CLINIQUE DU PARCOURS</div>
                  <div>Région du Littoral, Douala, Cameroun</div>
                  <div>Tél: +237 600 000 000</div>
                  <div className="divider"></div>
                  <div><strong>REÇU D'ENCAISSEMENT CAISSE</strong></div>
                  <div>Date: {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                  <div>Ticket N°: {selectedVisit.passage_number}</div>
                  <div>Patient: {selectedVisit.patient_name}</div>
                  <div>NIP (MRN): {selectedVisit.patient_mrn}</div>
                  <div>Méthode: {selectedVisit.patient_payment_type === 'INSURANCE' ? 'ASSURANCE' : 'CASH (PRIVÉ)'}</div>
                </div>
                <div className="divider"></div>
                <table>
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th className="num">Prix (XAF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice?.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name} {item.is_paid ? '(Paiement ant.)' : ''}</td>
                        <td className="num">{item.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="divider"></div>
                <table>
                  <tbody>
                    <tr>
                      <td>Sous-total :</td>
                      <td className="num">{invoice?.subtotal.toLocaleString()} XAF</td>
                    </tr>
                    {invoice?.isInsurance && (
                      <>
                        <tr>
                          <td>Part Assurance (80%) :</td>
                          <td className="num">-{invoice?.insurancePart.toLocaleString()} XAF</td>
                        </tr>
                      </>
                    )}
                    <tr className="total">
                      <td>NET PAYÉ (CASH ENCAISSÉ) :</td>
                      <td className="num">{invoice?.patientPart.toLocaleString()} XAF</td>
                    </tr>
                  </tbody>
                </table>
                <div className="divider"></div>
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  Merci pour votre confiance.<br />
                  Guéris vite !
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3 h-[400px]">
            <Calculator className="h-12 w-12 text-slate-300" />
            <div>
              <h4 className="font-extrabold text-slate-800">Aucun patient sélectionné</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Sélectionnez un patient dans la file de gauche pour éditer et encaisser sa facture physique.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
