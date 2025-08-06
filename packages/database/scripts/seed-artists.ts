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
    bio: "Taylor Swift is an American singer-songwriter known for her narrative songwriting and multiple genre shifts throughout her career.",
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
    bio: "The Weeknd is a Canadian singer-songwriter and record producer known for his distinctive falsetto and dark, atmospheric R&B style.",
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
    bio: "Billie Eilish is an American singer-songwriter who gained popularity for her distinctive vocal style and darkly poetic lyrics.",
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
    bio: "Arctic Monkeys are an English rock band formed in Sheffield in 2002. The group consists of Alex Turner, Jamie Cook, Nick O'Malley, and Matt Helders.",
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
    bio: "Radiohead are an English rock band formed in Abingdon, Oxfordshire, in 1985. They have been praised as one of the most innovative bands of their generation.",
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
