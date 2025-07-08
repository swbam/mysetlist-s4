declare module 'keen-slider/react' {
  export interface KeenSliderInstance {
    update(): void;
    destroy(): void;
  }

  export interface KeenSliderOptions {
    slides?: {
      perView?: number;
      spacing?: number;
    };
    mode?: 'free' | 'free-snap' | 'snap';
    breakpoints?: Record<string, KeenSliderOptions>;
  }

  // React hook signature
  export function useKeenSlider<T extends HTMLElement = HTMLElement>(
    options?: KeenSliderOptions
  ): [(node: T | null) => void, KeenSliderInstance | null];

  // This lib also exports a plain CSS class util but we only need hook typings.
  const _default: Record<string, never>;
  export default _default;
}
