'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav, MobileMenuButton } from './MobileNav';
import { Center, User } from '@/types/database';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface CenterContextType {
  selectedCenterId: string | null;
  centers: Center[];
  user: User;
}

const CenterContext = createContext<CenterContextType | null>(null);

export function useCenterContext() {
  const context = useContext(CenterContext);
  if (!context) {
    throw new Error('useCenterContext must be used within DashboardLayout');
  }
  return context;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, centers, isLoading, signOut } = useAuth();
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (centers.length > 0 && !selectedCenterId) {
      // Default to first center, or 'all' for super admin
      setSelectedCenterId(user?.role === 'super_admin' ? 'all' : centers[0].id);
    }
  }, [centers, selectedCenterId, user?.role]);

  // Store selected center in sessionStorage
  useEffect(() => {
    if (selectedCenterId) {
      sessionStorage.setItem('selectedCenterId', selectedCenterId);
    }
  }, [selectedCenterId]);

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedCenterId');
    if (stored) {
      // Validate stored center ID is valid for this user
      const isValid =
        (stored === 'all' && user?.role === 'super_admin') ||
        centers.some((c) => c.id === stored);
      if (isValid) {
        setSelectedCenterId(stored);
      } else {
        sessionStorage.removeItem('selectedCenterId');
      }
    }
  }, [centers, user?.role]);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Not authenticated</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {/* Mobile Nav */}
      <MobileNav
        user={user}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          centers={centers}
          selectedCenterId={selectedCenterId}
          onCenterChange={setSelectedCenterId}
          onSignOut={signOut}
          onMenuClick={() => setIsMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <CenterContext.Provider value={{ selectedCenterId, centers, user }}>
            {children}
          </CenterContext.Provider>
        </main>
      </div>
    </div>
  );
}
