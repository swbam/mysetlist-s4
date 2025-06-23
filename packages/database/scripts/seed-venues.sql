-- Sample venue data for testing
INSERT INTO venues (name, slug, address, city, state, country, postal_code, latitude, longitude, timezone, capacity, venue_type, phone_number, website, image_url, description, amenities) VALUES
-- New York Venues
('Madison Square Garden', 'madison-square-garden', '4 Pennsylvania Plaza', 'New York', 'NY', 'USA', '10001', 40.7505, -73.9934, 'America/New_York', 20789, 'arena', '(212) 465-6741', 'https://www.msg.com', 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800', 'Iconic multi-purpose indoor arena in Midtown Manhattan, home to major concerts, sports events, and entertainment shows.', '["wifi", "parking", "food", "bar", "accessible", "cashless"]'),

('Blue Note', 'blue-note-nyc', '131 W 3rd St', 'New York', 'NY', 'USA', '10012', 40.7305, -74.0002, 'America/New_York', 250, 'club', '(212) 475-8592', 'https://bluenotejazz.com/new-york/', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'Legendary jazz club featuring world-renowned artists in an intimate setting.', '["bar", "food", "accessible"]'),

-- Los Angeles Venues
('Hollywood Bowl', 'hollywood-bowl', '2301 N Highland Ave', 'Los Angeles', 'CA', 'USA', '90068', 34.1122, -118.3391, 'America/Los_Angeles', 17500, 'outdoor-amphitheater', '(323) 850-2000', 'https://www.hollywoodbowl.com', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', 'Iconic outdoor amphitheater nestled in the Hollywood Hills, known for its distinctive band shell and natural acoustics.', '["parking", "food", "bar", "accessible"]'),

('The Troubadour', 'the-troubadour', '9081 Santa Monica Blvd', 'West Hollywood', 'CA', 'USA', '90069', 34.0825, -118.3897, 'America/Los_Angeles', 500, 'club', '(310) 276-1158', 'https://www.troubadour.com', 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800', 'Historic nightclub that launched the careers of countless legendary artists since 1957.', '["bar", "parking"]'),

-- Chicago Venues
('United Center', 'united-center', '1901 W Madison St', 'Chicago', 'IL', 'USA', '60612', 41.8807, -87.6742, 'America/Chicago', 23500, 'arena', '(312) 455-4500', 'https://www.unitedcenter.com', 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800', 'Premier sports and entertainment arena on Chicago''s Near West Side.', '["wifi", "parking", "food", "bar", "accessible", "cashless"]'),

('Metro Chicago', 'metro-chicago', '3730 N Clark St', 'Chicago', 'IL', 'USA', '60613', 41.9499, -87.6588, 'America/Chicago', 1150, 'theater', '(773) 549-4140', 'https://metrochicago.com', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', 'Historic music venue in Wrigleyville featuring indie, alternative, and punk acts.', '["bar", "accessible"]'),

-- Nashville Venues
('Ryman Auditorium', 'ryman-auditorium', '116 5th Ave N', 'Nashville', 'TN', 'USA', '37219', 36.1612, -86.7785, 'America/Chicago', 2362, 'theater', '(615) 889-3060', 'https://ryman.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 'The "Mother Church of Country Music" - a National Historic Landmark with unparalleled acoustics.', '["food", "bar", "accessible", "parking"]'),

('The Bluebird Cafe', 'bluebird-cafe', '4104 Hillsboro Pike', 'Nashville', 'TN', 'USA', '37215', 36.1056, -86.8148, 'America/Chicago', 90, 'club', '(615) 383-1461', 'https://www.bluebirdcafe.com', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', 'Intimate listening room where songwriters perform their original songs in the round.', '["food", "bar"]'),

-- Austin Venues
('Moody Theater', 'moody-theater', '310 Willie Nelson Blvd', 'Austin', 'TX', 'USA', '78701', 30.2653, -97.7471, 'America/Chicago', 2750, 'theater', '(512) 225-7999', 'https://www.acl-live.com', 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800', 'Home of Austin City Limits, the longest-running music television program in American history.', '["wifi", "food", "bar", "accessible", "parking"]'),

('Stubb''s BBQ', 'stubbs-bbq', '801 Red River St', 'Austin', 'TX', 'USA', '78701', 30.2686, -97.7363, 'America/Chicago', 2200, 'outdoor-amphitheater', '(512) 480-8341', 'https://www.stubbsaustin.com', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800', 'Legendary BBQ restaurant and outdoor amphitheater in the heart of Austin''s Red River District.', '["food", "bar", "parking"]'),

-- Seattle Venues
('The Showbox', 'the-showbox', '1426 1st Ave', 'Seattle', 'WA', 'USA', '98101', 47.6086, -122.3404, 'America/Los_Angeles', 1150, 'theater', '(206) 628-3151', 'https://www.showboxpresents.com', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800', 'Historic art deco venue that has hosted everyone from Duke Ellington to Pearl Jam.', '["bar", "accessible"]'),

('The Crocodile', 'the-crocodile', '2200 2nd Ave', 'Seattle', 'WA', 'USA', '98121', 47.6134, -122.3453, 'America/Los_Angeles', 1150, 'club', '(206) 441-4618', 'https://www.thecrocodile.com', 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=800', 'Legendary venue that played a crucial role in Seattle''s grunge scene.', '["bar", "food"]'),

-- Denver Venues
('Red Rocks Amphitheatre', 'red-rocks-amphitheatre', '18300 W Alameda Pkwy', 'Morrison', 'CO', 'USA', '80465', 39.6654, -105.2057, 'America/Denver', 9525, 'outdoor-amphitheater', '(720) 865-2494', 'https://www.redrocksonline.com', 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800', 'Stunning natural amphitheatre between two 300-foot sandstone monoliths with perfect acoustics.', '["parking", "food", "bar", "accessible"]'),

('The Ogden Theatre', 'ogden-theatre', '935 E Colfax Ave', 'Denver', 'CO', 'USA', '80218', 39.7402, -104.9759, 'America/Denver', 1600, 'theater', '(303) 832-1874', 'https://www.ogdentheatre.com', 'https://images.unsplash.com/photo-1578946956088-940c3b502864?w=800', 'Historic venue on Colfax featuring diverse acts from rock to electronic music.', '["bar", "accessible", "parking"]'),

-- San Francisco Venues
('The Fillmore', 'the-fillmore', '1805 Geary Blvd', 'San Francisco', 'CA', 'USA', '94115', 37.7841, -122.4331, 'America/Los_Angeles', 1315, 'theater', '(415) 346-6000', 'https://www.thefillmore.com', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800', 'Legendary venue that defined the psychedelic rock era and continues to host top acts.', '["bar", "accessible"]'),

('The Warfield', 'the-warfield', '982 Market St', 'San Francisco', 'CA', 'USA', '94102', 37.7829, -122.4100, 'America/Los_Angeles', 2300, 'theater', '(415) 345-0900', 'https://www.thewarfieldtheatre.com', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', 'Historic 1922 vaudeville theater turned premier rock venue in downtown San Francisco.', '["bar", "food", "accessible"]'),

-- Boston Venues
('House of Blues Boston', 'house-of-blues-boston', '15 Lansdowne St', 'Boston', 'MA', 'USA', '02215', 42.3467, -71.0952, 'America/New_York', 2425, 'theater', '(888) 693-2583', 'https://www.houseofblues.com/boston', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', 'Premier live music venue near Fenway Park featuring rock, blues, and more.', '["wifi", "food", "bar", "accessible", "parking"]'),

('Paradise Rock Club', 'paradise-rock-club', '967 Commonwealth Ave', 'Boston', 'MA', 'USA', '02215', 42.3487, -71.1167, 'America/New_York', 933, 'club', '(617) 562-8800', 'https://crossroadspresents.com/paradise-rock-club', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'Intimate rock club that has hosted legendary acts since 1977.', '["bar", "accessible"]')

ON CONFLICT (slug) DO NOTHING;