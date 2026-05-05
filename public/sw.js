// WLED Simulator Service Worker
// Intercepts fetch requests to the configured WLED URL and routes them to the React app.

let wledBaseUrl = null;
const pendingRequests = new Map();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept if a WLED URL is configured and request matches
  if (!wledBaseUrl) return;
  if (!request.url.startsWith(wledBaseUrl)) return;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    );
    return;
  }

  const id = crypto.randomUUID();
  const startTime = Date.now();

  const responsePromise = new Promise(async (resolve) => {
    pendingRequests.set(id, resolve);

    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (_) {}
    }

    const url = new URL(request.url);
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    if (clients.length === 0) {
      pendingRequests.delete(id);
      resolve(jsonResponse({ error: 'WLED Simulator is not open in any tab' }, 503));
      return;
    }

    // Post to the first available client
    clients[0].postMessage({
      type: 'wled-request',
      id,
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      search: url.search,
      body,
      startTime,
    });

    // Timeout after 5s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        resolve(jsonResponse({ error: 'Request timed out' }, 504));
      }
    }, 5000);
  });

  event.respondWith(responsePromise);
});

self.addEventListener('message', (event) => {
  const { data } = event;

  if (data?.type === 'wled-response') {
    const resolve = pendingRequests.get(data.id);
    if (resolve) {
      pendingRequests.delete(data.id);
      const body = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
      resolve(
        new Response(body, {
          status: data.status ?? 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        })
      );
    }
  }

  if (data?.type === 'set-url') {
    wledBaseUrl = data.url || null;
  }
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
