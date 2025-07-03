"use client";
import { getTrendingArtists } from "@/lib/trending";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
	Carousel,
	CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@repo/design-system/components/ui/carousel";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
	id: string;
	name: string;
	slug: string;
	image_url?: string | null;
}

export default function TopArtistsSlider() {
	const [artists, setArtists] = useState<Artist[]>([]);
	const sliderOptions = {
		mode: "free-snap",
		slides: {
			perView: 3.5,
			spacing: 16,
		},
		breakpoints: {
			"min-width: 768px": {
				slides: { perView: 4.5, spacing: 20 },
			},
			"min-width: 1024px": {
				slides: { perView: 5.5, spacing: 24 },
			},
		},
	};

	// @ts-ignore generic picked from local declaration
	const [sliderRef] = useKeenSlider<HTMLDivElement>(sliderOptions);

	useEffect(() => {
		(async () => {
			const data = await getTrendingArtists();
			const top12 = data.slice(0, 12).filter((a) => a.slug);
			setArtists(
				top12.map((a) => ({
					id: a.id as string,
					name: a.name,
					slug: a.slug!,
					image_url: a.image_url ?? null,
				})),
			);
		})();
	}, []);

	if (artists.length === 0) return null;

	return (
		<section className="py-16">
			<div className="container mx-auto px-4">
				<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-white">
					Top Artists
				</h2>
				<div ref={sliderRef} className="keen-slider">
					{artists.map((artist) => (
						<Card
							key={artist.id}
							className="keen-slider__slide bg-card/70 backdrop-blur-sm border border-white/10"
						>
							<CardContent className="p-0">
								<Link href={`/artists/${artist.slug}`} className="block">
									<div className="aspect-[3/4] relative overflow-hidden rounded-2xl">
										{artist.image_url ? (
											<img
												src={artist.image_url}
												alt={artist.name}
												className="object-cover w-full h-full"
											/>
										) : (
											<div className="flex items-center justify-center w-full h-full bg-muted/20 text-4xl font-bold">
												{artist.name
													.split(" ")
													.map((w) => w[0])
													.join("")}
											</div>
										)}
									</div>
									<div className="p-4 text-center">
										<p className="font-semibold text-sm truncate text-white">
											{artist.name}
										</p>
									</div>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
