import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Archive, Search, FileText, Calendar, RotateCcw } from 'lucide-react';
import { getPatients, toggleArchivePatient } from '../../services/patients';

export default function ArchivedRecordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { search: searchTerm, is_archived: 'true' }],
    queryFn: () => getPatients({ search: searchTerm, is_archived: 'true' })
  });

  const handleUnarchive = async (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir désarchiver le dossier de ${name} ?`)) {
      try {
        await toggleArchivePatient(id, false);
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      } catch (error) {
        console.error("Erreur lors du désarchivage:", error);
        alert("Une erreur s'est produite lors du désarchivage.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archives Médicales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consultez les dossiers médicaux archivés.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher dans les archives (nom, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Date d'archivage</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Chargement des archives...
                    </div>
                  </td>
                </tr>
              ) : data?.results?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Archive className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Aucune archive trouvée</h3>
                    <p className="text-sm text-slate-500">
                      {searchTerm ? 'Aucun patient archivé ne correspond à votre recherche.' : 'Il n\'y a aucun dossier archivé dans le système.'}
                    </p>
                  </td>
                </tr>
              ) : (
                data?.results?.map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold">
                          {patient.first_name[0]}{patient.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{patient.first_name} {patient.last_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {patient.mrn}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{patient.phone || 'Non renseigné'}</p>
                      <p className="text-xs text-slate-400">{patient.city || 'Ville non renseignée'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {patient.archived_at ? new Date(patient.archived_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Voir le dossier"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleUnarchive(patient.id, `${patient.first_name} ${patient.last_name}`)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Désarchiver"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
