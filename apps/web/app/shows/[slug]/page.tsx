import { format } from "date-fns";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { BreadcrumbNavigation } from "~/components/breadcrumb-navigation";
import { ShowErrorBoundary } from "~/components/error-boundaries/show-error-boundary";
import { createShowMetadata } from "~/lib/seo-metadata";
import { getShowDetails } from "./actions";
import { ShowPageContent } from "./components/show-page-content";

type ShowPageProps = {
  params: {
    locale?: string;
    slug: string;
  };
};

// Configure ISR with different revalidation based on show date
export const dynamic = "force-static";
export const dynamicParams = true;

export const generateMetadata = async ({
  params,
}: ShowPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const show = await getShowDetails(slug);

  if (!show) {
    return createShowMetadata({
      headliner: "Show Not Found",
      date: new Date(),
      slug: "not-found",
    });
  }

  return createShowMetadata({
    headliner: show.headliner_artist.name,
    venue: show.venue?.name,
    city: show.venue?.city,
    date: new Date(show.date),
    slug: show.slug,
    image: show.headliner_artist.image_url,
  });
};

const ShowPage = async ({ params }: any) => {
  const { slug } = params?.slug ? params : { slug: params?.slug };

  // Use unstable_cache for better caching control
  const getCachedShowDetails = unstable_cache(
    async (showSlug: string) => getShowDetails(showSlug),
    ["show-details"],
    {
      revalidate: 900, // 15 minutes for better UX
      tags: [`show-${slug}`, "shows", "setlists"],
    },
  );

  const show = await getCachedShowDetails(slug);

  if (!show) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Shows", href: "/shows" },
    {
      label: show.headliner_artist.name,
      href: `/artists/${show.headliner_artist.slug}`,
    },
    {
      label: format(new Date(show.date), "MMM d, yyyy"),
      isCurrentPage: true,
    },
  ];

  return (
    <ShowErrorBoundary showDate={format(new Date(show.date), "MMM d, yyyy")}>
      <div className="flex flex-col gap-8 py-8 md:py-16">
        <div className="container mx-auto">
          <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />
          <ShowPageContent show={show} />
        </div>
      </div>
    </ShowErrorBoundary>
  );
};

// Generate static params for recent and upcoming shows
export async function generateStaticParams() {
  try {
    // Create a simple client for static generation (no cookies)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get recent and upcoming shows for static generation
    const { data: shows } = await supabase
      .from("shows")
      .select("slug")
      .gte("date", twoWeeksAgo.toISOString())
      .lte("date", oneMonthFromNow.toISOString())
      .order("date", { ascending: false })
      .limit(100);

    if (!shows) {
      return [];
    }

    return shows.map((show) => ({
      slug: show.slug,
    }));
  } catch (_error) {
    return [];
  }
}

export default ShowPage;
