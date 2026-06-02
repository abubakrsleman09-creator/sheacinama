import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Award, Send, Volume2, Shield, Flame, Activity } from 'lucide-react';

// Types
import { Movie } from './types';

// Components
import { Header } from './components/Header';
import { FeaturedBanner } from './components/FeaturedBanner';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetailModal } from './components/MovieDetailModal';
import { RequestMovieModal } from './components/RequestMovieModal';
import { AdminPanel } from './components/AdminPanel';

// Helper to safely save to localStorage and handle QuotaExceededError or other write failures gracefully
const safeSaveLocalMovies = (moviesList: Movie[]) => {
  try {
    localStorage.setItem('shea_cinema_user_movies', JSON.stringify(moviesList));
  } catch (error) {
    console.warn("Storage quota exceeded, trying to save lightweight/cleared movie list", error);
    try {
      // Clear massive payloads (base64 string images) to fit inside quota
      const lightweight = moviesList.map(movie => {
        let posterUrl = movie.posterUrl;
        let bannerUrl = movie.bannerUrl;
        if (posterUrl && posterUrl.startsWith('data:image') && posterUrl.length > 50000) {
          posterUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600";
        }
        if (bannerUrl && bannerUrl.startsWith('data:image') && bannerUrl.length > 50000) {
          bannerUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200";
        }
        return {
          ...movie,
          posterUrl,
          bannerUrl
        };
      });
      localStorage.setItem('shea_cinema_user_movies', JSON.stringify(lightweight));
    } catch (innerError) {
      console.error("Failed to save lightweight movies, saving only latest 10", innerError);
      try {
        const ultraLight = moviesList.slice(0, 10).map(movie => {
          let posterUrl = movie.posterUrl;
          let bannerUrl = movie.bannerUrl;
          if (posterUrl && posterUrl.startsWith('data:image')) {
            posterUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600";
          }
          if (bannerUrl && bannerUrl.startsWith('data:image')) {
            bannerUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200";
          }
          return { ...movie, posterUrl, bannerUrl };
        });
        localStorage.setItem('shea_cinema_user_movies', JSON.stringify(ultraLight));
      } catch (finalErr) {
        console.error("Absolutely failed to save to localStorage", finalErr);
      }
    }
  }
};

