"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@repo/design-system/components/ui/carousel";
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
	id: string;
	name: string;
	slug?: string;
	image_url?: string | null;
	followers?: number;
	trendingScore?: number;
}

interface TopArtistsCarouselProps {
	artists: Artist[];
}

export default function TopArtistsCarousel({
	artists,
}: TopArtistsCarouselProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [current, setCurrent] = useState(0);

	// Auto-scroll every 3 seconds similar to Next-Forge template
	useEffect(() => {
		if (!api) return;

		const interval = setInterval(() => {
			if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
				api.scrollTo(0);
				setCurrent(0);
			} else {
				api.scrollNext();
				setCurrent((prev) => prev + 1);
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [api]);

	const formatFollowers = (count: number | undefined) => {
		if (!count) return "0";
		if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
		if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
		return `${count}`;
	};

	return (
		<section className="py-16 md:py-24 bg-muted/50">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
							Top Artists
						</h2>
						<p className="text-muted-foreground">
							Explore the artists fans are loving right now
						</p>
					</div>
					<Link
						href="/artists"
						className="text-primary hover:underline font-medium"
					>
						View All Artists →
					</Link>
				</div>

				<div className="relative">
					<Carousel
						setApi={setApi}
						opts={{ loop: true, align: "start" }}
						className="w-full"
					>
						<CarouselContent>
							{artists.map((artist) => (
								<CarouselItem
									key={artist.id}
									className="basis-2/3 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
								>
									<Link
										href={`/artists/${artist.slug ?? ""}`}
										className="group block overflow-hidden rounded-lg border border-border hover:shadow-lg transition-shadow bg-background"
									>
										<div className="relative aspect-square overflow-hidden">
											{artist.image_url ? (
												<Image
													src={artist.image_url}
													alt={artist.name}
													fill
													sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
													className="object-cover transition-transform group-hover:scale-105"
												/>
											) : (
												<div className="flex items-center justify-center w-full h-full bg-muted">
													<span className="text-5xl font-bold text-muted-foreground">
														{artist.name.charAt(0)}
													</span>
												</div>
											)}
										</div>
										<div className="p-3 space-y-1">
											<h3 className="font-semibold truncate group-hover:text-primary">
												{artist.name}
											</h3>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Users className="h-3 w-3" />
												{formatFollowers(artist.followers)} followers
											</div>
											{artist.trendingScore && artist.trendingScore > 85 && (
												<Badge variant="secondary" className="text-[10px]">
													Hot 🔥
												</Badge>
											)}
										</div>
									</Link>
								</CarouselItem>
							))}
						</CarouselContent>
						{/* Navigation buttons */}
						<CarouselPrevious className="-left-4" />
						<CarouselNext className="-right-4" />
					</Carousel>
				</div>
			</div>
		</section>
	);
}
