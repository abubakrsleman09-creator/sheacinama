export interface WatchServer {
  id: string;
  name: string; // e.g., "FAST SERVER", "VIP SERVER", "OK.RU", "VIP PLAYER"
  url: string;  // Streaming embed URL / MP4 URL
}

export type ContentType = 'movie' | 'series';

export interface Movie {
  id: string;
  titleKurdish: string;
  titleEnglish: string;
  description: string;
  contentType: ContentType;
  category: string;
  rating: number;
  year: number;
  duration: string;
  isFeatured: boolean;
  posterUrl: string;
  bannerUrl: string;
  servers: WatchServer[];
  isPinned?: boolean; // Featured pin toggled in management
  createdAt: string;
}

export interface MovieRequest {
  id: string;
  movieTitle: string;
  contentType: ContentType;
  requesterName: string;
  createdAt: string;
  status: 'pending' | 'completed';
}

export interface PlatformStats {
  totalMovies: number;
  totalSeries: number;
  totalRequests: number;
  totalServersCount: number;
}
