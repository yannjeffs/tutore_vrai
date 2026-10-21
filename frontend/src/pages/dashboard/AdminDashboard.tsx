import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardStats } from '../../services/dashboard';
import { 
  Banknote, AlertTriangle, Users, CalendarDays, 
  BedDouble, Activity, RefreshCcw, ArrowUpRight, Calendar
} from 'lucide-react';

export default function AdminDashboard() {
  const [period, setPeriod] = useState('today');
  
  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-dashboard-stats', period],
    queryFn: () => getAdminDashboardStats(period),
    refetchInterval: 60000 // Refresh every minute
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Chargement des données financières...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble des performances financières et opérationnelles</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-700 shadow-sm appearance-none outline-none"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>
          <button 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Revenus du Jour */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-green-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Banknote className="h-24 w-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-green-50 font-medium mb-4">
              <Activity className="h-5 w-5" />
              Revenus ({period === 'today' ? "Aujourd'hui" : period === 'week' ? 'Cette semaine' : period === 'month' ? 'Ce mois' : 'Cette année'})
            </div>
            <div className="text-4xl font-black tracking-tight">
              {formatCurrency(stats?.finances?.period_revenue || 0)}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-green-100 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              <ArrowUpRight className="h-4 w-4" /> En temps réel
            </div>
          </div>
        </div>

        {/* Dettes (Créances) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-red-500">
            <AlertTriangle className="h-24 w-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-500 font-semibold mb-4">
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              Créances (Dettes Impayées)
            </div>
            <div className="text-4xl font-black tracking-tight text-slate-800">
              {formatCurrency(stats?.finances?.outstanding_debt || 0)}
            </div>
            <div className="mt-4 text-sm font-medium text-slate-500">
              Cumul total des patients
            </div>
          </div>
        </div>

        {/* Revenus Totaux */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-500 font-semibold mb-4">
              <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                <Banknote className="h-4 w-4" />
              </div>
              Chiffre d'Affaires Global
            </div>
            <div className="text-4xl font-black tracking-tight text-slate-800">
              {formatCurrency(stats?.finances?.total_revenue || 0)}
            </div>
            <div className="mt-4 text-sm font-medium text-slate-500">
              Toutes périodes confondues
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Nvx Patients (Période)</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">{stats?.patients?.new_period || 0}</h3>
              <span className="text-xs font-medium text-slate-400 mb-1">/ {stats?.patients?.total || 0} total</span>
            </div>
          </div>
        </div>

        {/* Consultations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Consultations (Période)</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">{stats?.consultations?.period || 0}</h3>
              <span className="text-xs font-medium text-slate-400 mb-1">actes réalisés</span>
            </div>
          </div>
        </div>

        {/* Hospitalisation */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
            <BedDouble className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-500 flex justify-between">
              Occupation Lits
              <span className="text-orange-600 font-bold">{stats?.hospitalization?.occupancy_rate || 0}%</span>
            </p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${stats?.hospitalization?.occupancy_rate || 0}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-400 mt-2">
              {stats?.hospitalization?.occupied_beds || 0} occupés sur {stats?.hospitalization?.total_beds || 0}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
