import { db } from "../src/client";
import { artists } from "../src/schema/artists";

const sampleArtists = [
  {
    name: "Taylor Swift",
    slug: "taylor-swift",
    spotifyId: "06HL4z0CvFAxyc27GXpf02",
    genres: JSON.stringify(["pop", "country", "indie folk"]),
    popularity: 100,
    followers: 85000000,
    monthlyListeners: 75000000,
    verified: true,
  },
  {
    name: "The Weeknd",
    slug: "the-weeknd",
    spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ",
    genres: JSON.stringify([
      "canadian contemporary r&b",
      "canadian pop",
      "pop",
    ]),
    popularity: 95,
    followers: 72000000,
    monthlyListeners: 95000000,
    verified: true,
  },
  {
    name: "Billie Eilish",
    slug: "billie-eilish",
    spotifyId: "6qqNVTkY8uBg9cP3Jd7DAH",
    genres: JSON.stringify(["art pop", "electropop", "pop"]),
    popularity: 92,
    followers: 92000000,
    monthlyListeners: 85000000,
    verified: true,
  },
  {
    name: "Arctic Monkeys",
    slug: "arctic-monkeys",
    spotifyId: "7Ln80lUS6He07XvHI8qqHH",
    genres: JSON.stringify([
      "garage rock",
      "modern rock",
      "permanent wave",
      "rock",
      "sheffield indie",
    ]),
    popularity: 88,
    followers: 25000000,
    monthlyListeners: 42000000,
    verified: true,
  },
  {
    name: "Radiohead",
    slug: "radiohead",
    spotifyId: "4Z8W4fKeB5YxbusRsdQVPb",
    genres: JSON.stringify([
      "art rock",
      "melancholia",
      "oxford indie",
      "permanent wave",
      "rock",
    ]),
    popularity: 82,
    followers: 12000000,
    monthlyListeners: 18000000,
    verified: true,
  },
];

async function seedArtists() {
  for (const artist of sampleArtists) {
    try {
      await db.insert(artists).values(artist);
    } catch (_error) {}
  }
  process.exit(0);
}

seedArtists().catch(console.error);
