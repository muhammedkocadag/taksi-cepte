import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { loadVehicle, saveVehicle, type Vehicle } from './db';
import { useProfile } from './profile';

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

  // Buluttan yeni veri gelince (dataVersion artar) veritabanından yeniden okunur.
  const { dataVersion } = useProfile();
  const firstLoad = useRef(true);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setVehicle(loadVehicle(db));
  }, [dataVersion, db]);

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
