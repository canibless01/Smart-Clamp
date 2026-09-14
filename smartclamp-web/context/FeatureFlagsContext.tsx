import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchActiveFeatureFlags } from '../lib/api';

interface FeatureFlagsContextType {
  activeFlags: string[];
  isFeatureEnabled: (flagKey: string) => boolean;
  refreshFlags: () => Promise<void>;
  loading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  activeFlags: [],
  isFeatureEnabled: () => false,
  refreshFlags: async () => {},
  loading: true,
});

export const FeatureFlagsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeFlags, setActiveFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshFlags = async () => {
    setLoading(true);
    const flags = await fetchActiveFeatureFlags();
    setActiveFlags(flags);
    setLoading(false);
  };

  useEffect(() => {
    refreshFlags();
  }, []);

  const isFeatureEnabled = (flagKey: string): boolean => {
    return activeFlags.includes(flagKey);
  };

  return (
    <FeatureFlagsContext.Provider value={{ activeFlags, isFeatureEnabled, refreshFlags, loading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = (): FeatureFlagsContextType => {
  return useContext(FeatureFlagsContext);
};
