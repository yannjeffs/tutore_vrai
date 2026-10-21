import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserX, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createPatient } from '../../services/patients';

export default function PatientCreateProvisionalPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      gender: 'M',
      blood_group: '',
      provisional_description: '',
    }
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      navigate('/patients');
    },
  });

  const onSubmit = (data: any) => {
    const provisionalData = {
      is_provisional: true,
      first_name: 'Inconnu',
      last_name: 'Patient',
      date_of_birth: null,
      gender: data.gender,
      blood_group: data.blood_group,
      provisional_description: data.provisional_description,
      payment_type: 'CASH', // Default since they don't have insurance card
      emergency_contacts: [],
      allergies: [],
      antecedents: []
    };
    mutation.mutate(provisionalData);
  };

  const inputClasses = "mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all";
  const labelClasses = "block text-sm font-medium text-foreground";
  const cardClasses = "bg-card text-card-foreground p-6 sm:p-8 rounded-xl shadow-sm border border-border";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/patients')}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <UserX className="h-6 w-6 text-warning" />
              Admission Patient Inconnu
            </h1>
            <p className="text-sm text-foreground/70">Création d'un dossier médical provisoire</p>
          </div>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm text-warning-foreground">
          <p className="font-semibold mb-1">Attention</p>
          <p>Ce formulaire est réservé aux patients arrivant aux urgences sans pièces d'identité et dans l'incapacité de communiquer (inconscients, confus, etc.). Le dossier sera marqué comme provisoire et devra être mis à jour ou fusionné plus tard.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className={cardClasses}>
          <h3 className="text-lg font-bold text-primary border-b border-border pb-2 mb-6">Informations Visuelles</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Sexe Apparent</label>
                <select {...register('gender')} className={inputClasses}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Groupe Sanguin (si connu via carte urgence)</label>
                <select {...register('blood_group')} className={inputClasses}>
                  <option value="">Non renseigné</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Description physique détaillée *</label>
              <textarea 
                {...register('provisional_description', { required: true })} 
                className={inputClasses} 
                rows={5}
                placeholder="Ex: Homme, environ 40-50 ans, teint clair, tatouage sur l'avant-bras droit en forme d'ancre, portant un t-shirt bleu et un jean noir. Cicatrice au sourcil gauche." 
              />
              {errors.provisional_description && <span className="text-destructive text-xs mt-1 block">Ce champ est obligatoire pour l'identification future.</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 bg-background p-4 rounded-xl border border-border shadow-sm">
          <button type="button" onClick={() => navigate('/patients')} className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-secondary transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 shadow-md flex items-center gap-2 disabled:opacity-70 transition-colors">
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Création...' : 'Créer le dossier provisoire'}
          </button>
        </div>
      </form>
    </div>
  );
}
