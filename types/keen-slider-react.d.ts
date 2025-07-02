declare module 'keen-slider/react' {
  import * as React from 'react';
  export interface KeenSliderOptions {
    mode?: 'free' | 'free-snap' | 'snap';
    slides?: {
      perView?: number;
      spacing?: number;
    };
    breakpoints?: Record<string, KeenSliderOptions>;
  }
  export function useKeenSlider<T extends HTMLElement = HTMLElement>(
    options?: KeenSliderOptions
  ): [React.RefObject<T>];
}