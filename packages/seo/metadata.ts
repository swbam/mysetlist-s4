import merge from "lodash.merge";
import type { Metadata } from "next";

type MetadataGenerator = Omit<Metadata, "description" | "title"> & {
  title: string;
  description: string;
  image?: string;
};

const applicationName = "MySetlist";
const author: Metadata["authors"] = {
  name: "MySetlist",
  url: "https://mysetlist.com/",
};
const publisher = "MySetlist";
const twitterHandle = "@mysetlist";
const protocol = process.env["NODE_ENV"] === "production" ? "https" : "http";
const productionUrl =
  process.env["VERCEL_PROJECT_PRODUCTION_URL"] || process.env["NEXT_PUBLIC_SITE_URL"];

export const createMetadata = ({
  title,
  description,
  image,
  ...properties
}: MetadataGenerator): Metadata => {
  // Don't add " | MySetlist" here since the layout template handles it
  const parsedTitle = title;
  const defaultMetadata: Metadata = {
    title: parsedTitle,
    description,
    applicationName,
    metadataBase: productionUrl
      ? new URL(`${protocol}://${productionUrl}`)
      : new URL(`${protocol}://localhost:3001`),
    authors: [author],
    creator: author.name,
    formatDetection: {
      telephone: false,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: `${title} | ${applicationName}`,
    },
    openGraph: {
      title: `${title} | ${applicationName}`,
      description,
      type: "website",
      siteName: applicationName,
      locale: "en_US",
    },
    publisher,
    twitter: {
      card: "summary_large_image",
      creator: twitterHandle,
    },
  };

  const metadata: Metadata = merge(defaultMetadata, properties);

  if (image && metadata.openGraph) {
    metadata.openGraph.images = [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: title,
      },
    ];
  }

  return metadata;
};
