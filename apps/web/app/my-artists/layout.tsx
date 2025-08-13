import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Artists - TheSet",
  description: "View your top artists and followed artists from Spotify",
};

export default function MyArtistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
