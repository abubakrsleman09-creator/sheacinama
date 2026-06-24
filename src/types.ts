export interface StreamServer {
  id: string;
  name: string;
  url: string;
}

export interface Episode {
  id: string;
  episodeNumber: string; // e.g., "1" or "١"
  title?: string;        // Optional name of episode
  servers: StreamServer[];
}

export interface Season {
  id: string;
  seasonNumber: string;  // e.g., "1" or "١"
  title?: string;        // Optional name of season (e.g. "وەرزی یەکەم")
  episodes: Episode[];
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  year: string;
  category: "فیلم" | "زنجیرە" | "ئەنیمێ" | "دۆکیومێنتاری" | string;
  genre: string; // e.g., "ئاکشن, دراما, سەرکێشی"
  rating: string; // e.g., "8.7"
  posterUrl: string;
  bannerUrl?: string; // Larger high-quality backdrop
  servers: StreamServer[];
  seasons?: Season[]; // Optional TV series seasons and episodes configuration
  isTrending: boolean;
  isLiveSpotlight?: boolean;
  liveViewers?: number;
  createdAt: any; // Firestore serverTimestamp
  updatedAt?: any;
  views?: number; // View counts/clicks
}
