import { Card } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getVenues } from "./actions";
import { VenueGridClient } from "./components/venue-grid-client";
import { VenueGridServer } from "./components/venue-grid-server";

export const generateMetadata = async (): Promise<Metadata> => {
	return createMetadata({
		title: "Venues - MySetlist",
		description:
			"Explore concert venues, get insider tips, and plan your perfect show experience",
	});
};

interface VenuesPageProps {
	searchParams?: Promise<{
		q?: string;
		types?: string;
		capacity?: string;
		lat?: string;
		lng?: string;
	}>;
}

// ... existing code ...
