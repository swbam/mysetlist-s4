import { Button } from "@repo/design-system/components/ui/button"
import { ArrowRight, Music } from "lucide-react"

export default function CTA() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center gap-8 rounded-md bg-muted p-8 py-20 text-center lg:p-24">
          <div className="flex items-center gap-2 text-primary">
            <Music className="h-6 w-6" />
            <span className="font-medium text-sm uppercase tracking-wide">
              Get Started
            </span>
          </div>
          <h3 className="max-w-xl font-regular text-3xl tracking-tighter md:text-5xl">
            Join the music community
          </h3>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed tracking-tight">
            Start discovering concerts, voting on setlists, and connecting with
            fellow music fans today
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button className="gap-2" size="lg">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
