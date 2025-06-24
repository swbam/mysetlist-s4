import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGeolocation } from '@/lib/geolocation';
import { toast } from 'sonner';

export function useVenueGeolocation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { position, error, loading, requestPosition } = useGeolocation({
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 300000, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Geolocation error:', error);
      if (error.code === 1) {
        toast.error('Location access denied', {
          description: 'Enable location services to see venues near you',
        });
      }
    }
  }, [error]);

  useEffect(() => {
    if (position && !searchParams.get('lat')) {
      const params = new URLSearchParams(searchParams);
      params.set('lat', position.latitude.toString());
      params.set('lng', position.longitude.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [position, searchParams, router]);

  const updateLocation = async () => {
    await requestPosition();
  };

  const clearLocation = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('lat');
    params.delete('lng');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return {
    position: position || (searchParams.get('lat') && searchParams.get('lng') ? {
      latitude: parseFloat(searchParams.get('lat')!),
      longitude: parseFloat(searchParams.get('lng')!),
    } : null),
    error,
    loading,
    updateLocation,
    clearLocation,
    hasLocation: !!(position || (searchParams.get('lat') && searchParams.get('lng'))),
  };
}