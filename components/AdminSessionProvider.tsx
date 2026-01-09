'use client';

import { createContext, useContext, useState } from 'react';

type AdminSession = {
  adminUnlocked: boolean;
  adminPassword: string;
  setAdminUnlocked: (value: boolean) => void;
  setAdminPassword: (value: string) => void;
  clearAdminSession: () => void;
};

const AdminSessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const clearAdminSession = () => {
    setAdminUnlocked(false);
    setAdminPassword('');
  };

  return (
    <AdminSessionContext.Provider value={{
      adminUnlocked,
      adminPassword,
      setAdminUnlocked,
      setAdminPassword,
      clearAdminSession,
    }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
  return ctx;
}
