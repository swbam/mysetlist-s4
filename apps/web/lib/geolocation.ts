export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export const GEOLOCATION_ERRORS = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
};

export class GeolocationService {
  private static watchId: number | null = null;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  static async getCurrentPosition(
    options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS
  ): Promise<GeolocationPosition> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(this.handleError(error));
        },
        options
      );
    });
  }

  static watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationError) => void,
    options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS
  ): number {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    this.clearWatch();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        if (onError) {
          onError(this.handleError(error));
        }
      },
      options
    );

    return this.watchId;
  }

  static clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private static handleError(error: GeolocationPositionError): GeolocationError {
    let message = 'Unknown error occurred';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access for this site.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please check your device settings.';
        break;
      case error.TIMEOUT:
        message = 'Request timed out. Please try again.';
        break;
    }

    return {
      code: error.code,
      message,
    };
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'km' | 'miles' = 'km'
  ): number {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  static formatDistance(distance: number, unit: 'km' | 'miles' = 'km'): string {
    if (unit === 'km') {
      return distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${distance.toFixed(1)}km`;
    } else {
      return distance < 0.1
        ? `${Math.round(distance * 5280)}ft`
        : `${distance.toFixed(1)}mi`;
    }
  }
}

// React hook for geolocation
import { useState, useEffect, useCallback } from 'react';

export interface UseGeolocationOptions extends PositionOptions {
  watch?: boolean;
  onError?: (error: GeolocationError) => void;
}

export function useGeolocation(options?: UseGeolocationOptions) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPosition = useCallback(async () => {
    if (!GeolocationService.isSupported()) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pos = await GeolocationService.getCurrentPosition(options);
      setPosition(pos);
    } catch (err) {
      setError(err as GeolocationError);
      options?.onError?.(err as GeolocationError);
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    if (options?.watch) {
      const watchId = GeolocationService.watchPosition(
        (pos) => {
          setPosition(pos);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
          options?.onError?.(err);
        },
        options
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [options]);

  return {
    position,
    error,
    loading,
    requestPosition,
    isSupported: GeolocationService.isSupported(),
  };
}