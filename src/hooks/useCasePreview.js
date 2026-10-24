import { useLayoutEffect, useState } from 'react';
import { BYTES_PER_MEGABYTE } from '../constants.js';

function getInitialMessage(selectedCase, modelUrl) {
  if (!selectedCase) return 'Choose a case to see its 3D model.';
  if (selectedCase.previewable === false) {
    return `This model is ${selectedCase.modelSizeMB} MB and needs optimization.`;
  }
  if (!modelUrl) return 'No 3D model is assigned to this case.';
  return 'Preparing 3D model…';
}

export function useCasePreview(canvasRef, selectedCase, modelUrl) {
  const [preview, setPreview] = useState({ status: 'idle', message: '' });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    if (!selectedCase || selectedCase.previewable === false || !modelUrl) {
      setPreview({ status: 'idle', message: getInitialMessage(selectedCase, modelUrl) });
      return undefined;
    }

    let active = true;
    let dispose = () => {};
    setPreview({ status: 'loading', message: 'Preparing 3D model…' });

    import('../pc-preview.js')
      .then(({ mountPCPreview }) => {
        if (!active) return;
        dispose = mountPCPreview(canvas, modelUrl, {
          onProgress: ({ loaded, total, percent }) => {
            if (!active) return;
            const loadedMb = (loaded / BYTES_PER_MEGABYTE).toFixed(1);
            const totalMb = total ? ` / ${(total / BYTES_PER_MEGABYTE).toFixed(1)} MB` : '';
            const progress = percent === null ? '' : ` · ${percent}%`;
            setPreview({
              status: 'loading',
              message: `Loading 3D model · ${loadedMb} MB${totalMb}${progress}`,
            });
          },
          onLoaded: () => {
            if (active) setPreview({ status: 'ready', message: '' });
          },
          onError: () => {
            if (active) {
              setPreview({ status: 'error', message: 'Could not load this 3D model.' });
            }
          },
        });
      })
      .catch((error) => {
        console.error('Could not start the 3D viewer:', error);
        if (active) {
          setPreview({
            status: 'error',
            message: 'Could not start the 3D viewer. Reload the page.',
          });
        }
      });

    return () => {
      active = false;
      dispose();
    };
  }, [canvasRef, modelUrl, selectedCase?.id, selectedCase?.previewable, selectedCase?.modelSizeMB]);

  return preview;
}
