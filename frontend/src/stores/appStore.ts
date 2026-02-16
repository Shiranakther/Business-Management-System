import { create } from 'zustand';
import type { User, Tenant } from '@/types';

// Extend Tenant interface to match DB or ensure types are aligned
// Assuming types/index.ts defines Tenant. Let's make sure it handles new fields.
// For now, I'll update the store content.
// Ideally, types should be in types/index.ts

interface AppState {
  currentUser: User | null;
  currentTenant: Tenant | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  setCurrentUser: (user: User | null) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null, // Start null to allow ProtectedRoute to populate
  currentTenant: null,
  sidebarOpen: true,
  sidebarCollapsed: false,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
