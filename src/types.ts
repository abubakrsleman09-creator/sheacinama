export interface StreamServer {
  id: string;
  name: string;
  url: string;
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
  isTrending: boolean;
  createdAt: any; // Firestore serverTimestamp
  updatedAt?: any;
}
