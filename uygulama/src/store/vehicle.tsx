import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { loadVehicle, saveVehicle, type Vehicle } from './db';

export type { Vehicle };

type VehicleValue = {
  vehicle: Vehicle | null;
  save: (v: Vehicle) => void;
  update: (patch: Partial<Vehicle>) => void;
  addKm: (km: number) => void; // vardiya sonunda girilen km göstergeye eklenir
};

const VehicleContext = createContext<VehicleValue | null>(null);

export function VehicleProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [vehicle, setVehicle] = useState<Vehicle | null>(() => loadVehicle(db));

  const save = useCallback(
    (v: Vehicle) => {
      saveVehicle(db, v);
      setVehicle(v);
    },
    [db],
  );

  const update = useCallback(
    (patch: Partial<Vehicle>) => {
      if (vehicle) save({ ...vehicle, ...patch });
    },
    [vehicle, save],
  );

  const addKm = useCallback(
    (km: number) => {
      if (vehicle && km > 0) save({ ...vehicle, odo: vehicle.odo + km, odoAt: Date.now() });
    },
    [vehicle, save],
  );

  const value = useMemo(() => ({ vehicle, save, update, addKm }), [vehicle, save, update, addKm]);
  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicle() {
  const v = useContext(VehicleContext);
  if (!v) throw new Error('useVehicle VehicleProvider içinde kullanılmalı');
  return v;
}
