import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, where, setDoc, deleteDoc } from "firebase/firestore";
import { auth, signInWithPopup, signOut, googleProvider, db } from "./firebase";
import { Movie } from "./types";
import { handleFirestoreError, OperationType } from "./firestoreErrorHandler";

// Import custom sections
import Navbar from "./components/Navbar";
import MovieCard from "./components/MovieCard";
import MovieDetail from "./components/MovieDetail";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import EditProfileModal from "./components/EditProfileModal";

// Import visual assets / vector components
import { Film, Send, Sparkles, LogIn, Star, Play, CheckCircle2, Tv, RefreshCw, Key, AlertCircle, ChevronLeft, ChevronRight, Heart, Bookmark } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [customPhotoURL, setCustomPhotoURL] = useState<string | null>(null);
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("هەمووی");
  const [isLoding, setIsLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // User list states
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);

  // Secret bypass password field for offline/local testing
  const [bypassInput, setBypassInput] = useState("");
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Select movie and trigger views increment in Firestore
  const handleSelectMovie = async (movie: Movie) => {
    setSelectedMovie(movie);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const movieRef = doc(db, "movies", movie.id);
      await updateDoc(movieRef, {
        views: increment(1)
      });
    } catch (err) {
      console.warn("Failed to increment views:", err);
    }
  };

  // Authenticate Admin based on email (abubakrsleman09@gmail.com)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email === "abubakrsleman09@gmail.com") {
        setIsAdmin(true);
      } else {
        // Also check if local storage has manual admin bypass
        const bypassActive = localStorage.getItem("shea_admin_bypass") === "true";
        setIsAdmin(currentUser?.email === "abubakrsleman09@gmail.com" || bypassActive);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization for custom user profile from Firestore
  useEffect(() => {
    if (!user) {
      setCustomPhotoURL(null);
      setCustomDisplayName(null);
      return;
    }

    const profileRef = doc(db, "profiles", user.uid);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.photoURL) {
          setCustomPhotoURL(d.photoURL);
        } else {
          setCustomPhotoURL(null);
        }
        if (d.displayName) {
          setCustomDisplayName(d.displayName);
        } else {
          setCustomDisplayName(null);
        }
      } else {
        setCustomPhotoURL(null);
        setCustomDisplayName(null);
      }
    }, (err) => {
      console.warn("Error getting real-time profile config:", err);
    });

    return () => unsubProfile();
  }, [user]);

  // Real-time synchronization for Favorites & Watchlist of authenticated user
  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      setWatchlistIds([]);
      return;
    }

    const favQuery = query(collection(db, "favorites"), where("userId", "==", user.uid));
    const unsubFav = onSnapshot(favQuery, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.movieId) {
          ids.push(d.movieId);
        }
      });
      setFavoriteIds(ids);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "favorites");
    });

    const watchQuery = query(collection(db, "watchlist"), where("userId", "==", user.uid));
    const unsubWatch = onSnapshot(watchQuery, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.movieId) {
          ids.push(d.movieId);
        }
      });
      setWatchlistIds(ids);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "watchlist");
    });

    return () => {
      unsubFav();
      unsubWatch();
    };
  }, [user]);

  // Handle toggling favorites in Firestore
  const handleToggleFavorite = async (movieId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const isFav = favoriteIds.includes(movieId);
    const favRef = doc(db, "favorites", `${user.uid}_${movieId}`);
    try {
      if (isFav) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          userId: user.uid,
          movieId: movieId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, isFav ? OperationType.DELETE : OperationType.WRITE, `favorites/${user.uid}_${movieId}`);
    }
  };

  // Handle toggling watchlist in Firestore
  const handleToggleWatchlist = async (movieId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const isWatch = watchlistIds.includes(movieId);
    const watchRef = doc(db, "watchlist", `${user.uid}_${movieId}`);
    try {
      if (isWatch) {
        await deleteDoc(watchRef);
      } else {
        await setDoc(watchRef, {
          userId: user.uid,
          movieId: movieId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, isWatch ? OperationType.DELETE : OperationType.WRITE, `watchlist/${user.uid}_${movieId}`);
    }
  };

  // Fetch Movies in Real-time from Firestore!
  useEffect(() => {
    setIsLoading(true);
    const moviesQuery = query(collection(db, "movies"));

    const unsubscribe = onSnapshot(
      moviesQuery,
      (snapshot) => {
        const loadedMovies: Movie[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedMovies.push({
            id: docSnap.id,
            ...data,
          } as Movie);
        });

        // Robust client-side sort (descending order by createdAt, then fallback to updatedAt, then default to 0)
        loadedMovies.sort((a, b) => {
          const getTime = (val: any, fallbackVal?: any) => {
            const current = val || fallbackVal;
            if (!current) return 0;
            // Handle Firebase Timestamp with toMillis
            if (typeof current.toMillis === "function") return current.toMillis();
            // Handle regular Firebase Timestamp object
            if (current.seconds) {
              return current.seconds * 1000 + Math.floor((current.nanoseconds || 0) / 1000000);
            }
            // Handle standard Javascript Date
            if (current instanceof Date) return current.getTime();
            // Handle Date strings
            if (typeof current === "string") return new Date(current).getTime();
            // Handle already converted milliseconds
            if (typeof current === "number") return current;
            return 0;
          };

          const timeA = getTime(a.createdAt, a.updatedAt);
          const timeB = getTime(b.createdAt, b.updatedAt);

          if (timeB !== timeA) {
            return timeB - timeA; // Newest first
          }
          // Secondary alphabetical sort on ID as tiebreaker
          return (b.id || "").localeCompare(a.id || "");
        });

        setMovies(loadedMovies);
        setIsLoading(false);

        // Check if there is a deep link query in URL: e.g. /?movie=movieId
        const params = new URLSearchParams(window.location.search);
        const movieIdParam = params.get("movie");
        if (movieIdParam) {
          const matchedMovie = loadedMovies.find((m) => m.id === movieIdParam);
          if (matchedMovie) {
            setSelectedMovie(matchedMovie);
            
            // Increment views on direct URL access (once per session)
            try {
              const hasViewed = sessionStorage.getItem(`viewed_${matchedMovie.id}`);
              if (!hasViewed) {
                sessionStorage.setItem(`viewed_${matchedMovie.id}`, "true");
                const movieRef = doc(db, "movies", matchedMovie.id);
                updateDoc(movieRef, {
                  views: increment(1)
                });
              }
            } catch (err) {
              console.warn("Direct link view increment error:", err);
            }
          }
        }
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, "movies");
      }
    );

    return () => unsubscribe();
  }, []);

  // Trigger Authentication Modal
  const handleLogin = () => {
    setShowAuthWarning(false);
    setIsAuthModalOpen(true);
  };

  // Trigger Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("shea_admin_bypass");
      setIsAdmin(false);
      setShowAdminPanel(false);
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  // Check Developer Bypass Secret
  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bypassInput.trim() === "ibo-808") {
      localStorage.setItem("shea_admin_bypass", "true");
      setIsAdmin(true);
      setShowAdminPanel(true);
      setShowBypassModal(false);
      setBypassInput("");
    } else {
      alert("نهێنییەکە هەڵەیە! جارێکی تر هەوڵبەوه.");
    }
  };

  // Filter movies by search query and category
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch =
      movie.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.genre?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "هەمووی" ||
      (activeCategory === "ترێندینگ" && movie.isTrending) ||
      (activeCategory === "دڵخوازەکانم" && favoriteIds.includes(movie.id)) ||
      (activeCategory === "لیستی بینین" && watchlistIds.includes(movie.id)) ||
      movie.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Spotlight Movies Carousel (Trending first, fallback to all, up to 6 slides)
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const finalSpotlights = React.useMemo(() => {
    const trending = movies.filter((m) => m.isTrending);
    const pool = trending.length > 0 ? trending : movies;
    return pool.slice(0, 6);
  }, [movies]);

  const spotlightMovie = finalSpotlights[spotlightIndex] || null;

  // Safeguard index if finalSpotlights shrink
  useEffect(() => {
    if (spotlightIndex >= finalSpotlights.length && finalSpotlights.length > 0) {
      setSpotlightIndex(0);
    }
  }, [finalSpotlights.length, spotlightIndex]);

  // Automatic slide rotation every 6 seconds
  useEffect(() => {
    if (finalSpotlights.length <= 1) return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % finalSpotlights.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [finalSpotlights.length]);

  const handlePrevSlide = () => {
    if (finalSpotlights.length === 0) return;
    setSpotlightIndex((prev) => (prev - 1 + finalSpotlights.length) % finalSpotlights.length);
  };

  const handleNextSlide = () => {
    if (finalSpotlights.length === 0) return;
    setSpotlightIndex((prev) => (prev + 1) % finalSpotlights.length);
  };

  return (
    <div className="min-h-screen bg-[#070708] text-stone-100 font-sans select-none antialiased selection:bg-yellow-500 selection:text-stone-950">
      
      {/* Interactive Navigation bar */}
      <Navbar
        user={user}
        customPhotoURL={customPhotoURL}
        customDisplayName={customDisplayName}
        isAdmin={isAdmin}
        onLoginClick={handleLogin}
        onLogoutClick={handleLogout}
        onEditProfileClick={() => setIsEditProfileOpen(true)}
        onAdminPanelToggle={() => setShowAdminPanel(!showAdminPanel)}
        showAdminPanel={showAdminPanel}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Areas */}
      <main className="min-h-[calc(100vh-230px)]">
        {showAdminPanel && isAdmin ? (
          /* Site Control Section for Admin (Kurdish) */
          <AdminPanel
            user={user}
            isAdmin={isAdmin}
            movies={movies}
            onMovieSaved={() => {}}
            onEditMovie={(movie) => {
              // Action when editing starts
            }}
          />
        ) : selectedMovie ? (
          /* Expanded details video screen overlay */
          <MovieDetail
            movie={selectedMovie}
            user={user}
            customPhotoURL={customPhotoURL}
            customDisplayName={customDisplayName}
            favoriteIds={favoriteIds}
            watchlistIds={watchlistIds}
            onToggleFavorite={handleToggleFavorite}
            onToggleWatchlist={handleToggleWatchlist}
            onLoginClick={handleLogin}
            onClose={() => {
              setSelectedMovie(null);
              // Clean address bar query parameter
              window.history.pushState({}, "", "/");
            }}
          />
        ) : (
          /* Main Public Front Catalogue */
          <div>
            {isLoadingMovies() ? (
              /* High-end luxurious animated loader */
              <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-stone-400">
                <RefreshCw size={36} className="animate-spin text-yellow-400" />
                <span className="text-xs font-sans">تکایە چاوەڕوانبە، داتاکان لۆد دەبن...</span>
              </div>
            ) : movies.length === 0 ? (
              /* Clean Cinematic Welcome State for the Shea Cinema Creator */
              <div className="mx-auto max-w-4xl px-4 py-20 text-center rtl-dir">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 mb-6 shadow-xl">
                  <Film size={32} className="stroke-[2.5]" />
                </div>
                <h1 className="text-2xl font-black md:text-3xl lg:text-4xl text-white font-sans tracking-tight mb-4">
                  بەخێربێیت بۆ <span className="text-yellow-400">SHEA CINEMA</span>
                </h1>
                <p className="text-stone-400 text-sm max-w-lg mx-auto font-sans leading-relaxed mb-8">
                  ئەمە پلاتفۆرمی کارا و فەرمییەکەتە بۆ بڵاوکردنەوەی ناوازەترین فیلم و زنجیرەکان.
                  سایتەکە بە سەرکەوتوویی دروستکرا و پەیوەستە بە داتابەیسی بێسنوور بۆ بینینی خێرا!
                  بەگوێرەی داواکاریەکەت هیچ فیلمێکی وەهمی لێرەدا نییە تاوەکو خۆت هەمووی داخڵ بکەیت.
                </p>

                {/* Integration Help Card */}
                <div className="rounded-2xl border border-stone-800 bg-[#0e0e11] p-6 text-right max-w-xl mx-auto space-y-4">
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-widest flex items-center justify-start gap-1">
                    <Sparkles size={14} className="text-yellow-400" />
                    <span>چۆن فیلم یان زنجیرەی تر زیاد دەکەم؟</span>
                  </h3>
                  <ol className="text-xs text-stone-400 space-y-2.5 list-decimal list-inside pr-2 leading-relaxed">
                    <li>لە بالای وێبسایتەکە کلیک بکە سەر دوگمەی <b>چوونەژوورەوە (Google Login)</b></li>
                    <li>ئەگەر لە ڕێگای ئیمەیڵەکەت وەک بەڕێوەبەر <b>abubakrsleman09@gmail.com</b> چوویتە ژوورەوە، دوگمەی <b>کۆنترۆڵ پانێڵ</b> بە شێوازی فەرمی دەکریتەوە.</li>
                    <li>دەتوانیت سێرڤەر بە بەستەری بینینەوە بە شێوەی دینامیکی بۆ هەر پۆستەرێک دابنێیت.</li>
                  </ol>

                  {/* Dev Secret code option for sandbox environment test */}
                  {isAdmin ? (
                    <div className="pt-4 border-t border-stone-800 flex flex-col items-center gap-2 text-center">
                      <p className="text-[11px] text-stone-300">تۆ وەک بەڕێوەبەر بە سەرکەوتوویی ناسێنرایت! دەتوانیت کۆنترۆڵ پانێڵ بکەیتەوە بۆ ئەوەی بە یەک کلیک فیلمە نموونەییەکان دابنێیت:</p>
                      <button
                        onClick={() => setShowAdminPanel(true)}
                        className="mt-1 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-stone-950 px-5 py-2.5 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(234,179,8,0.15)] cursor-pointer"
                      >
                        <Sparkles size={14} />
                        <span>کردنەوەی پانێڵ و لۆدکردنی فیلمە نموونەییەکان</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-stone-800 flex justify-between items-center gap-4">
                      <button
                        onClick={() => setShowBypassModal(true)}
                        className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        <Key size={12} />
                        <span>چوونەژوورەوەی کاتی مۆدێراتۆر (گەر ئیمەیلت جیاواز بوو)</span>
                      </button>
                      <span className="text-[10px] text-stone-500">حیساب کەرەوەی ئاسانی بەستەرەکان</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Widescreen catalog containing sliders, spotlights, categories and grid list */
              <div className="pb-16">
                
                {/* Spotlight Billboard Banner with elegant Slider/Carousel Controls */}
                {spotlightMovie && (
                  <div className="relative w-full h-[55vh] overflow-hidden group select-none">
                    {/* Unique keys to trigger smooth CSS animations on change */}
                    <div key={spotlightMovie.id} className="absolute inset-0 w-full h-full animate-[fadeIn_0.6s_ease-out]">
                      {/* Background Artwork */}
                      <img
                        src={spotlightMovie.bannerUrl || spotlightMovie.posterUrl}
                        alt={spotlightMovie.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[2px] transition-transform duration-700 scale-100 group-hover:scale-105"
                      />
                      
                      {/* Grand Dark overlay mask gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070708]/20 to-[#070708]/95" />

                      {/* Spotlight Text details */}
                      <div className="absolute inset-y-0 right-0 max-w-3xl flex flex-col justify-end p-6 md:p-12 text-right rtl-dir z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="rounded bg-yellow-500 px-2.5 py-0.5 text-[10px] font-black text-stone-950 uppercase tracking-wider font-sans">
                            {spotlightMovie.category}
                          </span>
                          {spotlightMovie.rating && (
                            <span className="rounded bg-stone-950/80 border border-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-md flex items-center gap-1">
                              <Star size={11} className="fill-yellow-400 stroke-none" />
                              {spotlightMovie.rating}
                            </span>
                          )}
                          <span className="text-stone-300 text-xs font-mono font-medium">{spotlightMovie.year}</span>
                        </div>
                        
                        <h2 className="text-2xl font-black md:text-4xl lg:text-5xl text-white font-sans leading-tight">
                          {spotlightMovie.title}
                        </h2>
                        
                        <p className="mt-3.5 text-stone-300 text-sm font-sans leading-relaxed line-clamp-2 max-w-xl text-stone-400">
                          {spotlightMovie.description || "نوێترین فیلمی بڵاوکراوە لەلایەن کەتەلۆگی زێڕینی Shea Cinema."}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3 justify-start">
                          <button
                            onClick={() => setSelectedMovie(spotlightMovie)}
                            className="flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-6 py-3 text-xs font-bold text-stone-950 transition-all hover:scale-105 duration-200 shadow-lg shadow-yellow-500/10 cursor-pointer"
                          >
                            <Play size={13} className="fill-current" />
                            <span>بینینی ئێستا</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Arrows (Visible on hover) */}
                    {finalSpotlights.length > 1 && (
                      <>
                        {/* Right/Next Button (aligned to right edge with Kurdish layout) */}
                        <button
                          onClick={handlePrevSlide}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-stone-800 text-stone-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-500 hover:text-stone-900 duration-200 cursor-pointer"
                          aria-label="Previous Slide"
                        >
                          <ChevronLeft size={20} />
                        </button>

                        {/* Left/Prev Button */}
                        <button
                          onClick={handleNextSlide}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-stone-800 text-stone-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-500 hover:text-stone-900 duration-200 cursor-pointer"
                          aria-label="Next Slide"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}

                    {/* Bottom Indicator Dots */}
                    {finalSpotlights.length > 1 && (
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {finalSpotlights.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSpotlightIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              idx === spotlightIndex 
                                ? "w-6 bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" 
                                : "w-1.5 bg-stone-600 hover:bg-stone-400"
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Category Filtering Tabs banner */}
                <div className="mx-auto max-w-7xl px-4 md:px-6 mt-12 mb-8 text-right rtl-dir">
                  <div className="flex flex-wrap gap-2 justify-start border-b border-stone-800/60 pb-5">
                    {["هەمووی", "ترێندینگ", "فیلم", "زنجیرە", "فیلمی کوردی", "ئەنیمێ", "دۆکیومێنتاری", "دڵخوازەکانم", "لیستی بینین"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-full px-5 py-2.5 text-xs font-bold font-sans transition-all duration-200 select-none flex items-center gap-1.5 cursor-pointer ${
                          activeCategory === cat
                            ? "bg-yellow-500 text-stone-950 shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
                            : "bg-[#141416] border border-stone-800 text-stone-400 hover:text-white hover:border-stone-700"
                        }`}
                      >
                        {cat === "دڵخوازەکانم" && <Heart size={12} className={activeCategory === "دڵخوازەکانم" ? "fill-stone-950 stroke-none" : "text-[#f43f5e] fill-[#f43f5e]/20"} />}
                        {cat === "لیستی بینین" && <Bookmark size={12} className={activeCategory === "لیستی بینین" ? "fill-stone-950 stroke-none" : "text-[#38bdf8] fill-[#38bdf8]/10"} />}
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid layout section of films list */}
                <div className="mx-auto max-w-7xl px-4 md:px-6">
                  {searchQuery !== "" || activeCategory !== "هەمووی" ? (
                    // Default fallback filtered list (active category filtering or search mode)
                    <div>
                      {(activeCategory === "دڵخوازەکانم" || activeCategory === "لیستی بینین") && !user ? (
                        <div className="py-16 px-4 text-center rounded-2xl border border-stone-800/80 max-w-md mx-auto flex flex-col items-center gap-4 bg-[#0a0a0c] my-8 animate-[fadeIn_0.5s_ease-out]">
                          <div className="h-12 w-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                            {activeCategory === "دڵخوازەکانم" ? <Heart size={20} className="fill-yellow-400 stroke-none" /> : <Bookmark size={20} />}
                          </div>
                          <div>
                            <h4 className="text-[#f5f5f7] text-sm font-bold font-sans">هاوڕێی بەڕێز، پێویستە بچیتە ژوورەوە</h4>
                            <p className="text-[11px] text-stone-400 font-sans mt-1.5 leading-relaxed">
                              بۆ دروستکردنی لیستی دڵخوازی کەسی و پاشەکەوتکردنی فیلمەکان بۆ سەیرکردنی داهاتوو، تکایە جیمەیڵەکەت بەکاربهێنە بۆ چوونەژوورەوەی پارێزراو.
                            </p>
                          </div>
                          <button
                            onClick={handleLogin}
                            className="rounded-xl bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-bold px-6 py-2.5 text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-yellow-500/10 active:scale-95"
                          >
                            چوونەژوورەوەی خێرا
                          </button>
                        </div>
                      ) : filteredMovies.length === 0 ? (
                        <div className="py-24 text-center rounded-2xl border border-dashed border-stone-800 my-4 flex flex-col items-center justify-center">
                          {activeCategory === "دڵخوازەکانم" ? (
                            <div className="flex flex-col items-center gap-2 max-w-sm">
                              <Heart size={32} className="text-[#f43f5e] animate-pulse" />
                              <span className="text-xs text-stone-300 font-sans font-medium mt-2">لیستی دڵخوازەکانت هێشتا بەتاڵە!</span>
                              <p className="text-[10px] text-stone-500 font-sans mt-1">لە زانیاری هەر فیلمێکدا کلیک لەسەر دوگمەی دڵخواز بکە بۆ ئەوەی لێرەدا نیشان بدرێت.</p>
                            </div>
                          ) : activeCategory === "لیستی بینین" ? (
                            <div className="flex flex-col items-center gap-2 max-w-sm">
                              <Bookmark size={32} className="text-[#38bdf8]" />
                              <span className="text-xs text-stone-300 font-sans font-medium mt-2">لیستی بینینی داهاتووت بەتاڵە!</span>
                              <p className="text-[10px] text-stone-500 font-sans mt-1">فیلم یان زنجیرەکانی داهاتوو نیشان بکە بۆ پاشەکەوتکردن لێرەیا.</p>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500 font-sans">هیچ دۆکۆمێنت یان فیلمێک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت گونجاو بێت.</span>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8">
                          {filteredMovies.map((mov) => (
                            <MovieCard
                              key={mov.id}
                              movie={mov}
                              onSelect={handleSelectMovie}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Separated sections when displaying HOME ("هەمووی")
                    <div className="space-y-14 mb-12 text-right rtl-dir">
                      
                      {/* Section 1: Latest Movies */}
                      <div>
                        <div className="flex items-center justify-between mb-6 border-b border-stone-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/15">
                              <Film size={18} />
                            </div>
                            <div className="text-right">
                              <h3 className="text-base font-bold text-[#f5f5f7] font-sans">بەشی فیلمە ناوازەکان</h3>
                              <p className="text-[10px] text-stone-500 font-sans">نوێترین و سەرنجڕاکێشترین فیلمە بڵاوکراوەکان</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-500 font-sans uppercase tracking-widest hidden sm:inline">Movies Section</span>
                        </div>

                        {movies.filter((m) => m.category !== "زنجیرە").length === 0 ? (
                          <div className="py-16 text-center rounded-2xl bg-[#0a0a0c] border border-stone-800/60 border-dashed">
                            <span className="text-xs text-stone-500 font-sans">هیچ فیلمێکی نوێ لەم بەشەدا بەردەست نییە.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {movies
                              .filter((m) => m.category !== "زنجیرە")
                              .map((mov) => (
                                <MovieCard
                                  key={mov.id}
                                  movie={mov}
                                  onSelect={handleSelectMovie}
                                />
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Dedicated TV Series Section */}
                      <div>
                        <div className="flex items-center justify-between mb-6 border-b border-stone-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 animate-pulse">
                              <Tv size={18} />
                            </div>
                            <div className="text-right">
                              <h3 className="text-base font-bold text-[#f5f5f7] font-sans">بەشی زنجیرە دراماکان</h3>
                              <p className="text-[10px] text-stone-500 font-sans">تایبەت بە زنجیرە دراما بەناوبانگە شاهانەییەکان</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-500 font-sans uppercase tracking-widest hidden sm:inline">TV Series Section</span>
                        </div>

                        {movies.filter((m) => m.category === "زنجیرە").length === 0 ? (
                          <div className="py-16 text-center rounded-2xl bg-[#0a0a0c] border border-stone-800/60 border-dashed">
                            <span className="text-xs text-stone-500 font-sans">هیچ زنجیرە درامایەکی نوێ لەم بەشەدا بەردەست نییە.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {movies
                              .filter((m) => m.category === "زنجیرە")
                              .map((mov) => (
                                <MovieCard
                                  key={mov.id}
                                  movie={mov}
                                  onSelect={handleSelectMovie}
                                />
                              ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </main>

{/* Authentication Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        customPhotoURL={customPhotoURL}
        onProfileUpdated={async () => {
          if (auth.currentUser) {
            try {
              await auth.currentUser.reload();
            } catch (e) {
              console.warn("Failed to reload user profile:", e);
            }
            setUser(null);
            setTimeout(() => {
              if (auth.currentUser) {
                setUser(auth.currentUser);
              }
            }, 10);
          }
        }}
      />

      {/* Developer testing bypass modal */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rtl-dir">
          <div className="w-full max-w-sm rounded-2xl bg-[#111113] border border-stone-800 p-6 text-right">
            <h3 className="text-stone-100 font-bold text-sm font-sans mb-1 flex items-center justify-start gap-1">
              <Key size={15} className="text-yellow-400" />
              <span>چوونەژوورەوەی مۆدێراتۆر (Moderator Bypass)</span>
            </h3>
            <p className="text-[11px] text-stone-400 mb-4 font-sans leading-relaxed">
              تکایە کۆدی نهێنی مۆدێراتۆر کە لەلایەن بەڕێوەبەرەوە پێدراوە بنووسە بۆ چالاککردنی پانێڵی پاراستن و بەڕێوەبردن.
            </p>
            <form onSubmit={handleBypassSubmit} className="space-y-4">
              <input
                type="password"
                required
                value={bypassInput}
                onChange={(e) => setBypassInput(e.target.value)}
                placeholder="کۆدی نهێنی..."
                className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-yellow-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-yellow-400"
                >
                  چالاککردن
                </button>
                <button
                  type="button"
                  onClick={() => setShowBypassModal(false)}
                  className="rounded-xl border border-stone-800 px-4 py-2.5 text-xs text-stone-400 hover:text-white"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Help / IFrame Popup Block Warning Modal */}
      {showAuthWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rtl-dir text-right">
          <div className="w-full max-w-md rounded-2xl bg-[#111113] border border-stone-800 p-6">
            <div className="flex items-center gap-2 text-yellow-500 mb-3">
              <AlertCircle size={20} className="stroke-[2.5]" />
              <h3 className="text-stone-100 font-bold text-sm font-sans">هاوکاری چوونەژوورەوە (Login Help)</h3>
            </div>
            
            <p className="text-[11px] text-stone-300 mb-4 font-sans leading-relaxed">
              لەبەر ئەوەی ماڵپەڕەکە لەناو چوارچێوەی نموونەیی (Preview iFrame) دایە، پەنجەرەی پۆپ-ئەپی چوونەژوورەوەی گۆگڵ (Google Popup) ڕەنگە لەلایەن برۆسەرەکەتەوە ڕێگری لێبکرێت یان هەڵبوەشێتەوە.
            </p>

            <div className="bg-[#17171a] rounded-xl p-4 border border-stone-800 space-y-3.5 text-xs text-stone-400 font-sans mb-5 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500 font-bold text-[10px] flex-shrink-0 mt-0.5">١</span>
                <p>
                  وێبسایتەکە <b className="text-stone-100">بکەرەوە لە تابێکی تازەدا</b> بە کلیک کردن لەسەر دوگمەی سەرەوەی لای ڕاستی ڕوونماکە، پاشان دووبارە کلیک لە چوونەژوورەوە بکە.
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500 font-bold text-[10px] flex-shrink-0 mt-0.5">٢</span>
                <p>
                  یاخود تەنها کلیک لەسەر دوگمەی ژێرەوە بکە بۆ تێپەڕاندنی خێرا لە ڕێگەی <b className="text-stone-100">ئومێدی بەکارهێنانی کۆدی نهێنی مۆدێراتۆر</b> بەبێ پێویستی بە جیمەیڵ.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowAuthWarning(false);
                  setShowBypassModal(true);
                }}
                className="flex-1 rounded-xl bg-yellow-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-yellow-400 hover:shadow-[0_4px_12px_rgba(234,179,8,0.2)] active:scale-95 transition-all"
              >
                بەکارهێنانی کۆدی مۆدێراتۆر
              </button>
              
              <button
                onClick={() => setShowAuthWarning(false)}
                className="rounded-xl border border-stone-800 px-4 py-2.5 text-xs text-stone-400 hover:text-white"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Luxury Brand Footer */}
      <footer className="border-t border-stone-800 bg-[#070708] py-8 text-center text-xs selection:bg-yellow-500 text-stone-500 rtl-dir font-sans">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row-reverse sm:justify-between items-center gap-4">
          
          {/* Copyright description */}
          <div className="text-right">
            <p className="text-stone-300 font-sans font-medium text-xs">
              © ٢٠٢٦ Shea Cinema. هەموو مافەکان پارێزراوە.
            </p>
            <p className="text-[11px] text-stone-500 font-sans mt-1">
              دیزاین کراوە لە لایەن <b className="text-yellow-500">Shea Cinema 2026</b>
            </p>
          </div>

          {/* Prompt requested descriptions */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
            <p className="text-center sm:text-right text-stone-400 max-w-md text-[11px] leading-relaxed">
              ئێمە نوێترین فیلمەکان لەگەڵ ئەو فیلمانەی ترێندن بڵاودەکەینەوە بە خێراترێن و باشترێن سێرڤەر.
            </p>
            {/* Clickable telegram button */}
            <a
              href="https://t.me/sheacinema_offical"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 justify-center"
            >
              <Send size={12} className="transform rotate-[-30deg]" />
              <span>بۆ پەیوەندیکردن و داواکاری سەردانی کەناڵی تیلیگرام بکە</span>
            </a>
          </div>

        </div>
      </footer>
    </div>
  );

  function isLoadingMovies() {
    return isLoding;
  }
}
