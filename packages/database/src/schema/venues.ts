import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  doublePrecision, 
  timestamp 
} from 'drizzle-orm/pg-core';

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  address: text('address'),
  city: text('city').notNull(),
  state: text('state'),
  country: text('country').notNull(),
  postalCode: text('postal_code'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  timezone: text('timezone').notNull(),
  capacity: integer('capacity'),
  venueType: text('venue_type'), // arena, theater, club, etc.
  phoneNumber: text('phone_number'),
  website: text('website'),
  imageUrl: text('image_url'),
  description: text('description'),
  amenities: text('amenities'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});