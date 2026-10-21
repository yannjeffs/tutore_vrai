import React, { useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { 
  Users, Calendar, FileText, Settings, LogOut, 
  Menu, X, Activity, Bell, Search, UserCircle, Stethoscope, FlaskConical, CreditCard, Bed, Syringe, Archive, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user, logout, hasRole } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const rawNavigation = [
    { name: 'Tableau de bord', href: '/', icon: Activity, roles: ['doctor', 'nurse', 'receptionist', 'lab_tech', 'admin'] },
    { name: 'File Triage', href: '/triage', icon: Activity, roles: ['nurse', 'doctor'] },
    { name: 'Patients', href: '/patients', icon: Users, roles: ['receptionist', 'nurse', 'doctor', 'admin'] },
    { name: 'Consultations', href: '/consultations', icon: Stethoscope, roles: ['doctor'] },
    { name: 'Laboratoire', href: '/laboratory', icon: FlaskConical, roles: ['lab_tech', 'doctor'] },
    { name: 'Soins Infirmiers', href: '/soins-infirmiers', icon: Syringe, roles: ['nurse', 'doctor', 'admin'] },
    { name: 'Hospitalisation', href: '/hospitalisation', icon: Bed, roles: ['doctor', 'nurse', 'admin'] },
    { name: 'Caisse', href: '/caisse', icon: CreditCard, roles: ['receptionist', 'nurse', 'admin'] },
    { name: 'Rendez-vous', href: '/appointments', icon: Calendar, roles: ['receptionist', 'nurse', 'doctor'] },
    { name: 'Archives', href: '/archives', icon: Archive, roles: ['doctor', 'admin'] },
    { name: 'Gestion Utilisateurs', href: '/admin/users', icon: ShieldCheck, roles: ['admin'] },
  ];

  const navigation = rawNavigation.filter(item => {
    // If we have roles defined on the item, check them
    if (item.roles) {
      return hasRole(item.roles);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 shadow-xl flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-white">MediTek</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-800 z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">MediTek</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
          <nav className="flex-1 px-4 space-y-1.5">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className={`h-5 w-5 ${location.pathname === item.href ? 'text-primary-foreground' : 'text-slate-400'}`} />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 mt-auto">
            <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center shadow-sm">
                  {/* @ts-ignore */}
                  {user?.avatar_url ? (
                    // @ts-ignore
                    <img src={user.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {/* @ts-ignore */}
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {/* @ts-ignore */}
                    {user?.title || 'Administrateur'}
                  </p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-xl hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4 lg:hidden">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-700"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            {/* Notifications and other top bar items can go here */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
