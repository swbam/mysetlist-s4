"use client";
import { type TrendingItem, getTrendingArtists } from "@/lib/trending";
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

type Artist = Pick<TrendingItem, "id" | "name" | "slug" | "image_url">;

export default function TopArtistsSlider() {
	const [artists, setArtists] = useState<Artist[]>([]);
	const [api, setApi] = useState<CarouselApi>();

	useEffect(() => {
		(async () => {
			const data = await getTrendingArtists();
			const top12 = data.slice(0, 12).filter((a) => a.slug) as Artist[];
			setArtists(top12);
		})();
	}, []);

	if (artists.length === 0) return null;

	return (
		<section className="py-16">
			<div className="container mx-auto px-4">
				<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-white">
					Top Artists
				</h2>
				<Carousel setApi={setApi} opts={{ align: "start", loop: true }}>
					<CarouselContent>
						{artists.map((artist) => (
							<CarouselItem
								key={artist.id}
								className="basis-1/2 md:basis-1/4 lg:basis-1/6"
							>
								<Card className="bg-card/70 backdrop-blur-sm border border-white/10">
									<CardContent className="p-0">
										<Link href={`/artists/${artist.slug}`} className="block">
											<div className="aspect-[3/4] relative overflow-hidden rounded-2xl">
												{artist.image_url ? (
													// eslint-disable-next-line @next/next/no-img-element
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
							</CarouselItem>
						))}
					</CarouselContent>
					<CarouselPrevious className="-left-4" />
					<CarouselNext className="-right-4" />
				</Carousel>
			</div>
		</section>
	);
}
