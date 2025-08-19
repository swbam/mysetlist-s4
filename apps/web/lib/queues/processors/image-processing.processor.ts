import { Job } from "bullmq";
import { db, artists, shows, venues } from "@repo/database";
import { eq } from "drizzle-orm";
import { RedisCache } from "../redis-config";

const cache = new RedisCache();

export interface ImageProcessingJobData {
  type: 'artist' | 'show' | 'venue' | 'song';
  entityId: string;
  imageUrl: string;
  priority?: 'high' | 'normal' | 'low';
  operations?: {
    resize?: { width: number; height: number };
    compress?: { quality: number };
    generateThumbnail?: boolean;
  };
}

export async function processImageProcessing(job: Job<ImageProcessingJobData>) {
  const { type, entityId, imageUrl, operations } = job.data;
  
  try {
    await job.log(`Processing image for ${type} ${entityId}`);
    await job.updateProgress(10);
    
    if (!imageUrl) {
      throw new Error("No image URL provided");
    }
    
    // For now, just validate the image URL and update the entity
    // In a full implementation, you would:
    // 1. Download the image
    // 2. Process it (resize, compress, etc.)
    // 3. Upload to CDN/storage
    // 4. Update database with new URLs
    
    await job.updateProgress(30);
    
    // Validate image URL
    const isValidImage = await validateImageUrl(imageUrl);
    if (!isValidImage) {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }
    
    await job.updateProgress(60);
    
    // Process based on entity type
    switch (type) {
      case 'artist':
        await processArtistImage(entityId, imageUrl, operations);
        break;
      case 'show':
        await processShowImage(entityId, imageUrl, operations);
        break;
      case 'venue':
        await processVenueImage(entityId, imageUrl, operations);
        break;
      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }
    
    await job.updateProgress(100);
    await job.log(`Image processing completed for ${type} ${entityId}`);
    
    return {
      success: true,
      entityId,
      type,
      processedUrl: imageUrl, // In real implementation, this would be the new processed URL
    };
    
  } catch (error) {
    console.error(`Image processing failed for ${type} ${entityId}:`, error);
    throw error;
  }
}

async function validateImageUrl(url: string): Promise<boolean> {
  try {
    // Basic URL validation
    new URL(url);
    
    // Check if it's an image URL (basic check)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );
    
    // For a real implementation, you'd also:
    // 1. Make a HEAD request to check if the URL is accessible
    // 2. Verify the content-type header
    // 3. Check image dimensions/size
    
    return hasImageExtension || url.includes('images') || url.includes('photo');
  } catch (error) {
    return false;
  }
}

async function processArtistImage(artistId: string, imageUrl: string, operations?: any) {
  // In a real implementation, you would:
  // 1. Download and process the image
  // 2. Generate multiple sizes (small, medium, large)
  // 3. Upload to CDN
  // 4. Update database with new URLs
  
  // For now, just update the existing image URL
  await db
    .update(artists)
    .set({
      imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));
}

async function processShowImage(showId: string, imageUrl: string, operations?: any) {
  await db
    .update(shows)
    .set({
      imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(shows.id, showId));
}

async function processVenueImage(venueId: string, imageUrl: string, operations?: any) {
  await db
    .update(venues)
    .set({
      imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, venueId));
}

// Helper function to queue image processing
export async function queueImageProcessing(
  type: ImageProcessingJobData['type'],
  entityId: string,
  imageUrl: string,
  priority: 'high' | 'normal' | 'low' = 'normal'
) {
  const { queueManager, QueueName } = await import("../queue-manager");
  
  return await queueManager.addJob(
    QueueName.IMAGE_PROCESSING,
    `process-image-${type}-${entityId}`,
    {
      type,
      entityId,
      imageUrl,
      priority,
    },
    {
      priority: priority === 'high' ? 1 : priority === 'normal' ? 10 : 20,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 10 },
    }
  );
}