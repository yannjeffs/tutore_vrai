import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createPatient } from '../../services/patients';

export default function PatientCreatePage() {
  const navigate = useNavigate();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      emergency_contacts: [],
      allergies: [],
      antecedents: []
    }
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: "emergency_contacts"
  });

  const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
    control,
    name: "allergies"
  });

  const { fields: antecedentFields, append: appendAntecedent, remove: removeAntecedent } = useFieldArray({
    control,
    name: "antecedents"
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (data: any) => {
      // Si l'API retourne l'objet patient avec son ID, on redirige vers son dossier pour pouvoir l'enregistrer (Visite)
      if (data && data.id) {
        navigate(`/patients/${data.id}`);
      } else {
        navigate('/patients');
      }
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const inputClasses = "mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all";
  const labelClasses = "block text-sm font-medium text-foreground";
  const sectionTitleClasses = "text-lg font-bold text-primary border-b border-border pb-2 mb-4";
  const cardClasses = "bg-card text-card-foreground p-6 sm:p-8 rounded-xl shadow-sm border border-border";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/patients')}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Nouveau Patient</h1>
            <p className="text-sm text-foreground/70">Dossier médical électronique</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Informations Personnelles */}
        <div className={cardClasses}>
          <h3 className={sectionTitleClasses}>Informations Personnelles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className={labelClasses}>Prénom *</label>
              <input {...register('first_name', { required: true })} className={inputClasses} placeholder="Jean" />
              {errors.first_name && <span className="text-destructive text-xs mt-1 block">Ce champ est requis</span>}
            </div>
            <div>
              <label className={labelClasses}>Nom *</label>
              <input {...register('last_name', { required: true })} className={inputClasses} placeholder="Dupont" />
            </div>
            <div>
              <label className={labelClasses}>Date de naissance *</label>
              <input type="date" {...register('date_of_birth', { required: true })} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Sexe *</label>
              <select {...register('gender', { required: true })} className={inputClasses}>
                <option value="">Sélectionner</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Groupe Sanguin</label>
              <select {...register('blood_group')} className={inputClasses}>
                <option value="">Non renseigné</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Numéro CNI / Passeport</label>
              <input {...register('national_id')} className={inputClasses} placeholder="123456789" />
            </div>
            <div>
              <label className={labelClasses}>Profession</label>
              <input {...register('occupation')} className={inputClasses} placeholder="Enseignant" />
            </div>
            <div>
              <label className={labelClasses}>Statut Matrimonial</label>
              <select {...register('marital_status')} className={inputClasses}>
                <option value="">Sélectionner</option>
                <option value="C">Célibataire</option>
                <option value="M">Marié(e)</option>
                <option value="D">Divorcé(e)</option>
                <option value="V">Veuf/Veuve</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Type de Couverture *</label>
              <select {...register('payment_type', { required: true })} className={inputClasses}>
                <option value="CASH">Privé (Cash)</option>
                <option value="INSURANCE">Assurance / Prise en charge</option>
              </select>
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className={cardClasses}>
          <h3 className={sectionTitleClasses}>Coordonnées</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Téléphone</label>
              <input {...register('phone')} className={inputClasses} placeholder="+237 6..." />
            </div>
            <div>
              <label className={labelClasses}>Email</label>
              <input type="email" {...register('email')} className={inputClasses} placeholder="patient@email.com" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClasses}>Adresse Physique</label>
              <input {...register('address')} className={inputClasses} placeholder="Quartier, Rue..." />
            </div>
            <div>
              <label className={labelClasses}>Ville</label>
              <input {...register('city')} className={inputClasses} placeholder="Douala" />
            </div>
          </div>
        </div>

        {/* Contacts d'Urgence */}
        <div className={cardClasses}>
          <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
            <h3 className="text-lg font-bold text-primary">Contacts d'Urgence</h3>
            <button type="button" onClick={() => appendContact({ name: '', relationship: '', phone: '', email: '' })} className="text-sm text-accent hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {contactFields.length === 0 && <p className="text-sm text-foreground/50 italic">Aucun contact d'urgence ajouté.</p>}
          <div className="space-y-4">
            {contactFields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-secondary/30 p-4 rounded-lg">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Nom complet</label>
                  <input {...register(`emergency_contacts.${index}.name` as const, { required: true })} className={inputClasses} />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Relation</label>
                  <input {...register(`emergency_contacts.${index}.relationship` as const, { required: true })} className={inputClasses} placeholder="Ex: Conjoint, Frère" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Téléphone</label>
                  <input {...register(`emergency_contacts.${index}.phone` as const, { required: true })} className={inputClasses} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Email</label>
                  <input type="email" {...register(`emergency_contacts.${index}.email` as const)} className={inputClasses} />
                </div>
                <div className="sm:col-span-1 flex justify-end pb-2">
                  <button type="button" onClick={() => removeContact(index)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className={cardClasses}>
          <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
            <h3 className="text-lg font-bold text-primary">Allergies</h3>
            <button type="button" onClick={() => appendAllergy({ allergen: '', severity: 'LOW', reaction: '', identified_date: '' })} className="text-sm text-accent hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {allergyFields.length === 0 && <p className="text-sm text-foreground/50 italic">Aucune allergie ajoutée.</p>}
          <div className="space-y-4">
            {allergyFields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-secondary/30 p-4 rounded-lg">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Allergène</label>
                  <input {...register(`allergies.${index}.allergen` as const, { required: true })} className={inputClasses} placeholder="Ex: Pénicilline" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Sévérité</label>
                  <select {...register(`allergies.${index}.severity` as const)} className={inputClasses}>
                    <option value="LOW">Faible</option>
                    <option value="MODERATE">Modérée</option>
                    <option value="HIGH">Sévère</option>
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Réaction</label>
                  <input {...register(`allergies.${index}.reaction` as const)} className={inputClasses} placeholder="Description de la réaction..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Date identification</label>
                  <input type="date" {...register(`allergies.${index}.identified_date` as const)} className={inputClasses} />
                </div>
                <div className="sm:col-span-1 flex justify-end pb-2">
                  <button type="button" onClick={() => removeAllergy(index)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Antécédents */}
        <div className={cardClasses}>
          <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
            <h3 className="text-lg font-bold text-primary">Antécédents Médicaux</h3>
            <button type="button" onClick={() => appendAntecedent({ type: 'MEDICAL', condition: '', description: '', diagnosis_date: '', is_active: true })} className="text-sm text-accent hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {antecedentFields.length === 0 && <p className="text-sm text-foreground/50 italic">Aucun antécédent ajouté.</p>}
          <div className="space-y-4">
            {antecedentFields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-secondary/30 p-4 rounded-lg">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Type</label>
                  <select {...register(`antecedents.${index}.type` as const)} className={inputClasses}>
                    <option value="MEDICAL">Médical</option>
                    <option value="SURGICAL">Chirurgical</option>
                    <option value="FAMILY">Familial</option>
                    <option value="OBSTETRIC">Obstétrique</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Condition / Maladie</label>
                  <input {...register(`antecedents.${index}.condition` as const, { required: true })} className={inputClasses} placeholder="Ex: Diabète Type 2" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Description</label>
                  <input {...register(`antecedents.${index}.description` as const)} className={inputClasses} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Date diagnostic</label>
                  <input type="date" {...register(`antecedents.${index}.diagnosis_date` as const)} className={inputClasses} />
                </div>
                <div className="sm:col-span-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground/70 pb-3">
                    <input type="checkbox" {...register(`antecedents.${index}.is_active` as const)} className="rounded text-primary focus:ring-primary h-4 w-4" />
                    Actif
                  </label>
                </div>
                <div className="sm:col-span-1 flex justify-end pb-2">
                  <button type="button" onClick={() => removeAntecedent(index)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-4 z-10 flex justify-end gap-3 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-sm">
          <button type="button" onClick={() => navigate('/patients')} className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-secondary transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 shadow-md flex items-center gap-2 disabled:opacity-70 transition-colors">
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer le dossier'}
          </button>
        </div>
      </form>
    </div>
  );
}
