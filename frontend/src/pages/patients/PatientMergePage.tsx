import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPatients } from '../../services/patients';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, ArrowRightLeft, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PatientMergePage() {
  const navigate = useNavigate();
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pour la démo, on utilise la même requête mais on pourrait optimiser
  const { data: sourceData, isLoading: isLoadingSource } = useQuery({
    queryKey: ['patients', { search: sourceSearch, is_provisional: sourceSearch ? '' : 'true' }],
    queryFn: () => getPatients({ search: sourceSearch, is_provisional: sourceSearch ? '' : 'true' }),
    enabled: true // Always fetch either provisional or search results
  });

  const { data: targetData } = useQuery({
    queryKey: ['patients', { search: targetSearch }],
    queryFn: () => getPatients({ search: targetSearch }),
    enabled: targetSearch.length > 2
  });

  const sourcePatient = sourceId ? sourceData?.results.find((p: any) => p.id === sourceId) : null;
  const targetPatient = targetId ? targetData?.results.find((p: any) => p.id === targetId) : null;

  const handleMerge = async () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    
    setIsMerging(true);
    try {
      // Simuler l'appel API de fusion
      // await mergePatients(sourceId, targetId);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      setTimeout(() => navigate('/patients'), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsMerging(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Fusion réussie !</h2>
        <p className="text-foreground/70 mt-2">Les dossiers ont été fusionnés avec succès.</p>
        <p className="text-sm text-foreground/50 mt-1">Redirection en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 bg-card border border-border rounded-lg text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Fusion de dossiers</h1>
          <p className="text-sm text-foreground/70 mt-1">Fusionnez un dossier en doublon (source) vers le dossier principal (cible).</p>
        </div>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-destructive">Attention : Action irréversible</h3>
          <p className="text-xs text-destructive/80 mt-1">
            Le dossier source sera archivé et toutes ses données (consultations, prescriptions) seront transférées vers le dossier cible.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-start">
        {/* Dossier Source */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Dossier Source (à supprimer)</h2>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40" />
              <input
                type="text"
                placeholder="Rechercher par nom, MRN..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {!sourcePatient && isLoadingSource && (
              <div className="py-8 text-center text-foreground/50 text-sm">
                Chargement des dossiers...
              </div>
            )}

            {!sourcePatient && !isLoadingSource && sourceData?.results && (
              <div className="border border-border rounded-xl max-h-64 overflow-y-auto bg-background">
                {sourceData.results.length === 0 ? (
                  <div className="py-4 text-center text-foreground/50 text-sm">
                    {sourceSearch ? 'Aucun résultat trouvé.' : 'Aucun dossier provisoire actuel.'}
                  </div>
                ) : (
                  <>
                    {!sourceSearch && (
                      <div className="px-4 py-2 bg-secondary/50 text-xs font-bold text-foreground/60 uppercase tracking-wider sticky top-0 border-b border-border">
                        Dossiers Provisoires Récents
                      </div>
                    )}
                    {sourceData.results.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setSourceId(p.id)}
                        className="w-full text-left px-4 py-3 border-b border-border hover:bg-secondary transition-colors"
                      >
                        <div className="font-medium text-sm text-foreground flex items-center justify-between">
                          <span>{p.first_name} {p.last_name}</span>
                          {p.is_provisional && <span className="bg-warning/10 text-warning text-[10px] px-1.5 py-0.5 rounded font-bold">Provisoire</span>}
                        </div>
                        <div className="text-xs text-foreground/60 mt-1">MRN: {p.mrn} • {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                        {p.provisional_description && (
                          <div className="text-xs text-foreground/50 mt-1 line-clamp-1 italic">
                            "{p.provisional_description}"
                          </div>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {sourcePatient && (
              <div className="bg-secondary/30 border border-border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-foreground">{sourcePatient.first_name} {sourcePatient.last_name}</div>
                  <button onClick={() => setSourceId(null)} className="text-xs text-destructive hover:underline">Changer</button>
                </div>
                <div className="text-sm text-foreground/70 space-y-1">
                  <p>MRN: <span className="font-medium">{sourcePatient.mrn}</span></p>
                  <p>Né(e) le: {new Date(sourcePatient.date_of_birth).toLocaleDateString('fr-FR')}</p>
                  <p>Contact: {sourcePatient.phone || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Icone de fusion */}
        <div className="hidden md:flex flex-col items-center justify-center pt-24 text-primary/40">
          <ArrowRightLeft className="h-8 w-8" />
        </div>

        {/* Dossier Cible */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Dossier Cible (à conserver)</h2>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40" />
              <input
                type="text"
                placeholder="Rechercher par nom, MRN..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {!targetPatient && targetSearch.length > 2 && targetData?.results && (
              <div className="border border-border rounded-xl max-h-48 overflow-y-auto bg-background">
                {targetData.results.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setTargetId(p.id)}
                    className="w-full text-left px-4 py-3 border-b border-border hover:bg-secondary transition-colors"
                  >
                    <div className="font-medium text-sm text-foreground">{p.first_name} {p.last_name}</div>
                    <div className="text-xs text-foreground/60">MRN: {p.mrn} • {p.phone || 'Pas de téléphone'}</div>
                  </button>
                ))}
              </div>
            )}

            {targetPatient && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-foreground">{targetPatient.first_name} {targetPatient.last_name}</div>
                  <button onClick={() => setTargetId(null)} className="text-xs text-primary hover:underline">Changer</button>
                </div>
                <div className="text-sm text-foreground/70 space-y-1">
                  <p>MRN: <span className="font-medium">{targetPatient.mrn}</span></p>
                  <p>Né(e) le: {new Date(targetPatient.date_of_birth).toLocaleDateString('fr-FR')}</p>
                  <p>Contact: {targetPatient.phone || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleMerge}
          disabled={!sourceId || !targetId || sourceId === targetId || isMerging}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMerging ? 'Fusion en cours...' : 'Confirmer la fusion'}
        </button>
      </div>
    </div>
  );
}
