import { useState, useCallback, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export function useSortable<K extends string>(initialKey: K, initialDir: SortDirection = 'asc') {
  const [sortState, setSortState] = useState<SortState<K>>({ key: initialKey, direction: initialDir });

  const toggleSort = useCallback((key: K) => {
    setSortState(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  return { sortState, toggleSort };
}

export function useSortedData<T, K extends string>(
  items: T[],
  initialKey: K,
  initialDir: SortDirection = 'asc',
  compareFn: (a: T, b: T, key: K) => number,
) {
  const { sortState, toggleSort } = useSortable<K>(initialKey, initialDir);

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const cmp = compareFn(a, b, sortState.key);
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, sortState, compareFn]);

  return { sorted, sortState, toggleSort };
}