export default function App() {
  // DB State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Active navigation settings
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'movies' | 'series' | 'kurdish'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals Toggles
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Administration Toggle is gated inside App
  const [isAdminPanelActive, setIsAdminPanelActive] = useState(false);
  const [isAdminModeUnlocked, setIsAdminModeUnlocked] = useState(false); // Controls whether cards display edit/delete buttons

  // Load Movies on Startup
  const fetchMoviesList = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/movies');
      if (res.ok) {
        const rawServerMovies = await res.json() as Movie[];
        
        // Ensure rawServerMovies itself is unique
        const serverMovieMap = new Map<string, Movie>();
        rawServerMovies.forEach(m => {
          if (m && m.id) serverMovieMap.set(m.id, m);
        });
        const serverMovies = Array.from(serverMovieMap.values());
        
        // Load from LocalStorage to see if we have newer/custom movies
        const localMoviesStr = localStorage.getItem('shea_cinema_user_movies');
        let finalMovies = serverMovies;
        
        if (localMoviesStr) {
          try {
            const localMovies = JSON.parse(localMoviesStr) as Movie[];
            const movieMap = new Map<string, Movie>();
            
            // 1. Add unique server movies first
            serverMovies.forEach(m => movieMap.set(m.id, m));
            
            // 2. Add local movies (which may contain additional user-added movies lost from ephemeral container restart)
            let hasNewMovieToUpload = false;
            localMovies.forEach(m => {
              if (m && m.id && !movieMap.has(m.id)) {
                movieMap.set(m.id, m);
                hasNewMovieToUpload = true;
                
                // Proactively restore to the server if the server was reset/rebuilt
                fetch('/api/movies', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': 'ibos-808'
                  },
                  body: JSON.stringify(m)
                }).catch(err => console.error("Auto-sync back error", err));
              }
            });
            
            finalMovies = Array.from(movieMap.values());
            // Sort by createdAt descending
            finalMovies.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
            
            // If we restored movies, refresh from the server again after a brief moment
            if (hasNewMovieToUpload) {
              setTimeout(() => {
                fetch('/api/movies')
                  .then(r => r.json())
                  .then((latest: Movie[]) => {
                    const uniqueLatestMap = new Map<string, Movie>();
                    latest.forEach(m => {
                      if (m && m.id) uniqueLatestMap.set(m.id, m);
                    });
                    const uniqueLatest = Array.from(uniqueLatestMap.values());
                    setMovies(uniqueLatest);
                    safeSaveLocalMovies(uniqueLatest);
                  })
                  .catch(err => console.error("Delayed refresh error", err));
              }, 2000);
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        // Ensure final absolute unique set
        const finalUniqueMap = new Map<string, Movie>();
        finalMovies.forEach(m => {
          if (m && m.id) finalUniqueMap.set(m.id, m);
        });
        const absoluteUniqueMovies = Array.from(finalUniqueMap.values());
        
        setMovies(absoluteUniqueMovies);
        safeSaveLocalMovies(absoluteUniqueMovies);
      }
    } catch (err) {
      console.error("Failed loading index movies", err);
      // Fallback complete to local storage
      const localMoviesStr = localStorage.getItem('shea_cinema_user_movies');
      if (localMoviesStr) {
        try {
          setMovies(JSON.parse(localMoviesStr));
        } catch (e) {
          console.error(e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoviesList();

    // Check query params if user shared a direct movie link
    const params = new URLSearchParams(window.location.search);
    const sharedMovieId = params.get('movie');
    if (sharedMovieId) {
      fetch(`/api/movies`)
        .then(res => res.json())
        .then((allMovies: Movie[]) => {
          const match = allMovies.find(m => m.id === sharedMovieId);
          if (match) {
            setSelectedMovie(match);
            setIsDetailOpen(true);
          }
        });
    }
  }, []);

  // Filter Logic
  const filteredMovies = movies.filter((movie) => {
    // 1. Text Search Filter (Match both Kurdish and English Title)
    const matchesSearch =
      searchQuery.trim() === '' ||
      movie.titleKurdish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.titleEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movie.category && movie.category.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Tab Category Filter
    if (activeTab === 'movies') {
      return matchesSearch && movie.contentType === 'movie';
    }
    if (activeTab === 'series') {
      return matchesSearch && movie.contentType === 'series';
    }
    if (activeTab === 'kurdish') {
      return matchesSearch && movie.category === 'Kurdish';
    }

    return matchesSearch; // For 'home', show all
  });

  // Calculate Candidates for Hero Billboard Banner rotation (Featured or Pinned movies, or fall back to the latest 5 movies)
  const getBannerMovies = (): Movie[] => {
    const candidates = movies.filter(m => m.isFeatured || m.isPinned);
    if (candidates.length > 0) return candidates;
    return movies.slice(0, 5); // fallback to latest 5
  };

  const bannerMovies = getBannerMovies();
  const featuredMovie = bannerMovies[currentBannerIndex] || bannerMovies[0] || null;

  // Automatically advance slides every 6 seconds
  useEffect(() => {
    if (bannerMovies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerMovies.length);
    }, 6000); // changes every 6 seconds
    return () => clearInterval(interval);
  }, [bannerMovies.length]);

  const handleOpenPlayer = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailOpen(true);
  };

  // Admin capabilities (directly triggers from unlocked state on main grids)
  const handleDeleteMovie = async (id: string) => {
    if (!window.confirm("دڵنیای لە سڕینەوەی ئەم بابەتە؟")) return;
    try {
      const response = await fetch(`/api/movies/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': 'ibos-808' } // Passcode matches backend seed
      });
      if (response.ok) {
        // Remove from local storage first to sync
        const localMoviesStr = localStorage.getItem('shea_cinema_user_movies');
        if (localMoviesStr) {
          try {
            const localMovies = JSON.parse(localMoviesStr) as Movie[];
            const updated = localMovies.filter(m => m.id !== id);
            safeSaveLocalMovies(updated);
          } catch (e) {
            console.error("Local storage delete sync error", e);
          }
        }
        fetchMoviesList();
      } else {
        alert("سڕینەوە ئەنجام نەدرا");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePinMovie = async (movie: Movie) => {
    try {
      const response = await fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'ibos-808'
        },
        body: JSON.stringify({ isPinned: !movie.isPinned })
      });
      if (response.ok) {
        fetchMoviesList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMovieDirect = (movie: Movie) => {
    // Redirects to admin panel view with editing state
    setIsAdminPanelActive(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      {/* Top Header Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenRequestModal={() => setIsRequestOpen(true)}
        onAdminToggle={() => {
          setIsAdminPanelActive(!isAdminPanelActive);
          // Auto unlock admin layout tools on the front grids if we just closed/reopened
          setIsAdminModeUnlocked(!isAdminModeUnlocked);
        }}
        isAdmin={isAdminModeUnlocked}
      />

      <main className="flex-grow pb-16">
        <AnimatePresence mode="wait">
          {isAdminPanelActive ? (
            /* ADMIN SECTION WORKSPACE (Hidden by passcode protection) */
            <motion.div
              key="admin-workspace"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <AdminPanel
                movies={movies}
                onRefreshMovies={() => {
                  fetchMoviesList();
                  setIsAdminModeUnlocked(true); // Persist cards edit visual triggers
                }}
                onClosePanel={() => {
                  setIsAdminPanelActive(false);
                  setIsAdminModeUnlocked(false); // Lock card controls on front-end
                }}
              />
            </motion.div>
          ) : (
            /* PUBLIC USER EXPERIENCE SYSTEM */
            <motion.div
              key="pulic-website"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-7xl mx-auto px-4 md:px-8 pt-6"
            >
              {/* Load Loader Indicator */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-t-[#FFC80A] border-[#222222] animate-spin mb-4" />
                  <p className="text-xs text-gray-500 font-bold">باردەکرێت... تکایە چاوەڕوان بە</p>
                </div>
              ) : (
                <>
                  {/* 1. Hero Spotlight Featured Billboard */}
                  {featuredMovie && activeTab === 'home' && !searchQuery && (
                    <FeaturedBanner
                      movie={featuredMovie}
                      onSelectMovie={handleOpenPlayer}
                      currentIndex={currentBannerIndex}
                      totalCount={bannerMovies.length}
                      onChangeIndex={(idx) => setCurrentBannerIndex(idx)}
                    />
                  )}

                  {/* 2. Headline curation subtitle shown in Image 2 footer text */}
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-right rtl-dir shadow-lg mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFC80A]/10 border border-[#FFC80A]/20 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-[#FFC80A] animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-white leading-tight">پلاتفۆرمی فەرمی شیا سینەما</h2>
                        <p className="text-xs text-amber-400 mt-1">ئێمە نوێترین فیلمەکان لەگەڵ ئەو فیلمانەی تری ترێند بە بەرزترین کوالیتی بڵاو دەکەینەوە.</p>
                      </div>
                    </div>

                    <a
                      href="https://t.me/sheacinema_offical"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-[#FFC80A]/10 border border-[#FFC80A]/30 text-[#FFC80A] hover:bg-[#FFC80A] hover:text-black font-extrabold px-4.5 py-2.5 rounded-xl transition-all duration-300"
                    >
                      پەیوەندی بە تەلەگرام بکە 🚀
                    </a>
                  </div>

                  {/* 3. Section headline depending on tab */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 rtl-dir">
                      <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-5 bg-[#FFC80A] rounded-full inline-block"></span>
                        {activeTab === 'home' && searchQuery && 'ئەنجامەکانی گەڕان'}
                        {activeTab === 'home' && !searchQuery && 'نوێترین و گەرمترین بڵاوکراوەکان 🔥'}
                        {activeTab === 'movies' && 'فیلمەکان (Movies)'}
                        {activeTab === 'series' && 'زنجیرە تلویزیۆنیەکان (Series)'}
                        {activeTab === 'kurdish' && 'بەرهەمی ناوازەی کوردی (Kurdish)'}
                      </h2>
                      <span className="text-xs text-gray-400 bg-[#1a1a1a] border border-white/10 px-3 py-1 rounded-full font-bold">
                        تەواوی بابەتەکان {filteredMovies.length}
                      </span>
                    </div>

                    {/* Movie Catalog Grid */}
                    <MovieGrid
                      movies={filteredMovies}
                      isAdmin={isAdminModeUnlocked}
                      onSelectMovie={handleOpenPlayer}
                      onEditMovie={handleEditMovieDirect}
                      onDeleteMovie={handleDeleteMovie}
                      onTogglePinMovie={handleTogglePinMovie}
                    />
                  </div>

                  {/* 4. Help Request Promotion Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 text-right rtl-dir flex flex-col justify-between space-y-4 shadow-lg">
                      <div>
                        <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider block mb-1">REQEST BOX</span>
                        <h3 className="text-base font-bold text-white mb-2">فیلمێک هەیە دەتەوێت؟</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          ئەگەر سەیری پلاتفۆرمەکەت کردوو هەر فیلم یان زنجیرەیەکت دەست نەکەوت، تکایە ڕاستەوخۆ داوامان لێبکە تا لە خێراترین کات پۆستی بکەین.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsRequestOpen(true)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:text-[#FFC80A] text-white font-bold text-xs py-2.5 rounded-lg transition"
                      >
                        داواکردنی فیلمی نوێ 🍿
                      </button>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 text-right rtl-dir flex flex-col justify-between space-y-4 shadow-lg">
                      <div>
                        <span className="text-[10px] text-[#FFC80A] font-mono font-bold uppercase tracking-wider block mb-1">TELEGRAM GROUP</span>
                        <h3 className="text-base font-bold text-white mb-2">کەناڵی فەرمی تیلیگرام</h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          بۆ دابین کردنی نوێترین فیلمەکان لەگەڵ ترێندە بەهێزەکان پێش هەمووان، پەیوەندیمان پێوە بکەن و ستافی شیا ببینن لێرەوە.
                        </p>
                      </div>
                      <a
                        href="https://t.me/sheacinema_offical"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#FFC80A] hover:bg-[#E2B200] text-black font-black text-xs py-2.5 rounded-lg transition shrink-0 block text-center"
                      >
                        کلیک بکە بۆ چوونە ناو تیلیگرامەکەمان
                      </a>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer credits matches exact Kurdish requested text */}
      <footer className="bg-[#1a1a1a] border-t border-white/10 pt-8 pb-18 px-4 md:px-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-600 order-3 md:order-1 font-mono">
            Shea Cinema © 2026. All rights reserved.
          </div>

          <div className="flex items-center gap-4 order-2 text-[11px]">
            <a href="https://t.me/sheacinema_offical" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFC80A] transition">
              Telegram Channel
            </a>
            <span className="text-gray-800">•</span>
            <span className="text-gray-400 font-semibold">
              دیزاین کراوە لە لایەن shea cinema 2026
            </span>
          </div>

          <div className="flex items-center gap-2 order-1 md:order-3">
            <span className="font-bold text-sm tracking-widest text-white">
              SHEA <span className="text-[#FFC80A]">CINEMA</span>
            </span>
            <div className="w-6 h-6">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M50 32C40 32 32 38 32 45C32 52 40 54 50 56C58 58 64 60 64 68C64 76 56 82 45 82C32 82 24 75 22 68H34C36 71 40 74 45 74C50 74 53 72 53 68C53 64 48 62 40 60C30 58 22 55 22 45C22 35 32 28 45 28C56 28 64 34 66 40H54C52 36 50 32 50 32Z" fill="#FFC80A" />
                <path d="M85 36H73C75 40 76 45 76 50C76 55 75 60 73 64H85C87 60 88 55 88 50C88 45 87 40 85 36ZM73 28C85 28 94 38 94 50C94 62 85 72 73 72V64C81 64 86 58 86 50C86 42 81 36 73 36V28Z" fill="#FFFFFF" fillOpacity="0.9" />
              </svg>
            </div>
          </div>
        </div>
      </footer>

      {/* Cinematic Detail Play movie Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        isOpen={isDetailOpen}
        onClose={() => {
          setSelectedMovie(null);
          setIsDetailOpen(false);
          // clear URL queries on modal close
          const url = new URL(window.location.href);
          url.searchParams.delete('movie');
          window.history.pushState({}, '', url.toString());
        }}
      />

      {/* Users requesting pop-up modal */}
      <RequestMovieModal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        onSubmitSuccess={() => {}}
      />

      {/* Sticky Quick Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-[#FFC80A] px-4 md:px-8 flex items-center justify-between text-black text-[11.5px] font-black z-40 select-none shadow-2xl">
        <div className="flex gap-4 md:gap-7 overflow-x-auto no-scrollbar py-1">
          <span className="shrink-0 uppercase tracking-tighter">نوێترین بڵاوکراوە: <span className="underline font-black">{(movies.length > 0 && movies[0].titleKurdish) || "دیار عەرەب"}</span></span>
          <span className="shrink-0 text-black/30">•</span>
          <span className="shrink-0 uppercase tracking-tighter">فیلمی پێشنیارکراو: <span className="underline font-black">{(movies.find(m => m.isPinned)?.titleKurdish) || "جەنگی جیهانی"}</span></span>
          <span className="shrink-0 text-black/30">•</span>
          <span className="shrink-0 uppercase tracking-tighter">بەرهەمی کوردی: <span className="underline font-black">{movies.filter(m => m.category === 'Kurdish').length} دانە</span></span>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-mono text-[10px] md:text-[11px]">
          <span className="hidden md:inline font-bold">SERVER STATUS: ONLINE</span>
          <span className="bg-black text-[#FFC80A] px-2 py-0.5 rounded font-black">NISSAN API v4.2</span>
        </div>
      </div>
    </div>
  );
}
