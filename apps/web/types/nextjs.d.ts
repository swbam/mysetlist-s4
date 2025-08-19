// Next.js 15 specific types
import type { NextRequest } from "next/server";

declare global {
  // Next.js 15 async params types
  interface PageProps<T extends Record<string, string> = Record<string, string>> {
    params: Promise<T>;
    searchParams?: { [key: string]: string | string[] | undefined };
  }

  interface LayoutProps<T extends Record<string, string> = Record<string, string>> {
    children: React.ReactNode;
    params: Promise<T>;
  }

  interface RouteHandlerProps<T extends Record<string, string> = Record<string, string>> {
    params: Promise<T>;
  }

  // API Route handler types
  interface ApiRouteHandler<T extends Record<string, string> = Record<string, string>> {
    (
      req: NextRequest,
      context: { params: Promise<T> }
    ): Promise<Response> | Response;
  }

  // Metadata generation types
  interface MetadataProps<T extends Record<string, string> = Record<string, string>> {
    params: Promise<T>;
    searchParams?: { [key: string]: string | string[] | undefined };
  }

  // Generate static params types
  interface GenerateStaticParamsReturn<T extends Record<string, string> = Record<string, string>> {
    params: T;
  }
}

// Next.js 15 specific component prop types
export type NextPageProps<T extends Record<string, string> = Record<string, string>> = PageProps<T>;
export type NextLayoutProps<T extends Record<string, string> = Record<string, string>> = LayoutProps<T>;
export type NextRouteHandler<T extends Record<string, string> = Record<string, string>> = ApiRouteHandler<T>;

// Specific route types for the application
export type ArtistPageProps = PageProps<{ slug: string }>;
export type ShowPageProps = PageProps<{ slug: string }>;
export type VenuePageProps = PageProps<{ slug: string }>;
export type SetlistPageProps = PageProps<{ showId: string }>;

// API route types
export type ArtistApiRouteProps = RouteHandlerProps<{ id: string }>;
export type ShowApiRouteProps = RouteHandlerProps<{ id: string }>;
export type SetlistApiRouteProps = RouteHandlerProps<{ showId: string }>;

export {};