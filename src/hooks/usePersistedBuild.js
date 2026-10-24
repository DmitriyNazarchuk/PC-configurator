import { useEffect } from 'react';

export function usePersistedBuild({ selected, loading, canPersistSelection }) {
  useEffect(() => {
    if (loading || !canPersistSelection) return;
    try {
      window.localStorage.setItem('buildlab', JSON.stringify(selected));
    } catch (error) {
      console.warn('Could not save the current build:', error);
    }
  }, [canPersistSelection, loading, selected]);
}
