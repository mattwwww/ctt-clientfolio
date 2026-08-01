const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env?.ASSETS?.fetch) {
      return new Response('Asset binding is not configured.', { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes('.')) return response;

    const indexUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(indexUrl, { method: 'GET', headers: request.headers }));
  }
};

export default worker;
