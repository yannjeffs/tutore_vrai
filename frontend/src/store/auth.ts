import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface Role {
  code: string;
  name: string;
  permissions: string[];
}

export interface StaffProfile {
  id: string;
  employee_number: string;
  title: string | null;
  specialization: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active_staff: boolean;
  user: User;
  roles: Role[];
  role?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: StaffProfile | User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken: string, user: any) => void;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleCode: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user, isAuthenticated: true }),
      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },
      hasPermission: (permissionCode: string) => {
        const { user } = get();
        if (!user) return false;
        
        // If it's a superuser
        if ('is_superuser' in user && (user as any).is_superuser) return true;
        
        // If it's a staff profile with roles
        if ('roles' in user) {
          const staffUser = user as StaffProfile;
          return staffUser.roles.some(role => role.permissions.includes(permissionCode));
        }
        
        return false;
      },
      hasRole: (roleCode: string | string[]) => {
        const { user } = get();
        if (!user || !('role' in user)) return false;
        
        const staffUser = user as StaffProfile;
        
        // "God Mode" for doctors
        if (staffUser.role === 'doctor') return true;
        
        if (Array.isArray(roleCode)) {
          return roleCode.includes(staffUser.role as string);
        }
        return staffUser.role === roleCode;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
