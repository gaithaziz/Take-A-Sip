import { NextRequest } from 'next/server';

const BACKEND_URL = (process.env.INTERNAL_API_BASE_URL ?? 'http://127.0.0.1:8000').trim();

async function proxy(request: NextRequest, pathSegments: string[]) {
  try {
    const path = pathSegments.join('/');
    const target = new URL(`${BACKEND_URL}/${path}`);
    target.search = request.nextUrl.search;

    const headers = new Headers();
    const blockedHeaders = new Set([
      'host',
      'content-length',
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ]);
    request.headers.forEach((value, key) => {
      if (blockedHeaders.has(key.toLowerCase())) {
        return;
      }
      headers.set(key, value);
    });

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const body = hasBody ? await request.text() : undefined;

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') {
        return;
      }
      responseHeaders.set(key, value);
    });

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        error: 'proxy_failed',
        message: error instanceof Error ? error.message : 'Unknown proxy error',
        backend_url: BACKEND_URL,
        pathname: request.nextUrl.pathname,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
