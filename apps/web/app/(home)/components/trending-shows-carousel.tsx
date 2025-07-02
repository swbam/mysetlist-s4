"use client";

import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@repo/design-system/components/ui/carousel";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Show {
	id: string;
	name: string;
	slug?: string;
	image_url?: string | null;
	venue_name?: string;
	show_date?: string;
}

interface TrendingShowsCarouselProps {
	shows: Show[];
}

export default function TrendingShowsCarousel({
	shows,
}: TrendingShowsCarouselProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [current, setCurrent] = useState(0);

	// Auto-scroll to the previous slide every 3 seconds (opposite direction)
	useEffect(() => {
		if (!api) return;

		const interval = setInterval(() => {
			if (api.selectedScrollSnap() === 0) {
				api.scrollTo(api.scrollSnapList().length - 1);
				setCurrent(api.scrollSnapList().length - 1);
			} else {
				api.scrollPrev();
				setCurrent((prev) => (prev === 0 ? shows.length - 1 : prev - 1));
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [api, shows.length]);

	return (
		<section className="py-16 md:py-24">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
							Trending Shows
						</h2>
						<p className="text-muted-foreground">
							Swipe through the shows everyone is talking about
						</p>
					</div>
					<Link
						href="/shows"
						className="text-primary hover:underline font-medium"
					>
						View All Shows →
					</Link>
				</div>

				<div className="relative">
					<Carousel
						setApi={setApi}
						opts={{ loop: true, align: "start" }}
						className="w-full"
					>
						<CarouselContent>
							{shows.map((show) => (
								<CarouselItem
									key={show.id}
									className="basis-2/3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
								>
									<Link
										href={`/shows/${show.slug ?? ""}`}
										className="group block overflow-hidden rounded-lg border border-border hover:shadow-lg transition-shadow bg-background"
									>
										<div className="relative aspect-video overflow-hidden bg-muted">
											{show.image_url ? (
												<Image
													src={show.image_url}
													alt={show.name}
													fill
													sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 400px"
													className="object-cover transition-transform group-hover:scale-105"
												/>
											) : (
												<div className="flex items-center justify-center w-full h-full bg-muted">
													<span className="text-4xl font-bold text-muted-foreground">
														🎵
													</span>
												</div>
											)}
										</div>
										<div className="p-3 space-y-1">
											<h3 className="font-semibold truncate group-hover:text-primary">
												{show.name}
											</h3>
											{show.show_date && (
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<Calendar className="h-3 w-3" />
													{format(new Date(show.show_date), "MMM dd, yyyy")}
												</div>
											)}
											{show.venue_name && (
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<MapPin className="h-3 w-3" />
													{show.venue_name}
												</div>
											)}
										</div>
									</Link>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="-left-4" />
						<CarouselNext className="-right-4" />
					</Carousel>
				</div>
			</div>
		</section>
	);
}
