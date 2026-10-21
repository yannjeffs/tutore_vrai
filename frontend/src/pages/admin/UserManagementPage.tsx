import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserPlus, Search, Edit2, Trash2, Mail, Phone, Activity } from 'lucide-react';
import { getStaffList, createStaff, updateStaff, deleteStaff } from '../../services/staff';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaffList()
  });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Clean up empty fields
    if (!data.password) delete data.password;

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const filteredStaff = staffList?.filter(s => 
    s.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Gestion des Utilisateurs & Rôles
          </h1>
          <p className="text-sm text-slate-500 mt-1">Administration du personnel de la clinique</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <UserPlus className="h-5 w-5" />
          Nouvel Utilisateur
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher par nom, nom d'utilisateur, rôle..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-sm"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Employé</th>
                <th className="px-6 py-4">Nom d'utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : filteredStaff.map(staff => (
                <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                        {staff.user.first_name?.[0]}{staff.user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{staff.user.first_name} {staff.user.last_name}</p>
                        <p className="text-xs text-slate-500">{staff.employee_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">@{staff.user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      staff.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      staff.role === 'doctor' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      staff.role === 'nurse' ? 'bg-teal-100 text-teal-700 border-teal-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {staff.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      {staff.user.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {staff.user.email}</span>}
                      {staff.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {staff.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {staff.user.is_active ? (
                      <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span> Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 font-medium text-xs">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span> Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(staff)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {/* Optional Delete Button */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingUser ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom *</label>
                  <input type="text" name="first_name" defaultValue={editingUser?.user?.first_name} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nom *</label>
                  <input type="text" name="last_name" defaultValue={editingUser?.user?.last_name} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nom d'utilisateur (Login) *</label>
                  <input type="text" name="username" defaultValue={editingUser?.user?.username} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe {editingUser && '(Optionnel)'}</label>
                  <input type="password" name="password" required={!editingUser} placeholder={editingUser ? "Laisser vide pour ne pas changer" : "Meditek2026!"} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Rôle *</label>
                  <select name="role" defaultValue={editingUser?.role || 'receptionist'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="doctor">Médecin</option>
                    <option value="nurse">Infirmier(e)</option>
                    <option value="receptionist">Réceptionniste</option>
                    <option value="lab_tech">Technicien Labo</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Titre (ex: Pédiatre, Chef de salle)</label>
                  <input type="text" name="title" defaultValue={editingUser?.title} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" name="email" defaultValue={editingUser?.user?.email} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input type="text" name="phone" defaultValue={editingUser?.phone} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
