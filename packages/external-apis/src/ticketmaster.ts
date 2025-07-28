import "server-only"
import axios from "axios"
import { keys } from "../keys"

const env = keys()

interface TicketmasterVenue {
  id: string
  name: string
  url: string
  locale: string
  timezone: string
  city: {
    name: string
  }
  state?: {
    name: string
    stateCode: string
  }
  country: {
    name: string
    countryCode: string
  }
  address?: {
    line1: string
    line2?: string
  }
  location?: {
    longitude: string
    latitude: string
  }
  generalInfo?: {
    generalRule?: string
    childRule?: string
  }
  upcomingEvents?: {
    _total: number
  }
}

interface TicketmasterEvent {
  id: string
  name: string
  type: string
  url: string
  locale: string
  images: Array<{
    ratio: string
    url: string
    width: number
    height: number
  }>
  dates: {
    start: {
      localDate: string
      localTime?: string
      dateTime?: string
    }
    timezone?: string
    status: {
      code: string
    }
  }
  sales?: {
    public?: {
      startDateTime: string
      endDateTime: string
    }
  }
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  _embedded: {
    venues: TicketmasterVenue[]
    attractions?: Array<{
      id: string
      name: string
      type: string
      url: string
      images: Array<{
        ratio: string
        url: string
        width: number
        height: number
      }>
      classifications?: Array<{
        primary: boolean
        segment: {
          id: string
          name: string
        }
        genre: {
          id: string
          name: string
        }
      }>
      upcomingEvents?: {
        _total: number
      }
    }>
  }
}

interface TicketmasterSearchResponse<T> {
  _embedded?: {
    events?: T[]
    attractions?: T[]
    venues?: T[]
  }
  page: {
    size: number
    totalElements: number
    totalPages: number
    number: number
  }
}

class TicketmasterAPI {
  private baseURL = "https://app.ticketmaster.com/discovery/v2"

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    if (!env.TICKETMASTER_API_KEY) {
      throw new Error("TICKETMASTER_API_KEY is not configured")
    }

    const url = `${this.baseURL}${endpoint}`

    const response = await axios.get(url, {
      params: {
        apikey: env.TICKETMASTER_API_KEY,
        ...params,
      },
    })

    return response.data
  }

  async searchEvents(params: {
    keyword?: string
    attractionId?: string
    venueId?: string
    postalCode?: string
    latlong?: string
    radius?: string
    unit?: "miles" | "km"
    source?: string
    locale?: string
    marketId?: string
    startDateTime?: string
    endDateTime?: string
    size?: number
    page?: number
    sort?: string
    onsaleStartDateTime?: string
    onsaleEndDateTime?: string
    city?: string
    countryCode?: string
    stateCode?: string
    classificationName?: string[]
    classificationId?: string[]
  }): Promise<TicketmasterSearchResponse<TicketmasterEvent>> {
    return this.makeRequest<TicketmasterSearchResponse<TicketmasterEvent>>(
      "/events.json",
      params
    )
  }

  async getEvent(id: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(`/events/${id}.json`)
  }

  async searchAttractions(params: {
    keyword?: string
    size?: number
    page?: number
    sort?: string
    classificationName?: string[]
    classificationId?: string[]
  }): Promise<TicketmasterSearchResponse<any>> {
    return this.makeRequest<TicketmasterSearchResponse<any>>(
      "/attractions.json",
      params
    )
  }

  async getAttraction(id: string): Promise<any> {
    return this.makeRequest<any>(`/attractions/${id}.json`)
  }

  async searchVenues(params: {
    keyword?: string
    latlong?: string
    radius?: string
    unit?: "miles" | "km"
    size?: number
    page?: number
    sort?: string
    city?: string
    countryCode?: string
    stateCode?: string
  }): Promise<TicketmasterSearchResponse<TicketmasterVenue>> {
    return this.makeRequest<TicketmasterSearchResponse<TicketmasterVenue>>(
      "/venues.json",
      params
    )
  }

  async getVenue(id: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(`/venues/${id}.json`)
  }

  async getUpcomingEvents(
    artistName: string,
    options: {
      size?: number
      page?: number
      sort?: string
      startDateTime?: string
      endDateTime?: string
    } = {}
  ): Promise<TicketmasterEvent[]> {
    const response = await this.searchEvents({
      keyword: artistName,
      classificationName: ["Music"],
      sort: "date,asc",
      ...options,
    })

    return response._embedded?.events || []
  }
}

export const ticketmaster = new TicketmasterAPI()
export class TicketmasterClient extends TicketmasterAPI {}
export type { TicketmasterEvent, TicketmasterVenue }
