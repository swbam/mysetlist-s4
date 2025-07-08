import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3002';
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api', '');

  try {
    const response = await fetch(`${apiUrl}${apiPath}${url.search}`, {
      method: 'GET',
      headers: Object.fromEntries(request.headers.entries()),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3002';
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api', '');

  try {
    const body = await request.json();
    const response = await fetch(`${apiUrl}${apiPath}${url.search}`, {
      method: 'POST',
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}
