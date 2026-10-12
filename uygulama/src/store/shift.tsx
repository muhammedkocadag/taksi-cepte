import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { deleteEntryRow, loadShifts, saveEntry, saveShift } from './db';

// Kayıtlar telefon içindeki SQLite veritabanında kalıcı. Firebase gelince buluta eşitlenecek.

export type Category = 'Nakit' | 'POS' | 'Uygulama' | 'Yakıt' | 'Yemek' | 'Diğer';
export const INCOME: Category[] = ['Nakit', 'POS', 'Uygulama'];
export const EXPENSE: Category[] = ['Yakıt', 'Yemek', 'Diğer'];
export const isIncome = (c: Category) => INCOME.includes(c);

export type Entry = { id: string; at: number; category: Category; amount: number };
export type Shift = { id: string; start: number; end: number | null; km: number | null; entries: Entry[] };

export type Totals = {
  revenue: number;
  expense: number;
  net: number;
  trips: number;
  byCategory: Record<Category, number>;
};

export function totals(shift: Shift | null): Totals {
  const byCategory = { Nakit: 0, POS: 0, Uygulama: 0, Yakıt: 0, Yemek: 0, Diğer: 0 } as Record<Category, number>;
  let revenue = 0;
  let expense = 0;
  let trips = 0;
  for (const e of shift?.entries ?? []) {
    byCategory[e.category] += e.amount;
    if (isIncome(e.category)) {
      revenue += e.amount;
      trips++;
    } else expense += e.amount;
  }
  return { revenue, expense, net: revenue - expense, trips, byCategory };
}

type ShiftValue = {
  current: Shift | null;
  past: Shift[];
  startShift: () => void;
  endShift: (km: number | null) => Shift | null;
  addEntry: (category: Category, amount: number) => Entry | null;
  updateEntry: (id: string, patch: Pick<Entry, 'category' | 'amount'>) => void;
  deleteEntry: (id: string) => void;
};

// Bir kaydı hangi vardiyada olursa olsun (açık ya da geçmiş) değiştirir.
const mapEntries = (s: Shift, fn: (entries: Entry[]) => Entry[]): Shift => {
  const entries = fn(s.entries);
  return entries === s.entries ? s : { ...s, entries };
};

const ShiftContext = createContext<ShiftValue | null>(null);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  // Açılışta bütün vardiyalar veritabanından okunur; bitmemiş olan açık vardiyadır.
  const [initial] = useState(() => loadShifts(db));
  const [current, setCurrent] = useState<Shift | null>(() => initial.find((s) => s.end === null) ?? null);
  const [past, setPast] = useState<Shift[]>(() => initial.filter((s) => s.end !== null));

  const startShift = useCallback(() => {
    if (current) return;
    const s: Shift = { id: newId(), start: Date.now(), end: null, km: null, entries: [] };
    saveShift(db, s);
    setCurrent(s);
  }, [current, db]);

  const endShift = useCallback(
    (km: number | null) => {
      if (!current) return null;
      const done = { ...current, end: Date.now(), km };
      saveShift(db, done);
      setPast((p) => [done, ...p]);
      setCurrent(null);
      return done;
    },
    [current, db],
  );

  const addEntry = useCallback(
    (category: Category, amount: number) => {
      if (!current || amount <= 0) return null;
      const e: Entry = { id: newId(), at: Date.now(), category, amount };
      saveEntry(db, current.id, e);
      setCurrent((s) => (s ? { ...s, entries: [...s.entries, e] } : s));
      return e;
    },
    [current, db],
  );

  const editAll = useCallback((fn: (entries: Entry[]) => Entry[]) => {
    setCurrent((s) => (s ? mapEntries(s, fn) : s));
    setPast((p) => p.map((s) => mapEntries(s, fn)));
  }, []);

  const updateEntry = useCallback(
    (id: string, patch: Pick<Entry, 'category' | 'amount'>) => {
      const shift = [current, ...past].find((s) => s?.entries.some((e) => e.id === id));
      const entry = shift?.entries.find((e) => e.id === id);
      if (!shift || !entry) return;
      saveEntry(db, shift.id, { ...entry, ...patch });
      editAll((es) => (es.some((e) => e.id === id) ? es.map((e) => (e.id === id ? { ...e, ...patch } : e)) : es));
    },
    [current, past, db, editAll],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      deleteEntryRow(db, id);
      editAll((es) => (es.some((e) => e.id === id) ? es.filter((e) => e.id !== id) : es));
    },
    [db, editAll],
  );

  const value = useMemo(
    () => ({ current, past, startShift, endShift, addEntry, updateEntry, deleteEntry }),
    [current, past, startShift, endShift, addEntry, updateEntry, deleteEntry],
  );
  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const v = useContext(ShiftContext);
  if (!v) throw new Error('useShift ShiftProvider içinde kullanılmalı');
  return v;
}
