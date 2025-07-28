"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Card } from "@repo/design-system/components/ui/card"
import {
  Accessibility,
  Banknote,
  Car,
  Clock,
  CreditCard,
  Eye,
  Globe,
  Info,
  MapPin,
  Music,
  Navigation,
  Phone,
  Shield,
  Train,
  Users,
  Utensils,
  Volume2,
  Wifi,
  Wine,
} from "lucide-react"
import Link from "next/link"

interface VenueDetailsProps {
  venue: {
    id: string
    name: string
    address: string | null
    city: string
    state: string | null
    country: string
    postalCode: string | null
    phoneNumber: string | null
    website: string | null
    timezone: string
    amenities: string | null
  }
}

export function VenueDetails({ venue }: VenueDetailsProps) {
  // Parse amenities if they exist
  const amenitiesList = venue.amenities ? JSON.parse(venue.amenities) : []

  const amenityIcons: Record<string, any> = {
    wifi: Wifi,
    parking: Car,
    food: Utensils,
    bar: Wine,
    accessible: Accessibility,
    "live-music": Music,
    security: Shield,
    cashless: CreditCard,
    "coat-check": Users,
    merch: Banknote,
    atm: CreditCard,
    "outdoor-area": Globe,
  }

  const amenityLabels: Record<string, string> = {
    wifi: "Free WiFi",
    parking: "Parking Available",
    food: "Food & Concessions",
    bar: "Full Bar",
    accessible: "Wheelchair Accessible",
    "live-music": "Live Music Venue",
    security: "24/7 Security",
    cashless: "Cashless Only",
    "coat-check": "Coat Check",
    merch: "Merchandise Stand",
    atm: "ATM Available",
    "outdoor-area": "Outdoor Area",
  }

  const formatTimezone = (tz: string) => {
    // Convert timezone to readable format
    try {
      const offset = new Date()
        .toLocaleString("en-US", {
          timeZone: tz,
          timeZoneName: "short",
        })
        .split(" ")
        .pop()
      return offset || tz
    } catch {
      return tz
    }
  }

  const getDirectionsUrl = () => {
    if (venue.address) {
      const address = `${venue.address}, ${venue.city}, ${venue.state || venue.country}`
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    }
    return null
  }

  const getTransitUrl = () => {
    if (venue.address) {
      const address = `${venue.address}, ${venue.city}, ${venue.state || venue.country}`
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=transit`
    }
    return null
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-lg">Venue Information</h2>

      <div className="space-y-4">
        {/* Address */}
        {venue.address && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-sm">Address</p>
              <p className="text-muted-foreground text-sm">
                {venue.address}
                <br />
                {venue.city}, {venue.state && `${venue.state}, `}
                {venue.country}
                {venue.postalCode && ` ${venue.postalCode}`}
              </p>
            </div>
          </div>
        )}

        {/* Phone */}
        {venue.phoneNumber && (
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-sm">Phone</p>
              <a
                href={`tel:${venue.phoneNumber}`}
                className="text-primary text-sm hover:underline"
              >
                {venue.phoneNumber}
              </a>
            </div>
          </div>
        )}

        {/* Website */}
        {venue.website && (
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-sm">Website</p>
              <Link
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary text-sm hover:underline"
              >
                {venue.website.replace(/^https?:\/\//, "")}
              </Link>
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">Time Zone</p>
            <p className="text-muted-foreground text-sm">
              {formatTimezone(venue.timezone)}
            </p>
          </div>
        </div>

        {/* Amenities */}
        {amenitiesList.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="mb-3 font-medium text-sm">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity: string) => {
                const Icon = amenityIcons[amenity]
                return (
                  <Badge key={amenity} variant="secondary" className="gap-1">
                    {Icon && <Icon className="h-3 w-3" />}
                    {amenityLabels[amenity] || amenity}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Transportation Options */}
        <div className="border-t pt-4">
          <h3 className="mb-3 font-medium text-sm">Getting There</h3>
          <div className="space-y-3">
            {getDirectionsUrl() && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Link
                    href={getDirectionsUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary text-sm hover:underline"
                  >
                    Get Driving Directions
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    Google Maps driving directions
                  </p>
                </div>
              </div>
            )}

            {getTransitUrl() && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Train className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Link
                    href={getTransitUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary text-sm hover:underline"
                  >
                    Public Transit Options
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    Bus, train, and transit directions
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Car className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Parking Information</p>
                <p className="text-muted-foreground text-xs">
                  {amenitiesList.includes("parking")
                    ? "Parking available - check venue for rates"
                    : "Limited parking - consider public transit"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility Information */}
        <div className="border-t pt-4">
          <h3 className="mb-3 font-medium text-sm">Accessibility & Info</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Accessibility className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Accessibility</p>
                <p className="text-muted-foreground text-xs">
                  {amenitiesList.includes("accessible")
                    ? "Wheelchair accessible with ADA compliance"
                    : "Contact venue for accessibility information"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Volume2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Sound & Acoustics</p>
                <p className="text-muted-foreground text-xs">
                  Professional sound system - check reviews for details
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Sightlines</p>
                <p className="text-muted-foreground text-xs">
                  Venue layout designed for optimal viewing - see reviews
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Policies */}
        <div className="border-t pt-4">
          <h3 className="mb-3 font-medium text-sm">Important Policies</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {amenitiesList.includes("cashless")
                  ? "Cashless venue - cards and mobile payments only"
                  : "Cash and cards accepted"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                Bag policy enforced - check venue website before arrival
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                Arrive early for security screening and best parking
              </span>
            </div>
            {amenitiesList.includes("security") && (
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  Professional security staff on-site
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
