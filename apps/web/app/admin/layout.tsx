import { createClient } from "@/lib/supabase/server";
import {
	Activity,
	AlertCircle,
	Calendar,
	FileText,
	Flag,
	Home,
	MapPin,
	Monitor,
	Settings,
	Shield,
	Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import React, { ReactNode } from "react";

interface AdminLayoutProps {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}

export default async function AdminLayout({
	children,
	params,
}: AdminLayoutProps) {
	const supabase = await createClient();
	const { locale } = await params;

	// Check authentication
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect(`/${locale}/auth/sign-in`);
	}

	// Check if user is admin or moderator
	const { data: userData } = await supabase
		.from("users")
		.select("role")
		.eq("id", user.id)
		.single();

	if (
		!userData ||
		(userData.role !== "admin" && userData.role !== "moderator")
	) {
		redirect(`/${locale}`);
	}

	const isAdmin = userData.role === "admin";

	const navigation = [
		{ name: "Dashboard", href: `/${locale}/admin`, icon: Home },
		{
			name: "Users",
			href: `/${locale}/admin/users`,
			icon: Users,
			adminOnly: true,
		},
		{ name: "Shows", href: `/${locale}/admin/shows`, icon: Calendar },
		{ name: "Venues", href: `/${locale}/admin/venues`, icon: MapPin },
		{ name: "Moderation", href: `/${locale}/admin/moderation`, icon: Shield },
		{ name: "Reports", href: `/${locale}/admin/reports`, icon: Flag },
		{
			name: "Monitoring",
			href: `/${locale}/admin/monitoring`,
			icon: Monitor,
			adminOnly: true,
		},
		{ name: "Content", href: `/${locale}/admin/content`, icon: FileText },
		{ name: "Activity Log", href: `/${locale}/admin/activity`, icon: Activity },
		{
			name: "Settings",
			href: `/${locale}/admin/settings`,
			icon: Settings,
			adminOnly: true,
		},
	];

	const visibleNavigation = navigation.filter(
		(item) => !item.adminOnly || isAdmin,
	);

	return (
		<div className="min-h-screen bg-background">
			<div className="flex">
				{/* Sidebar */}
				<aside className="w-64 min-h-screen bg-card border-r">
					<div className="p-6">
						<h2 className="text-lg font-semibold">Admin Panel</h2>
						<p className="text-sm text-muted-foreground mt-1">
							{isAdmin ? "Administrator" : "Moderator"}
						</p>
					</div>

					<nav className="px-4 pb-6">
						<ul className="space-y-1">
							{visibleNavigation.map((item) => (
								<li key={item.name}>
									<Link
										href={item.href}
										className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
									>
										<item.icon className="h-4 w-4" />
										{item.name}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Quick Stats */}
					<div className="px-6 py-4 border-t">
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<AlertCircle className="h-4 w-4 text-yellow-500" />
								<span>5 pending reports</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Shield className="h-4 w-4 text-orange-500" />
								<span>12 items in queue</span>
							</div>
						</div>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1">
					<div className="p-8">{children}</div>
				</main>
			</div>
		</div>
	);
}
