import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientById, getPatientTimeline, createVisit, toggleArchivePatient } from '../../services/patients';
import { 
  UserCircle, Phone, MapPin, Calendar, Activity,
  ArrowLeft, Edit, AlertTriangle, FileText, ChevronRight, Archive, Printer
} from 'lucide-react';
import PatientHistoryTimeline from '../../components/patients/PatientHistoryTimeline';
import { useAuthStore } from '../../store/auth';

export default function PatientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const hasRole = useAuthStore((state) => state.hasRole);
  const canArchive = hasRole(['admin', 'doctor']);
  const canPrint = hasRole(['admin', 'doctor']);
  
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientById(id as string),
    enabled: !!id
  });

  const { data: timelineEvents, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: () => getPatientTimeline(id as string),
    enabled: !!id
  });

  const queryClient = useQueryClient();
  const createVisitMutation = useMutation({
    mutationFn: (reason: string) => createVisit({ patient: id, visit_type: 'normal', reason_for_visit: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] });
      alert("Visite créée avec succès ! Le patient est maintenant dans la file d'attente (Triage).");
      navigate('/patients');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (is_archived: boolean) => toggleArchivePatient(id as string, is_archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center p-12 bg-card rounded-2xl border border-border">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Patient introuvable</h2>
        <p className="text-foreground/70 mt-2 mb-6">Le dossier médical demandé n'existe pas ou vous n'y avez pas accès.</p>
        <Link to="/patients" className="text-primary hover:underline">
          Retourner à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {patient.is_archived && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg">
          <div className="flex items-center">
            <Archive className="h-6 w-6 text-destructive mr-3" />
            <div>
              <h3 className="text-destructive font-bold text-lg">DOSSIER ARCHIVÉ</h3>
              <p className="text-destructive/80 text-sm">Ce dossier est en lecture seule. Aucune modification ou nouvelle visite n'est autorisée.</p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center text-sm text-foreground/60">
          <Link to="/patients" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Patients
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="font-medium text-foreground">Dossier {patient.mrn}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPrint && (
            <Link 
              to={`/patients/${patient.id}/export`}
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimer Dossier
            </Link>
          )}

          {!patient.is_archived ? (
            <>
              {canArchive && (
                <button 
                  onClick={() => {
                    if (window.confirm("Voulez-vous vraiment archiver ce dossier ? Il passera en lecture seule.")) {
                      archiveMutation.mutate(true);
                    }
                  }}
                  disabled={archiveMutation.isPending}
                  className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Archive className="h-4 w-4" />
                  Archiver
                </button>
              )}
              <button 
                onClick={() => {
                  const reason = window.prompt("Motif de la visite ?");
                  if (reason) {
                    createVisitMutation.mutate(reason);
                  }
                }}
                disabled={createVisitMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {createVisitMutation.isPending ? 'Création...' : 'Nouvelle Visite'}
              </button>
              <Link 
                to={`/patients/${patient.id}/edit`}
                className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </Link>
            </>
          ) : (
            canArchive && (
              <button 
                onClick={() => {
                  if (window.confirm("Voulez-vous vraiment désarchiver ce dossier ?")) {
                    archiveMutation.mutate(false);
                  }
                }}
                disabled={archiveMutation.isPending}
                className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Archive className="h-4 w-4" />
                Désarchiver
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identité */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center pb-6 border-b border-border">
              <div className="h-24 w-24 bg-secondary rounded-full flex items-center justify-center mb-4">
                <UserCircle className="h-16 w-16 text-foreground/40" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-md">
                  MRN: {patient.mrn}
                </span>
                {patient.is_provisional && (
                  <span className="bg-warning/10 text-warning text-xs font-semibold px-2.5 py-0.5 rounded-md border border-warning/20">
                    Patient Inconscient / Provisoire
                  </span>
                )}
                {patient.payment_type === 'INSURANCE' ? (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                    Assurance
                  </span>
                ) : (
                  <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                    Privé (Cash)
                  </span>
                )}
                {Number(patient.outstanding_balance) > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-md border border-red-300">
                    ⚠️ IMPAYÉ : {patient.outstanding_balance} XAF
                  </span>
                )}
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-5 w-5 text-foreground/50" />
                <div>
                  <p className="text-foreground/70 text-xs">Date de naissance</p>
                  <p className="font-medium text-foreground">
                    {patient.date_of_birth 
                      ? `${new Date(patient.date_of_birth).toLocaleDateString('fr-FR')} (${patient.age} ans)`
                      : 'Non renseignée (Âge inconnu)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-5 w-5 text-foreground/50" />
                <div>
                  <p className="text-foreground/70 text-xs">Téléphone</p>
                  <p className="font-medium text-foreground">{patient.phone || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-5 w-5 text-foreground/50" />
                <div>
                  <p className="text-foreground/70 text-xs">Adresse</p>
                  <p className="font-medium text-foreground">
                    {patient.address ? `${patient.address}, ` : ''}
                    {patient.city ? patient.city : 'Non renseignée'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Activity className="h-5 w-5 text-foreground/50" />
                <div>
                  <p className="text-foreground/70 text-xs">Sexe / Groupe sanguin</p>
                  <p className="font-medium text-foreground">
                    {patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : patient.gender === 'O' ? 'Autre' : 'Inconnu'}
                    {patient.blood_group && ` • ${patient.blood_group}`}
                  </p>
                </div>
              </div>
            </div>

            {patient.is_provisional && patient.provisional_description && (
              <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                <h4 className="text-xs font-bold text-warning-foreground uppercase tracking-wider mb-2">Description Physique</h4>
                <p className="text-sm text-foreground/80">{patient.provisional_description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Médical & Historique */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2 bg-secondary/30">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Résumé Médical</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground/70 mb-3 uppercase tracking-wider">Allergies</h4>
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <ul className="space-y-2">
                      {/* @ts-ignore */}
                      {patient.allergies.map((a: any) => (
                        <li key={a.id} className="flex items-start gap-2 bg-destructive/5 text-destructive-foreground px-3 py-2 rounded-lg text-sm border border-destructive/20">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                          <div>
                            <span className="font-medium text-destructive">{a.allergen}</span>
                            {a.severity && <span className="ml-2 text-xs">({a.severity})</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-foreground/50 italic bg-secondary/50 px-3 py-2 rounded-lg">Aucune allergie connue</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground/70 mb-3 uppercase tracking-wider">Antécédents</h4>
                  {patient.antecedents && patient.antecedents.length > 0 ? (
                    <ul className="space-y-2">
                      {/* @ts-ignore */}
                      {patient.antecedents.map((a: any) => (
                        <li key={a.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                          <span className="font-medium">{a.condition}</span>
                          {a.diagnosis_date && <span className="text-foreground/50 ml-2">({new Date(a.diagnosis_date).getFullYear()})</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-foreground/50 italic bg-secondary/50 px-3 py-2 rounded-lg">Aucun antécédent particulier</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2 bg-secondary/30">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Historique Médical Complet</h3>
            </div>
            <div className="p-6">
              {isLoadingTimeline ? (
                <div className="text-center p-8">Chargement de l'historique...</div>
              ) : (
                <PatientHistoryTimeline events={timelineEvents || []} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
