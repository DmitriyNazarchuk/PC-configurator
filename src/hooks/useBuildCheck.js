import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkBuild } from '../store/builderStore.js';
import { BUILD_CHECK_DEBOUNCE_MS } from '../constants.js';

export function useBuildCheck({ selected, loading }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (loading) return undefined;
    const productIds = Object.values(selected).filter(Boolean);
    if (!productIds.length) return undefined;

    let request;
    const timer = window.setTimeout(() => {
      request = dispatch(checkBuild(productIds));
    }, BUILD_CHECK_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      request?.abort();
    };
  }, [dispatch, loading, selected]);
}
