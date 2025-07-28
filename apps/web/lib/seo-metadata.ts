import { createMetadata } from "@repo/seo/metadata"
import type { Metadata } from "next"

interface BaseMetadataProps {
  title: string
  description: string
  image?: string
  noIndex?: boolean
  canonicalUrl?: string
}

export function createPageMetadata(props: BaseMetadataProps): Metadata {
  return createMetadata({
    title: props.title,
    description: props.description,
    ...(props.image && { image: props.image }),
    ...(props.noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title: props.title,
      description: props.description,
      images: props.image
        ? [
            {
              url: props.image,
              width: 1200,
              height: 630,
              alt: props.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: props.title,
      description: props.description,
      images: props.image ? [props.image] : undefined,
    },
    alternates: props.canonicalUrl
      ? {
          canonical: props.canonicalUrl,
        }
      : undefined,
  })
}

export function createArtistMetadata(artist: {
  name: string
  bio?: string
  imageUrl?: string
  slug: string
  showCount?: number
  followerCount?: number
}): Metadata {
  const description = artist.bio
    ? `${artist.bio.slice(0, 150)}...`
    : `Discover ${artist.name} concerts, setlists, and upcoming shows. Join ${artist.followerCount || 0} fans tracking their favorite artist.`

  return createPageMetadata({
    title: `${artist.name} - Concerts & Setlists | MySetlist`,
    description,
    ...(artist.imageUrl && { image: artist.imageUrl }),
    canonicalUrl: `/artists/${artist.slug}`,
  })
}

export function createShowMetadata(show: {
  headliner: string
  venue?: string
  city?: string
  date: Date
  slug: string
  image?: string
}): Metadata {
  const formattedDate = show.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const location = show.venue
    ? `${show.venue}${show.city ? ` in ${show.city}` : ""}`
    : show.city || "TBA"

  return createPageMetadata({
    title: `${show.headliner} - ${formattedDate} at ${location} | MySetlist`,
    description: `Get tickets and setlist for ${show.headliner} performing at ${location} on ${formattedDate}. View predicted setlist, vote on songs, and connect with other fans.`,
    ...(show.image && { image: show.image }),
    canonicalUrl: `/shows/${show.slug}`,
  })
}

export function createVenueMetadata(venue: {
  name: string
  city: string
  state?: string
  country?: string
  description?: string
  imageUrl?: string
  slug: string
  upcomingShowCount?: number
  capacity?: number
}): Metadata {
  const location = venue.state
    ? `${venue.city}, ${venue.state}`
    : `${venue.city}, ${venue.country}`

  const description =
    venue.description ||
    `Concert venue in ${location}. ${venue.capacity ? `Capacity: ${venue.capacity.toLocaleString()}. ` : ""}${venue.upcomingShowCount ? `${venue.upcomingShowCount} upcoming shows. ` : ""}Get insider tips, parking info, and plan your perfect show experience.`

  return createPageMetadata({
    title: `${venue.name} - ${location} | MySetlist`,
    description,
    ...(venue.imageUrl && { image: venue.imageUrl }),
    canonicalUrl: `/venues/${venue.slug}`,
  })
}

export function createSearchMetadata(query?: string): Metadata {
  const title = query
    ? `Search results for "${query}" | MySetlist`
    : "Search Artists, Shows & Venues | MySetlist"

  const description = query
    ? `Find artists, concerts, and venues matching "${query}". Discover setlists, upcoming shows, and connect with fans.`
    : "Search for your favorite artists, upcoming shows, and concert venues. Find setlists, vote on songs, and discover new music."

  return createPageMetadata({
    title,
    description,
    noIndex: !!query, // Don't index search result pages
  })
}
