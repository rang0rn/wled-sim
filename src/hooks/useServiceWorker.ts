import { useEffect, useRef } from 'react';
import { useWledStore } from '../store/wledStore';

export function useServiceWorker() {
  const { handleApiRequest, swUrl, setSwRegistered } = useWledStore();
  const urlRef = useRef(swUrl);
  urlRef.current = swUrl;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[WLED Sim] Service Worker registered', reg.scope);
        setSwRegistered(true);

        // Tell SW the URL to intercept
        const ctrl = navigator.serviceWorker.controller;
        if (ctrl) {
          ctrl.postMessage({ type: 'set-url', url: urlRef.current });
        }

        // When SW activates (after a reload), send the URL again
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              worker.postMessage({ type: 'set-url', url: urlRef.current });
            }
          });
        });
      })
      .catch((err) => console.error('[WLED Sim] SW registration failed', err));
  }, [setSwRegistered]);

  // Re-send URL when swUrl changes
  useEffect(() => {
    const ctrl = navigator.serviceWorker?.controller;
    if (ctrl) {
      ctrl.postMessage({ type: 'set-url', url: swUrl });
    }
  }, [swUrl]);

  // Send URL when a new SW becomes active (page refresh scenario)
  useEffect(() => {
    const handleControllerChange = () => {
      const ctrl = navigator.serviceWorker?.controller;
      if (ctrl) {
        ctrl.postMessage({ type: 'set-url', url: urlRef.current });
      }
    };
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  // Handle incoming API requests from the SW
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'wled-request') return;

      const { id, method, url, pathname, search, body, startTime } = event.data;

      const result = handleApiRequest({ id, method, url, pathname, search, body, startTime });

      // Reply to SW
      navigator.serviceWorker.controller?.postMessage({
        type: 'wled-response',
        id,
        body: result.response,
        status: result.status,
      });
    };

    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [handleApiRequest]);
}
