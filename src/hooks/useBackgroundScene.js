import { useEffect } from 'react';

export function useBackgroundScene() {
  useEffect(() => {
    let active = true;
    let dispose = () => {};
    let idleId;

    const loadScene = () => {
      import('../background-scene.js')
        .then(({ mountBackgroundScene }) => {
          if (active) dispose = mountBackgroundScene();
        })
        .catch((error) => console.warn('Decorative background unavailable:', error));
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadScene, { timeout: 1800 });
    } else {
      idleId = window.setTimeout(loadScene, 450);
    }

    return () => {
      active = false;
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      dispose();
    };
  }, []);
}
