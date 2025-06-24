export const musicTokens = {
  colors: {
    spotify: '#1DB954',
    spotifyDark: '#1ed760',
    vinyl: '#2a2a2a',
    stage: '#ff6b35',
    audience: '#4a90e2',
    vote: {
      up: '#22c55e',
      down: '#ef4444',
      neutral: '#64748b',
    },
  },
  spacing: {
    setlistGap: '0.75rem',
    cardPadding: '1.5rem',
    searchRadius: '0.75rem',
  },
  typography: {
    artistName: 'font-bold text-2xl tracking-tight',
    showTitle: 'font-semibold text-lg',
    songTitle: 'font-medium text-base',
    venueName: 'font-medium text-sm text-muted-foreground',
  },
} as const;

export type MusicTokens = typeof musicTokens; 