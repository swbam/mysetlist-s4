import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Validate environment variables
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    });

    // Safely attempt to get user
    try {
      await supabase.auth.getUser();
    } catch (_error) {
      // Continue without user session
    }

    return response;
  } catch (_error) {
    // Return a basic response on error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}
