"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { ExternalLink, Ticket } from "lucide-react"

type TicketInfoProps = {
  ticketUrl?: string
  minPrice?: number
  maxPrice?: number
  currency?: string
  status: string
}

export function TicketInfo({
  ticketUrl,
  minPrice,
  maxPrice,
  currency = "USD",
  status,
}: TicketInfoProps) {
  const isUpcoming = status === "upcoming"
  const isSoldOut = false // This could be determined by ticket availability

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getPriceRange = () => {
    if (!minPrice && !maxPrice) {
      return null
    }
    if (minPrice && maxPrice && minPrice === maxPrice) {
      return formatPrice(minPrice)
    }
    if (minPrice && maxPrice) {
      return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
    }
    if (minPrice) {
      return `From ${formatPrice(minPrice)}`
    }
    if (maxPrice) {
      return `Up to ${formatPrice(maxPrice)}`
    }
    return null
  }

  const priceRange = getPriceRange()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priceRange && <div className="font-bold text-2xl">{priceRange}</div>}

        {isUpcoming && ticketUrl ? (
          <Button
            asChild
            className="w-full gap-2"
            size="lg"
            variant={isSoldOut ? "secondary" : "default"}
            disabled={isSoldOut}
          >
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
              {isSoldOut ? (
                "Sold Out"
              ) : (
                <>
                  Get Tickets
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </a>
          </Button>
        ) : isUpcoming ? (
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">Tickets not yet available</p>
            <Badge variant="outline">Check back soon</Badge>
          </div>
        ) : (
          <div className="text-center">
            <Badge variant="secondary">
              {status === "completed"
                ? "Show has ended"
                : "Tickets unavailable"}
            </Badge>
          </div>
        )}

        {ticketUrl && isUpcoming && !isSoldOut && (
          <p className="text-center text-muted-foreground text-xs">
            You will be redirected to an external ticket vendor
          </p>
        )}
      </CardContent>
    </Card>
  )
}
