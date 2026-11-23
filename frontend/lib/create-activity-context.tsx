import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';

import type { SportType } from '@/constants/sports';
export type { SportType } from '@/constants/sports';

export type CreateActivityData = {
  requestId: string;
  sport: SportType | null;
  title: string;
  description: string;
  date: Date | null;
  time: string;
  address: string;
  lat: number;
  lon: number;
  maxParticipants: number;
  imageUri: string | null;
};

type CreateActivityContextType = {
  data: CreateActivityData;
  updateData: (updates: Partial<CreateActivityData>) => void;
  resetData: () => void;
};

const initialData: CreateActivityData = {
  requestId: '',
  sport: null,
  title: '',
  description: '',
  date: null,
  time: '18:00',
  address: '',
  lat: 0,
  lon: 0,
  maxParticipants: 10,
  imageUri: null,
};

const CreateActivityContext = createContext<CreateActivityContextType | null>(null);

export function CreateActivityProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CreateActivityData>(() => ({ ...initialData, requestId: randomUUID() }));

  const updateData = (updates: Partial<CreateActivityData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData({ ...initialData, requestId: randomUUID() });
  };

  return (
    <CreateActivityContext.Provider value={{ data, updateData, resetData }}>
      {children}
    </CreateActivityContext.Provider>
  );
}

export function useCreateActivity() {
  const context = useContext(CreateActivityContext);
  if (!context) {
    throw new Error('useCreateActivity must be used within CreateActivityProvider');
  }
  return context;
}
