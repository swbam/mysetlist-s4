"use client";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@repo/design-system/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function HomeHero() {
	return (
		<section className="relative overflow-hidden pt-24 pb-32">
			{/* Animated gradient background */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1.2 }}
				className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0D0D0D] via-[#1A1A1A] to-[#101010]"
			/>

			<div className="container mx-auto px-4 text-center">
				<h1 className="font-extrabold tracking-tight text-5xl md:text-7xl leading-[1.05] bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
					Crowd-Curated&nbsp;Setlists
				</h1>
				<p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
					Vote on the songs you want to hear at upcoming concerts and see what
					other fans are predicting.
				</p>

				{/* Centered search input */}
				<div className="mt-10 flex justify-center">
					<SearchBar
						variant="hero"
						placeholder="Search for your favorite artists..."
					/>
				</div>

				<div className="mt-6 flex justify-center gap-4">
					<Button size="lg" asChild>
						<Link href="/artists">Start Voting</Link>
					</Button>
					<Button variant="outline" size="lg" asChild>
						<Link href="/discover">Discover Music</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
