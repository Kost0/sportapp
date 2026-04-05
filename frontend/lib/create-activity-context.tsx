import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Sport types matching database CHECK constraint
export type SportType = 
  | 'football'
  | 'basketball'
  | 'volleyball'
  | 'tennis'
  | 'badminton'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'parkour'
  | 'other';

export type CreateActivityData = {
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
  sport: null,
  title: '',
  description: '',
  date: null,
  time: '18:00',
  address: '',
  lat: 55.7558,
  lon: 37.6173,
  maxParticipants: 10,
  imageUri: null,
};

const CreateActivityContext = createContext<CreateActivityContextType | null>(null);

export function CreateActivityProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CreateActivityData>(initialData);

  const updateData = (updates: Partial<CreateActivityData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(initialData);
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
