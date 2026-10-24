import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadComponentOptions } from '../store/builderStore.js';
import { COMPONENT_SEARCH_DEBOUNCE_MS } from '../constants.js';

export function useSlotOptions({ category, selected, query }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!category) return undefined;
    const selectedIds = Object.entries(selected)
      .filter(([slot, id]) => slot !== category && id)
      .map(([, id]) => id);
    let request;
    const timer = window.setTimeout(() => {
      request = dispatch(loadComponentOptions({ category, ids: selectedIds, query }));
    }, COMPONENT_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      request?.abort();
    };
  }, [category, dispatch, query, selected]);
}
