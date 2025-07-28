import type { Metadata } from "next"

interface SocialMetaOptions {
  title: string
  description: string
  image?: string
  url?: string
  type?: "website" | "article" | "profile" | "music.song" | "music.album"
  siteName?: string
  locale?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  audio?: string
  video?: string
}

export function generateSocialMeta(options: SocialMetaOptions): Metadata {
  const {
    title,
    description,
    image,
    url,
    type = "website",
    siteName = "MySetlist",
    locale = "en_US",
    author,
    publishedTime,
    modifiedTime,
    tags,
    audio,
    video,
  } = options

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      siteName,
      locale,
      ...(url && { url }),
      ...(image && {
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
      ...(audio && { audio: [{ url: audio }] }),
      ...(video && { videos: [{ url: video }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
      site: "@mysetlist",
      creator: author ? `@${author}` : "@mysetlist",
    },
    ...(author && { authors: [{ name: author }] }),
    ...(tags && tags.length > 0 && { keywords: tags }),
  }

  // Add article-specific metadata
  if (type === "article" && metadata.openGraph) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: "article",
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] }),
      ...(tags && { tags }),
    }
  }

  return metadata
}

// Helper for show pages
export function generateShowMeta({
  artistName,
  venueName,
  venueCity,
  showDate,
  imageUrl,
  showUrl,
  setlistCount,
}: {
  artistName: string
  venueName: string
  venueCity: string
  showDate: string
  imageUrl?: string
  showUrl: string
  setlistCount?: number
}): Metadata {
  const formattedDate = new Date(showDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const title = `${artistName} at ${venueName} - ${formattedDate}`
  const description = setlistCount
    ? `Vote on the setlist for ${artistName}'s show at ${venueName}, ${venueCity}. ${setlistCount} songs to choose from!`
    : `Check out ${artistName}'s upcoming show at ${venueName}, ${venueCity} on ${formattedDate}`

  return generateSocialMeta({
    title,
    description,
    ...(imageUrl && { image: imageUrl }),
    url: showUrl,
    type: "article",
    publishedTime: new Date().toISOString(),
    tags: [
      artistName,
      venueName,
      venueCity,
      "concert",
      "live music",
      "setlist",
    ],
  })
}

// Helper for artist pages
export function generateArtistMeta({
  artistName,
  bio,
  imageUrl,
  artistUrl,
  genres,
  followerCount,
}: {
  artistName: string
  bio?: string
  imageUrl?: string
  artistUrl: string
  genres?: string[]
  followerCount?: number
}): Metadata {
  const description = bio
    ? `${bio.slice(0, 160)}...`
    : `Discover ${artistName} on MySetlist. View upcoming shows, past setlists, and vote on your favorite songs.`

  const enhancedDescription = followerCount
    ? `${description} Followed by ${followerCount.toLocaleString()} fans.`
    : description

  return generateSocialMeta({
    title: `${artistName} | MySetlist`,
    description: enhancedDescription,
    ...(imageUrl && { image: imageUrl }),
    url: artistUrl,
    type: "profile",
    tags: genres
      ? [artistName, ...genres, "artist", "music"]
      : [artistName, "artist", "music"],
  })
}

// Helper for venue pages
export function generateVenueMeta({
  venueName,
  venueCity,
  venueState,
  description,
  imageUrl,
  venueUrl,
  capacity,
  upcomingShows,
}: {
  venueName: string
  venueCity: string
  venueState?: string
  description?: string
  imageUrl?: string
  venueUrl: string
  capacity?: number
  upcomingShows?: number
}): Metadata {
  const location = venueState ? `${venueCity}, ${venueState}` : venueCity
  const venueDescription = description
    ? description
    : `${venueName} in ${location}. ${capacity ? `Capacity: ${capacity.toLocaleString()}.` : ""} ${upcomingShows ? `${upcomingShows} upcoming shows.` : ""}`

  return generateSocialMeta({
    title: `${venueName} - ${location} | MySetlist`,
    description: venueDescription.trim(),
    ...(imageUrl && { image: imageUrl }),
    url: venueUrl,
    type: "article",
    tags: [venueName, venueCity, "venue", "concert venue", "live music"],
  })
}

// Helper for trending page
export function generateTrendingMeta({
  period = "week",
}: {
  period?: "day" | "week" | "month"
}): Metadata {
  const periodText = {
    day: "Today",
    week: "This Week",
    month: "This Month",
  }

  return generateSocialMeta({
    title: `Trending ${periodText[period]} | MySetlist`,
    description: `Discover what's hot in live music ${periodText[period].toLowerCase()}. See trending shows, artists, and venues on MySetlist.`,
    type: "website",
    tags: ["trending", "live music", "concerts", "popular shows"],
  })
}

// Helper for discover page
export function generateDiscoverMeta(): Metadata {
  return generateSocialMeta({
    title: "Discover Music | MySetlist",
    description:
      "Get personalized recommendations for shows, artists, and venues based on your music taste. Discover your next favorite concert on MySetlist.",
    type: "website",
    tags: [
      "discover",
      "recommendations",
      "personalized",
      "concerts",
      "live music",
    ],
  })
}
