import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPatientById, getPatientTimeline } from '../../services/patients';
import { Activity, Printer, ArrowLeft, Download } from 'lucide-react';

export default function PatientRecordPrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientById(id as string),
    enabled: !!id
  });

  const { data: timelineEvents, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: () => getPatientTimeline(id as string),
    enabled: !!id
  });

  const handleDownloadPdf = () => {
    // Rely on native print dialog to avoid html2canvas oklch crash
    window.print();
  };

  if (isPatientLoading || isTimelineLoading) {
    return <div className="p-8 text-center print:hidden">Préparation du document...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-red-500">Erreur de chargement du patient.</div>;
  }

  return (
    <div className="bg-white text-black min-h-screen">
      {/* Non-printable controls */}
      <div className="print:hidden p-4 bg-slate-100 border-b flex justify-between items-center">
        <button 
          onClick={() => navigate(`/patients/${id}`)}
          className="flex items-center text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour au dossier
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadPdf}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" /> Télécharger en PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimer le Dossier
          </button>
        </div>
      </div>

      {/* Printable Area - A4 Optimized */}
      <div className="max-w-4xl mx-auto p-8 print:p-8 print:pt-12">
        
        {/* Header */}
        <header className="border-b-2 border-slate-800 pb-6 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-2xl font-bold text-slate-800 mb-1">
              <Activity className="h-8 w-8 text-blue-600" />
              <span>MEDITEK</span>
            </div>
            <p className="text-sm text-slate-600">Quartier Kotto, Douala</p>
            <p className="text-sm text-slate-600">Tél: 696481718</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-widest text-slate-500 mb-2">Dossier Médical Complet</h1>
            <p className="text-sm font-semibold">Généré le: {new Date().toLocaleDateString('fr-FR')}</p>
            <p className="text-sm font-semibold">Dossier N°: {patient.mrn}</p>
          </div>
        </header>

        {/* Patient Info */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4">Informations du Patient</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div><span className="font-semibold text-slate-600">Nom:</span> {patient.last_name}</div>
            <div><span className="font-semibold text-slate-600">Prénom:</span> {patient.first_name}</div>
            <div><span className="font-semibold text-slate-600">Date de naissance:</span> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-FR') : 'N/A'}</div>
            <div><span className="font-semibold text-slate-600">Âge:</span> {patient.age || 'N/A'} ans</div>
            <div><span className="font-semibold text-slate-600">Sexe:</span> {patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : 'N/A'}</div>
            <div><span className="font-semibold text-slate-600">Groupe Sanguin:</span> {patient.blood_group || 'N/A'}</div>
            <div><span className="font-semibold text-slate-600">Téléphone:</span> {patient.phone || 'N/A'}</div>
            <div><span className="font-semibold text-slate-600">Adresse:</span> {patient.address} {patient.city}</div>
          </div>
        </section>

        {/* Allergies & Antecedents */}
        <section className="mb-8 flex gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4 text-red-700">Allergies Connues</h2>
            {patient.allergies && patient.allergies.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {patient.allergies.map((al: any) => (
                  <li key={al.id}><strong>{al.allergen}</strong> (Sévérité: {al.severity}) {al.reaction ? `- ${al.reaction}` : ''}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucune allergie connue déclarée.</p>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4">Antécédents Médicaux</h2>
            {patient.antecedents && patient.antecedents.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {patient.antecedents.map((ant: any) => (
                  <li key={ant.id}><strong>{ant.condition}</strong> ({ant.type}) {ant.description ? `- ${ant.description}` : ''}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucun antécédent déclaré.</p>
            )}
          </div>
        </section>

        {/* Timeline / History */}
        <section>
          <h2 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4">Historique Clinique</h2>
          {timelineEvents && timelineEvents.length > 0 ? (
            <div className="space-y-6">
              {timelineEvents.map((event: any, index: number) => (
                <div key={event.id} className="pb-4 border-b border-slate-200 border-dashed last:border-0 break-inside-avoid">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800">
                      {event.title}
                      <span className="text-sm font-normal text-slate-500 ml-2">({event.status})</span>
                    </h3>
                    <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap pl-4 border-l-2 border-slate-300">
                    {event.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Aucun historique disponible pour ce patient.</p>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
          Document généré par le système d'information médicale MEDITEK. Confidentiel.
        </footer>
      </div>
    </div>
  );
}
