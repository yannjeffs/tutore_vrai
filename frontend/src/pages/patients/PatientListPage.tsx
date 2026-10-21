import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatients, deletePatient, createVisit } from '../../services/patients';
import { appointmentService } from '../../services/appointments';
import { Plus, Search, Filter, Eye, Edit, Trash2, UserCircle, Users, X, Calendar, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PatientListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ gender: '', blood_group: '', created_date: '', is_archived: '' });

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', { search: searchTerm, page, ...filters }],
    queryFn: () => getPatients({ search: searchTerm, page, ...filters })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayAppointments } = useQuery({
    queryKey: ['appointments', todayDate],
    queryFn: () => appointmentService.getAll({ date: todayDate, status: 'SCHEDULED' })
  });

  const markPresentMutation = useMutation({
    mutationFn: async (appt: any) => {
      await createVisit({
        patient: appt.patient,
        visit_type: 'normal',
        reason_for_visit: `Rendez-vous : ${appt.reason}`
      });
      await appointmentService.update(appt.id, { status: 'COMPLETED' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      alert("Patient marqué présent ! Une visite a été créée (en attente Triage).");
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le patient ${name} ?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Patients</h1>
          <p className="text-sm text-foreground/70 mt-1">Gérez les dossiers médicaux de vos patients</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link 
            to="/patients/merge"
            className="inline-flex items-center justify-center gap-2 bg-card text-foreground border border-border px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-secondary transition-colors shadow-sm"
          >
            <Users className="h-5 w-5" />
            Fusionner
          </Link>
          <Link 
            to="/patients/new-provisional"
            className="inline-flex items-center justify-center gap-2 bg-warning/10 text-warning border border-warning/20 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-warning/20 transition-colors shadow-sm"
          >
            <UserCircle className="h-5 w-5" />
            Patient Inconnu
          </Link>
          <Link 
            to="/patients/new"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Nouveau Patient
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-foreground/50" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un patient (Nom, ID, Téléphone)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-border bg-card text-foreground rounded-xl focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm shadow-sm transition-all outline-none"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${
              showFilters || filters.gender || filters.blood_group
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-card border-border text-foreground hover:bg-secondary'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres {(filters.gender || filters.blood_group || filters.created_date) && <span className="flex h-2 w-2 rounded-full bg-primary"></span>}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-card border border-border p-4 rounded-xl shadow-sm">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Date d'enregistrement</label>
              <input 
                type="date" 
                value={filters.created_date}
                onChange={(e) => setFilters({ ...filters, created_date: e.target.value })}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Genre</label>
              <select 
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all text-foreground"
              >
                <option value="">Tous</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Groupe Sanguin</label>
              <select 
                value={filters.blood_group}
                onChange={(e) => setFilters({ ...filters, blood_group: e.target.value })}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-primary outline-none"
              >
                <option value="">Tous</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">Statut du dossier</label>
              <select 
                value={filters.is_archived}
                onChange={(e) => setFilters({ ...filters, is_archived: e.target.value })}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-primary outline-none"
              >
                <option value="">Dossiers Actifs</option>
                <option value="true">Dossiers Archivés</option>
                <option value="all">Tous (Actifs + Archivés)</option>
              </select>
            </div>
            <div className="md:col-span-1 flex justify-end">
              <button 
                onClick={() => {
                  setFilters({ gender: '', blood_group: '', created_date: '', is_archived: '' });
                  setSearchTerm('');
                }}
                className="text-sm text-foreground/60 hover:text-foreground transition-colors px-4 py-2 border border-transparent hover:border-border rounded-lg bg-card"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Today's Appointments Panel */}
      {todayAppointments && todayAppointments.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            Rendez-vous Prévus Aujourd'hui ({todayAppointments.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayAppointments.map((appt: any) => (
              <div key={appt.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{appt.patient_name}</h3>
                    <p className="text-xs text-slate-500">Heure: {new Date(appt.appointment_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-semibold">RDV</span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-1">{appt.reason}</p>
                <button 
                  onClick={() => markPresentMutation.mutate(appt)}
                  disabled={markPresentMutation.isPending}
                  className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" /> Marquer Présent
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-destructive">
            Une erreur est survenue lors du chargement des patients.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Patient
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    ID (MRN)
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Âge / Sexe
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border/50 [&>*:nth-child(odd)]:bg-secondary/30 [&>*:nth-child(even)]:bg-card">
                {data?.results.map((patient) => (
                  <tr 
                    key={patient.id} 
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-secondary rounded-full flex items-center justify-center border border-border">
                          <UserCircle className="h-6 w-6 text-foreground/50" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-foreground">
                            {patient.first_name} {patient.last_name}
                            {patient.is_deceased && <span className="ml-2 inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">Décédé</span>}
                            {patient.is_provisional && <span className="ml-2 inline-flex items-center rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning ring-1 ring-inset ring-warning/20">Provisoire</span>}
                          </div>
                          <div className="text-sm text-foreground/60">{patient.city || 'Ville non renseignée'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{patient.mrn}</div>
                      <div className="text-xs text-foreground/60">Créé le {new Date(patient.created_at).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{patient.age !== null ? `${patient.age} ans` : 'Âge inconnu'}</div>
                      <div className="text-sm text-foreground/60">{patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : patient.gender === 'O' ? 'Autre' : 'Sexe inconnu'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/60">
                      {patient.phone || 'Non renseigné'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/patients/${patient.id}`} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Voir">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link to={`/patients/${patient.id}/edit`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(patient.id, `${patient.first_name} ${patient.last_name}`)} 
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" 
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {data?.results.length === 0 && (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-border mb-4" />
                <h3 className="text-lg font-medium text-foreground">Aucun patient trouvé</h3>
                <p className="text-sm text-foreground/70 mt-1">Commencez par ajouter un nouveau patient.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {data && data.results.length > 0 && (
              <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
                <div className="text-sm text-foreground/70">
                  Total : <span className="font-semibold text-foreground">{data.count}</span> patient{data.count > 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={!data.previous}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm font-medium disabled:opacity-50 hover:bg-secondary transition-colors"
                  >
                    Précédent
                  </button>
                  <button 
                    disabled={!data.next}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm font-medium disabled:opacity-50 hover:bg-secondary transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
