import { Button } from "@repo/design-system/components/ui/button"
import { Music } from "lucide-react"
import Link from "next/link"

export default function ArtistNotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16">
      <Music className="h-16 w-16 text-muted-foreground" />
      <h1 className="font-bold text-4xl">Artist Not Found</h1>
      <p className="max-w-md text-center text-muted-foreground">
        The artist you're looking for doesn't exist or has been removed.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/artists">Browse Artists</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
