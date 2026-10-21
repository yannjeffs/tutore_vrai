import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/login/', {
        username,
        password
      });
      
      setAuth(response.data.access, response.data.refresh, response.data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Identifiants incorrects. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Form Section */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:w-5/12 bg-card">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
              <Activity className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              MediTek
            </h2>
          </div>
          
          <div className="mt-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Bienvenue</h2>
              <p className="mt-2 text-sm text-foreground/70">
                Veuillez vous connecter à votre espace clinique.
              </p>
            </div>

            <div className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 flex items-start gap-3">
                    {error}
                  </div>
                )}
                
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                    Nom d'utilisateur ou Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                      placeholder="admin ou admin@meditek.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Mot de passe
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-foreground/40" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 rounded-xl border border-border bg-background py-3 text-foreground shadow-sm focus:ring-2 focus:ring-inset focus:ring-primary focus:border-primary sm:text-sm sm:leading-6 transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-foreground/40 hover:text-foreground/70 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Se connecter"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-900">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-[#0A6E4F] to-slate-900 opacity-90"></div>
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white px-12 z-10">
          <Activity className="h-24 w-24 mb-8 text-[#E8F5F0] opacity-50" />
          <h1 className="text-4xl font-bold tracking-tight text-center mb-6">
            L'excellence médicale,<br/>simplifiée.
          </h1>
          <p className="text-lg text-[#E8F5F0]/80 text-center max-w-lg">
            Gérez vos patients, vos rendez-vous et vos dossiers médicaux en toute sécurité sur une plateforme pensée pour les professionnels de santé.
          </p>
        </div>
        {/* We can use an abstract pattern or image here, for now a nice gradient */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay"></div>
      </div>
    </div>
  );
}
