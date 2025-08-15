#!/bin/bash
# Script to fix all TypeScript field name mismatches in service files
# This aligns the code with the database schema changes

echo "Fixing TypeScript field name mismatches..."

# Directory containing service files
SERVICES_DIR="packages/external-apis/src/services"

# Fix ticketmasterId -> tmAttractionId for artists
echo "Fixing artist ticketmasterId -> tmAttractionId..."
sed -i '' 's/ticketmasterId:/tmAttractionId:/g' "$SERVICES_DIR"/*.ts
sed -i '' 's/ticketmasterId\?/tmAttractionId/g' "$SERVICES_DIR"/*.ts
sed -i '' 's/result\.ticketmasterId/result.tmAttractionId/g' "$SERVICES_DIR"/*.ts

# Fix venue ticketmasterId -> tmVenueId
echo "Fixing venue ticketmasterId -> tmVenueId..."
sed -i '' 's/venues\.ticketmasterId/venues.tmVenueId/g' "$SERVICES_DIR"/*.ts

# Fix show ticketmasterId -> tmEventId
echo "Fixing show ticketmasterId -> tmEventId..."
sed -i '' 's/shows\.ticketmasterId/shows.tmEventId/g' "$SERVICES_DIR"/*.ts

# Fix songs title -> name
echo "Fixing songs title -> name..."
sed -i '' 's/songs\.title/songs.name/g' "$SERVICES_DIR"/*.ts
sed -i '' 's/title: track\.name/name: track.name/g' "$SERVICES_DIR"/*.ts
sed -i '' 's/title: songData\.name/name: songData.name/g' "$SERVICES_DIR"/*.ts

# Fix album -> albumName
echo "Fixing album -> albumName..."
sed -i '' 's/songs\.album/songs.albumName/g' "$SERVICES_DIR"/*.ts

# Additional specific fixes for variable names and interfaces
echo "Fixing interface definitions..."
sed -i '' 's/ticketmasterId: string/tmAttractionId: string/g' "$SERVICES_DIR"/*.ts

# Fix WHERE clauses and conditions
echo "Fixing WHERE clauses..."
sed -i '' 's/\.ticketmasterId\([^:]\)/\.tmAttractionId\1/g' "$SERVICES_DIR"/*.ts

echo "TypeScript field fixes completed!"

# Verify changes
echo "Checking for any remaining old field names..."
if grep -r "ticketmasterId\|songs\.title\|songs\.album[^N]" "$SERVICES_DIR" | grep -v ".sh:"; then
    echo "⚠️  Some old field names may still exist. Please review manually."
else
    echo "✅ All field names appear to be updated correctly."
fi