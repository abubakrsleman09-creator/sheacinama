import React, { useState, useEffect } from "react";
import { X, Star, Calendar, Bookmark, Eye, Play, Share2, CornerDownLeft, Volume2, Info, Lightbulb, LightbulbOff, Heart, Trash, MessageSquare, Send, User, RotateCw, Pencil, ThumbsUp, CheckCircle } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, setDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db } from "../firebase";
import { Movie, StreamServer, Season, Episode } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";

interface MovieDetailProps {
  movie: Movie;
  onClose: () => void;
  user: FirebaseUser | null;
  customPhotoURL?: string | null;
  customDisplayName?: string | null;
  favoriteIds: string[];
  watchlistIds: string[];
  onToggleFavorite: (movieId: string) => Promise<void>;
  onToggleWatchlist: (movieId: string) => Promise<void>;
  onLoginClick: () => void;
}

const getSessionId = () => {
  let id = sessionStorage.getItem("active_session_id");
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    sessionStorage.setItem("active_session_id", id);
  }
  return id;
};

export default function MovieDetail({
  movie,
  onClose,
  user,
  customPhotoURL,
  customDisplayName,
  favoriteIds,
  watchlistIds,
  onToggleFavorite,
  onToggleWatchlist,
  onLoginClick,
}: MovieDetailProps) {
  const [selectedServer, setSelectedServer] = useState<StreamServer | null>(null);
  const [lightsOff, setLightsOff] = useState(false);

  // Real-time active watching session tracker (100% Real, syncs directly with Firestore)
  useEffect(() => {
    const sessionId = getSessionId();
    const docRef = doc(db, "active_watches", sessionId);
    
    const registerActiveWatch = async () => {
      try {
        await setDoc(docRef, {
          movieId: movie.id,
          movieTitle: movie.title,
          userId: user?.uid || "anonymous",
          userName: customDisplayName || user?.displayName || "بینەری ناونیشان",
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Error registering active watch session:", err);
      }
    };

    registerActiveWatch();

    // Pulse/heartbeat every 6 seconds to show active ping status
    const interval = setInterval(async () => {
      try {
        await updateDoc(docRef, {
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        // Recycle if document was lost
        registerActiveWatch();
      }
    }, 6000);

    // Clean up on unmount or when movie changes
    return () => {
      clearInterval(interval);
      deleteDoc(docRef).catch((err) => {
        console.warn("Error deleting active watch session:", err);
      });
    };
  }, [movie.id, user?.uid, customDisplayName]);
  const [copied, setCopied] = useState(false);
  const [cinemaPreset, setCinemaPreset] = useState<"noir" | "neon" | "ember" | "gold">("noir");

  const getPresetOverlayClass = () => {
    switch (cinemaPreset) {
      case "neon":
        return "bg-[#030611]/99 shadow-[inset_0_0_160px_rgba(14,165,233,0.22)]";
      case "ember":
        return "bg-[#0a0401]/99 shadow-[inset_0_0_160px_rgba(249,115,22,0.18)]";
      case "gold":
        return "bg-[#0a0701]/99 shadow-[inset_0_0_160px_rgba(234,179,8,0.21)]";
      case "noir":
      default:
        return "bg-black/98";
    }
  };

  // TV Series Seasons & Episodes selection states
  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0);
  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState(0);

  // Comments and ratings states
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5); // Default 5 stars
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  // States for comprehensive ratings breakdown options
  const [storyRating, setStoryRating] = useState(8);
  const [actingRating, setActingRating] = useState(8);
  const [visualsRating, setVisualsRating] = useState(8);
  const [soundRating, setSoundRating] = useState(8);
  const [prosInput, setProsInput] = useState("");
  const [consInput, setConsInput] = useState("");
  const [isRecommended, setIsRecommended] = useState(true);

  // Edit comment states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingCommentRating, setEditingCommentRating] = useState(5);

  // Fetch comments for this specific movie in real-time
  useEffect(() => {
    setIsLoadingComments(true);
    const commentsQuery = query(
      collection(db, "comments"),
      where("movieId", "==", movie.id)
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const loadedComments: any[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        loadedComments.push({
          id: docSnap.id,
          ...d,
        });
      });

      // Sort comments by createdAt descending
      loadedComments.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt).getTime() || 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt).getTime() || 0);
        return timeB - timeA;
      });

      setComments(loadedComments);
      setIsLoadingComments(false);
    }, (error) => {
      setIsLoadingComments(false);
      handleFirestoreError(error, OperationType.GET, "comments");
    });

    return () => unsubscribe();
  }, [movie.id]);

  // Handle submitting new comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLoginClick();
      return;
    }

    if (commentText.trim().length === 0) return;

    setIsSubmitting(true);
    try {
      // Split pros and cons by commas or newlines
      const prosArray = prosInput
        .split(/[,\n]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const consArray = consInput
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      await addDoc(collection(db, "comments"), {
        movieId: movie.id,
        userId: user.uid,
        userName: customDisplayName || user.displayName || "بینەری ناونیشان",
        userEmail: user.email || "",
        userPhoto: customPhotoURL || (user.photoURL === "/custom_avatar" ? "" : user.photoURL) || "",
        text: commentText.trim(),
        rating: commentRating,
        storyRating,
        actingRating,
        visualsRating,
        soundRating,
        pros: prosArray,
        cons: consArray,
        isRecommended,
        helpfulCount: 0,
        helpfulBy: [],
        createdAt: serverTimestamp()
      });

      setCommentText("");
      setCommentRating(5);
      setStoryRating(8);
      setActingRating(8);
      setVisualsRating(8);
      setSoundRating(8);
      setProsInput("");
      setConsInput("");
      setIsRecommended(true);

      // Trigger optional system notification for movie review submissions to admins or public logs if we want
      await addDoc(collection(db, "notifications"), {
        userId: "public",
        title: "پێداچوونەوەیەکی نوێ بڵاوکرایەوە",
        message: `${customDisplayName || user.displayName || "بینەرێک"} پێداچوونەوەیەکی گشتگیری بۆ فلیمی "${movie.title}" زیاد کرد!`,
        type: "movie_added",
        isRead: false,
        createdAt: new Date().toISOString()
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "comments");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle helpful reviews votes dynamically
  const handleToggleHelpful = async (commentId: string) => {
    if (!user) {
      onLoginClick();
      return;
    }
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const helpfulBy = comment.helpfulBy || [];
    const hasLiked = helpfulBy.includes(user.uid);
    const ref = doc(db, "comments", commentId);

    try {
      await updateDoc(ref, {
        helpfulBy: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        helpfulCount: increment(hasLiked ? -1 : 1)
      });

      // Notify the recipient
      if (!hasLiked && comment.userId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: comment.userId,
          title: "پێداچوونەوەکەت بەسوود بوو",
          message: `${customDisplayName || user.displayName || "بینەرێک"} لێدووانەکەی تۆی لەسەر فلیمی "${movie.title}" وەک بەسوود دیاری کرد.`,
          type: "like",
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Helpful vote error:", err);
    }
  };

  // Handle deleting a comment (only author or admin)
  const handleCommentDelete = async (commentId: string) => {
    const isAdminUser = user?.email === "abubakrsleman09@gmail.com";
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    if (user?.uid !== comment.userId && !isAdminUser) {
      alert("تۆ دەسەڵاتی سڕینەوەی ئەم پێداچوونەوەیە ت نییە.");
      return;
    }

    if (window.confirm("ئایا دڵنیایت لە سڕینەوەی ئەم لێدوانە؟")) {
      try {
        await deleteDoc(doc(db, "comments", commentId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
      }
    }
  };

  // Handle updating an existing comment/rating
  const handleCommentUpdate = async (commentId: string) => {
    if (editingCommentText.trim().length === 0) return;
    try {
      await updateDoc(doc(db, "comments", commentId), {
        text: editingCommentText.trim(),
        rating: editingCommentRating,
        updatedAt: serverTimestamp()
      });
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  const hasSeasons = movie.category === "زنجیرە" && movie.seasons && movie.seasons.length > 0;
  
  // Get active season & episode
  const activeSeason = hasSeasons ? movie.seasons![activeSeasonIdx] : null;
  const activeEpisode = activeSeason && activeSeason.episodes ? activeSeason.episodes[activeEpisodeIdx] : null;

  // Auto-select first server of selected episode OR movie 
  useEffect(() => {
    if (hasSeasons) {
      if (activeEpisode && activeEpisode.servers && activeEpisode.servers.length > 0) {
        setSelectedServer(activeEpisode.servers[0]);
      } else {
        setSelectedServer(null);
      }
    } else {
      if (movie.servers && movie.servers.length > 0) {
        setSelectedServer(movie.servers[0]);
      } else {
        setSelectedServer(null);
      }
    }
  }, [movie, activeSeasonIdx, activeEpisodeIdx, hasSeasons, activeEpisode]);

  // Track and save watching record into user history
  useEffect(() => {
    if (!user || !selectedServer) return;

    const saveWatchHistory = async () => {
      try {
        const historyId = `${user.uid}_${movie.id}`;
        await setDoc(doc(db, "watch_history", historyId), {
          userId: user.uid,
          movieId: movie.id,
          movieTitle: movie.title,
          moviePosterUrl: movie.posterUrl,
          movieCategory: movie.category,
          movieGenre: movie.genre || "",
          watchedAt: new Date().toISOString(),
          serverName: selectedServer.name,
          seasonNumber: activeSeason ? activeSeason.seasonNumber : null,
          episodeNumber: activeEpisode ? activeEpisode.episodeNumber : null,
        });
      } catch (err) {
        console.warn("Failed to write watch history record:", err);
      }
    };

    saveWatchHistory();
  }, [user?.uid, movie.id, selectedServer?.name, activeSeasonIdx, activeEpisodeIdx]);

  const handleShareClick = () => {
    // Generate a shareable URL incorporating the movie ID
    const url = `${window.location.origin}/?movie=${movie.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop";
  };

  const handleBannerError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.style.display = 'none'; // Hide if missing
  };

  return (
    <div className="relative min-h-screen pb-16">
      {/* Lights-off overlay for cinema state */}
      {lightsOff && (
        <>
          <div 
            onClick={() => setLightsOff(false)}
            className={`fixed inset-0 z-50 transition-all duration-700 cursor-pointer ${getPresetOverlayClass()}`}
          />
          
          {/* Floating Cinema presets selector while lightsOff is on */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#0d0d0f]/90 backdrop-blur-md border border-stone-800 px-4 py-2.5 rounded-full shadow-2xl animate-fade-in text-right">
            <span className="text-[10px] text-stone-400 font-sans font-bold select-none shrink-0 border-l border-stone-800 pl-2">باکگراوندی سینەمایی:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCinemaPreset("noir")}
                className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-full border transition-all cursor-pointer ${
                  cinemaPreset === "noir" 
                    ? "bg-stone-50 text-stone-950 border-stone-50 shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
                    : "bg-stone-900/50 text-stone-400 border-stone-800 hover:text-stone-200"
                }`}
              >
                ڕەشی تەواو
              </button>
              <button
                onClick={() => setCinemaPreset("neon")}
                className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-full border transition-all cursor-pointer ${
                  cinemaPreset === "neon" 
                    ? "bg-sky-500 text-stone-950 border-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.35)]" 
                    : "bg-sky-950/20 text-sky-400 border-sky-900/40 hover:text-sky-300"
                }`}
              >
                نیۆنی شین
              </button>
              <button
                onClick={() => setCinemaPreset("ember")}
                className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-full border transition-all cursor-pointer ${
                  cinemaPreset === "ember" 
                    ? "bg-amber-600 text-stone-950 border-amber-600 shadow-[0_0_12px_rgba(217,119,6,0.35)]" 
                    : "bg-amber-950/20 text-amber-500 border-amber-900/40 hover:text-amber-400"
                }`}
              >
                پشکۆی گەرم
              </button>
              <button
                onClick={() => setCinemaPreset("gold")}
                className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-full border transition-all cursor-pointer ${
                  cinemaPreset === "gold" 
                    ? "bg-yellow-500 text-stone-950 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.35)]" 
                    : "bg-yellow-950/20 text-yellow-500 border-yellow-904/40 hover:text-yellow-400"
                }`}
              >
                درەوشانەوە
              </button>
            </div>
            
            <div className="h-4 w-px bg-stone-800 mx-1 shrink-0" />
            <button
              onClick={() => setLightsOff(false)}
              className="text-[10px] text-yellow-500 hover:text-white font-sans font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <LightbulbOff size={11} className="text-yellow-500 fill-yellow-500" />
              <span>داگیرساندنی گلۆپ</span>
            </button>
          </div>
        </>
      )}

      {/* Hero Backdrop Header Banner */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        {movie.bannerUrl ? (
          <img
            src={movie.bannerUrl}
            alt={movie.title}
            onError={handleBannerError}
            className="h-full w-full object-cover opacity-30 filter blur-sm scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-stone-900 to-stone-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
        
        {/* Quick Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-stone-900/80 border border-stone-800 text-stone-300 transition-all hover:bg-yellow-500 hover:text-stone-950 hover:border-yellow-500 shadow-lg"
          title="داخستن"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Detail Grid Layout */}
      <div className="mx-auto -mt-36 max-w-7xl px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Visual details card & sharing */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-stone-800 bg-[#121214] p-2 shadow-xl">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                onError={handleImageError}
                referrerPolicy="no-referrer"
                className="w-full h-auto aspect-[2/3] object-cover rounded-xl"
              />
            </div>

            {/* Quick stats panel */}
            <div className="rounded-xl border border-stone-800 bg-[#0d0d0f] p-4 text-right rtl-dir">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 text-xs">ساڵی بەرهەمهێنان</span>
                  <span className="text-stone-100 font-mono text-xs">{movie.year || "نەزانراو"}</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 text-xs">جۆری پاشکۆ</span>
                  <span className="text-yellow-400 font-bold text-xs">{movie.category}</span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 text-xs">نمرەی فیلم</span>
                  <span className="text-stone-100 text-xs flex items-center gap-1 font-mono">
                    <Star size={11} className="fill-yellow-400 stroke-none" />
                    {movie.rating ? `${movie.rating} / 10` : "نەزانراو"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 text-xs">بینینەکان</span>
                  <span className="text-stone-100 text-xs flex items-center gap-1.5 font-mono">
                    <Eye size={12} className="text-stone-400" />
                    {movie.views ? `${movie.views} جار بینراوە` : "٠ بینەر"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400 text-xs font-sans">هاوپۆل</span>
                  <span className="text-stone-100 text-xs font-sans">{movie.genre || "دیارینەکراو"}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleShareClick}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-800 bg-[#121214] py-3 text-xs font-semibold text-stone-200 transition-all hover:bg-stone-900 active:scale-95 cursor-pointer"
                >
                  <Share2 size={14} className="text-yellow-400" />
                  <span className="font-sans">{copied ? "کۆپی کرا!" : "ناردنی فیلم (شێر)"}</span>
                </button>

                <button
                  onClick={() => setLightsOff(!lightsOff)}
                  className={`flex px-4 items-center justify-center rounded-xl border py-3 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    lightsOff
                      ? "bg-yellow-500 border-yellow-500 text-stone-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                      : "bg-[#121214] border-stone-800 text-stone-200 hover:bg-stone-900"
                  }`}
                  title="دۆخی سینەمایی لاینبردن"
                >
                  {lightsOff ? <LightbulbOff size={16} /> : <Lightbulb size={16} />}
                </button>
              </div>

              {/* Favorites and Watchlist Actions */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => onToggleFavorite(movie.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-200 ${
                    favoriteIds.includes(movie.id)
                      ? "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e] hover:bg-[#f43f5e]/15"
                      : "bg-[#121214] border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900"
                  }`}
                >
                  <Heart size={14} className={favoriteIds.includes(movie.id) ? "fill-[#f43f5e] stroke-none animate-[pulse_1s_infinite]" : "text-stone-400"} />
                  <span className="font-sans">
                    {favoriteIds.includes(movie.id) ? "لابردن لە دڵخواز" : "دڵخوازەکانم"}
                  </span>
                </button>

                <button
                  onClick={() => onToggleWatchlist(movie.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all cursor-pointer active:scale-95 duration-200 ${
                    watchlistIds.includes(movie.id)
                      ? "bg-[#38bdf8]/10 border-[#38bdf8]/30 text-[#38bdf8] hover:bg-[#38bdf8]/15"
                      : "bg-[#121214] border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900"
                  }`}
                >
                  <Bookmark size={14} className={watchlistIds.includes(movie.id) ? "fill-[#38bdf8] stroke-none" : "text-stone-400"} />
                  <span className="font-sans">
                    {watchlistIds.includes(movie.id) ? "لیستی بینین" : "لیستی بینین"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Title info and dynamic streaming server player */}
          <div className="lg:col-span-8 flex flex-col gap-6 text-right rtl-dir">
            
            {/* Title Block */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 justify-start mb-1">
                <span className="rounded bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 text-[11px] font-bold text-yellow-500 font-sans">
                  {movie.category}
                </span>
                {movie.isTrending && (
                  <span className="rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[11px] font-bold text-red-500 font-sans">
                    🔥 ترێندینگ
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black md:text-3xl lg:text-4xl text-white font-sans leading-tight">
                {movie.title}
              </h1>
              {movie.genre && (
                <p className="text-xs text-stone-400 font-sans tracking-wide mt-1">
                  {movie.genre}
                </p>
              )}
            </div>

            {/* Video Player Display Screen */}
            <div className={`relative overflow-hidden rounded-2xl border border-stone-800 bg-black transition-all shadow-2xl ${lightsOff ? 'z-[60] outline outline-4 outline-yellow-500/40 ring-offset-4 ring-offset-black' : ''}`}>
              
              {/* Conditional Stream Iframe */}
              {selectedServer ? (
                <div className="aspect-video w-full bg-black relative">
                  <iframe
                    src={selectedServer.url}
                    title={hasSeasons && activeSeason && activeEpisode ? `${movie.title} - ${activeSeason.title || `سیزن ${activeSeason.seasonNumber}`} - ${activeEpisode.title || `ئەڵقەی ${activeEpisode.episodeNumber}`} - ${selectedServer.name}` : `${movie.title} - ${selectedServer.name}`}
                    allowFullScreen={true}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full border-0 bg-black"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-stone-950 p-6 text-center text-stone-400">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                    <Play size={24} className="ml-1" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-200 font-sans">هیچ سێرڤەرێکی پەخش بەردەست نییە</h3>
                    <p className="mt-1 text-xs text-stone-500 font-sans">داهێنەری فیلم هیچ هەموارکردنێکی سێرڤەری تا ئێستا داخڵ نەکردووە بۆ ئەم فیلمە.</p>
                  </div>
                </div>
              )}

              {/* Sub-Banner of Video Controls or Server Info */}
              {selectedServer && (
                <div className="flex items-center justify-between border-t border-stone-900 bg-stone-950 px-4 py-3 text-xs text-stone-400">
                  <div className="flex items-center gap-1 text-stone-500 font-sans">
                    <Info size={11} />
                    <span>کێشەیەک هەیە لە بینین لۆد بکەوە</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-medium text-stone-300">سێرڤەری چالاک:</span>
                    <span className="rounded bg-yellow-500 px-2 py-0.5 font-sans text-[11px] font-bold text-stone-950">
                      {selectedServer.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Seasons Selection */}
            {hasSeasons && (
              <div className="rounded-2xl border border-stone-800 bg-[#0d0d0f] p-5">
                <h3 className="text-stone-300 text-xs font-bold font-sans mb-3 text-right">
                  وەرزی زنجیرەکە هەڵبژێرە:
                </h3>
                <div className="flex flex-wrap gap-2 justify-start">
                  {movie.seasons!.map((season, idx) => (
                    <button
                      key={season.id || idx}
                      onClick={() => {
                        setActiveSeasonIdx(idx);
                        setActiveEpisodeIdx(0);
                      }}
                      className={`px-4 py-2.5 text-xs font-bold font-sans rounded-xl border transition-all duration-200 cursor-pointer ${
                        activeSeasonIdx === idx
                          ? "bg-stone-100 text-stone-950 border-stone-100"
                          : "bg-[#141417] border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-[#18181c]"
                      }`}
                    >
                      {season.title || `سیزن ${season.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episodes Selection */}
            {hasSeasons && activeSeason && activeSeason.episodes && activeSeason.episodes.length > 0 && (
              <div className="rounded-2xl border border-stone-800 bg-[#0d0d0f] p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-stone-500 font-mono text-[10px]">
                    {activeSeason.episodes.length} ئەڵقە بەردەستە
                  </span>
                  <h3 className="text-stone-300 text-xs font-bold font-sans text-right">
                    ئەڵقەکان:
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 justify-start">
                  {activeSeason.episodes.map((episode, idx) => (
                    <button
                      key={episode.id || idx}
                      onClick={() => {
                        setActiveEpisodeIdx(idx);
                      }}
                      className={`py-3 text-xs font-bold font-mono rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        activeEpisodeIdx === idx
                          ? "bg-yellow-500 text-stone-950 border-yellow-500 shadow-[0_4px_12px_rgba(234,179,8,0.25)]"
                          : "bg-[#141417] border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-[#18181c]"
                      }`}
                    >
                      <span className="text-[9px] opacity-70 uppercase font-sans">Ep</span>
                      <span className="text-sm font-black">{episode.episodeNumber}</span>
                    </button>
                  ))}
                </div>
                
                {activeEpisode && activeEpisode.title && (
                  <div className="mt-3.5 text-xs font-sans text-stone-400 border-t border-stone-800/40 pt-2.5 flex items-center gap-2 justify-start">
                    <span className="rounded bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 text-yellow-500 text-[9px]">چالاک</span>
                    <span className="text-stone-500 text-[10px]">ناوی ئەڵقە:</span>
                    <span className="text-stone-200 font-bold">{activeEpisode.title}</span>
                  </div>
                )}
              </div>
            )}

            {/* Streaming Server Selector (Dynamic and Interactive) */}
            {((hasSeasons && activeEpisode && activeEpisode.servers && activeEpisode.servers.length > 0) || 
              (!hasSeasons && movie.servers && movie.servers.length > 0)) && (
              <div className="rounded-2xl border border-stone-800 bg-[#0c0c0e] p-5">
                <h3 className="text-stone-300 text-xs font-bold font-sans mb-3 text-right">
                  لیستی سێرڤەرەکانی دابینکردنی پەخشکردن:
                </h3>
                <div className="flex flex-wrap gap-2.5 justify-start">
                  {(hasSeasons ? activeEpisode!.servers : movie.servers).map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setSelectedServer(server)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold font-sans transition-all active:scale-95 duration-200 cursor-pointer ${
                        selectedServer?.id === server.id
                          ? "bg-yellow-500 text-stone-950 shadow-[0_4px_12px_rgba(234,179,8,0.25)]"
                          : "bg-[#141417] border border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-[#18181c]"
                      }`}
                    >
                      <Play size={10} className={`${selectedServer?.id === server.id ? "fill-stone-950" : "fill-yellow-400 stroke-none"}`} />
                      <span>{server.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Movie Description text block */}
            <div className="rounded-2xl border border-stone-800 bg-[#0d0d0f] p-5">
              <h3 className="text-stone-300 text-xs font-bold font-sans mb-2.5 text-right">دیسکرپشن یان کورتەی فیلم:</h3>
              <p className="text-stone-400 text-sm font-sans leading-relaxed text-slate-300 whitespace-pre-wrap">
                {movie.description || "هیچ کورتەیەکی دیسکرپشن بۆ ئەم فیلمە داخڵنەکراوە لەلایەن بەڕێوەبەرەوە."}
              </p>
            </div>

            {/* Comprehensive Reviews & Comments Section (Kurdish) */}
            <div className="rounded-2xl border border-stone-800 bg-[#0d0d0f] p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-800/60 pb-3 flex-row-reverse">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-yellow-500" />
                  <h3 className="text-stone-200 text-sm font-bold font-sans text-right">
                    هەڵسەنگاندن و پێداچوونەوە گشتگیرەکان ({comments.length})
                  </h3>
                </div>
                <span className="text-[10px] text-stone-500 font-sans uppercase">Comprehensive Reviews</span>
              </div>

              {/* Add Comment / Review section */}
              <div>
                {!user ? (
                  <div className="rounded-xl border border-dashed border-stone-800 bg-[#08080a] p-5 text-center my-2 space-y-3">
                    <p className="text-xs text-stone-400 font-sans">
                      تکایە سەرەتا بچۆ ژوورەوە بۆ پێشکەشکردنی لێدوانی گشتگیر و هەڵسەنگاندنی بەشەکان.
                    </p>
                    <button
                      onClick={onLoginClick}
                      className="rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/25 font-bold px-4 py-2 text-[11px] transition-all cursor-pointer"
                    >
                      چوونەژوورەوەی خێرا بە گووگڵ
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCommentSubmit} className="space-y-4 text-right">
                    {/* User Profile Info Meta & Overall Rating */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#08080a]/60 p-3 rounded-xl border border-stone-850 flex-col-reverse">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-[11px] font-sans font-bold text-stone-300">نمرەی سەرەکی:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setCommentRating(star)}
                              className="text-yellow-400 hover:scale-110 transition duration-150 cursor-pointer"
                            >
                              <Star
                                size={16}
                                className={star <= commentRating ? "fill-yellow-400 text-yellow-400 stroke-none" : "text-stone-700"}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] text-yellow-500 font-bold font-sans">
                          {commentRating === 1 && "خراپ" ||
                           commentRating === 2 && "باش نییە" ||
                           commentRating === 3 && "ئاسایی" ||
                           commentRating === 4 && "زۆر باش" ||
                           commentRating === 5 && "نایاب و دڵگیر!"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-xs font-semibold text-stone-300">{customDisplayName || user.displayName || "بینەر"}</span>
                        {customPhotoURL || (user.photoURL && user.photoURL !== "/custom_avatar") ? (
                          <img src={customPhotoURL || user.photoURL || undefined} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full border border-stone-700" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                            <User size={12} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Highly Interactive Criteria Sliders Breakdown */}
                    <div className="bg-[#08080a]/30 p-4 rounded-xl border border-stone-850 space-y-3">
                      <h4 className="text-[11px] text-yellow-500 font-bold font-sans mb-1 text-right">خاڵبەندی لایەنەکانی تر (لە ١٠ نمرە):</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Story Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans flex-row-reverse">
                            <span>چیرۆک و دیالۆگ: <strong className="text-stone-200">{storyRating}/١٠</strong></span>
                          </div>
                          <input
                            type="range" min="1" max="10"
                            value={storyRating}
                            onChange={(e) => setStoryRating(Number(e.target.value))}
                            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                          />
                        </div>

                        {/* Acting Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans flex-row-reverse">
                            <span>نواندنی ئەکتەرەکان: <strong className="text-stone-200">{actingRating}/١٠</strong></span>
                          </div>
                          <input
                            type="range" min="1" max="10"
                            value={actingRating}
                            onChange={(e) => setActingRating(Number(e.target.value))}
                            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                          />
                        </div>

                        {/* Visuals Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans flex-row-reverse">
                            <span>بینراو و دەرهێنان: <strong className="text-stone-200">{visualsRating}/١٠</strong></span>
                          </div>
                          <input
                            type="range" min="1" max="10"
                            value={visualsRating}
                            onChange={(e) => setVisualsRating(Number(e.target.value))}
                            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                          />
                        </div>

                        {/* Soundtrack Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans flex-row-reverse">
                            <span>مۆسیقا و دەنگ: <strong className="text-stone-200">{soundRating}/١٠</strong></span>
                          </div>
                          <input
                            type="range" min="1" max="10"
                            value={soundRating}
                            onChange={(e) => setSoundRating(Number(e.target.value))}
                            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Toggle Option */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900/20 border border-stone-850 flex-row-reverse">
                      <span className="text-[11px] text-stone-300 font-sans">ئایا ئەم بەرهەمە پێشنیار دەکەیت بۆ بینەرانی تر؟</span>
                      <button
                        type="button"
                        onClick={() => setIsRecommended(!isRecommended)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold font-sans transition-all cursor-pointer ${
                          isRecommended
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border border-red-500/30 text-red-400"
                        }`}
                      >
                        {isRecommended ? "پێشنیاری دەکەم ✓" : "پێشنیاری ناکەم ✗"}
                      </button>
                    </div>

                    {/* Pros and Cons entries */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 font-sans">دیاریکردنی خاڵە بەهێزەکان (بە کۆما جیا بکەرەوە):</label>
                        <input
                          type="text"
                          value={prosInput}
                          onChange={(e) => setProsInput(e.target.value)}
                          placeholder="نموونە: دیمەنە تەکنیکییە نایابەکان، ئاوازی جادوویی"
                          className="w-full text-xs rounded-lg border border-stone-800 bg-[#08080a] p-2 text-right text-stone-200 placeholder-stone-605 font-sans focus:outline-none focus:border-stone-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-400 font-sans">دیاریکردنی خاڵە لاوازەکان (بە کۆما جیا بکەرەوە):</label>
                        <input
                          type="text"
                          value={consInput}
                          onChange={(e) => setConsInput(e.target.value)}
                          placeholder="نموونە: درێژکردنەوەی بێزارکەر، گەشەی هێواش"
                          className="w-full text-xs rounded-lg border border-stone-800 bg-[#08080a] p-2 text-right text-stone-200 placeholder-stone-605 font-sans focus:outline-none focus:border-stone-700"
                        />
                      </div>
                    </div>

                    {/* Text area and submit button */}
                    <div className="relative">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="پێداچوونەوە و شیکردنەوەی خۆت بنووسە لەسەر ئەم پۆستەرە سەرنجڕاکێشە..."
                        rows={3}
                        className="w-full rounded-xl bg-[#08080a] border border-stone-800 p-4 text-xs font-sans text-stone-100 placeholder-stone-500 focus:outline-none focus:border-yellow-500/50 resize-none pr-4 pl-12 text-right"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || commentText.trim().length === 0}
                        className="absolute left-3 bottom-4 h-8 w-8 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-stone-950 flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:hover:bg-yellow-500"
                        title="بڵاوکردنەوەی هەڵسەنگاندین"
                      >
                        {isSubmitting ? <RotateCw className="animate-spin" size={14} /> : <Send size={14} />}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Comments List */}
              <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
                {isLoadingComments ? (
                  <div className="flex flex-col items-center justify-center py-8 text-stone-500 gap-1.5">
                    <RotateCw className="animate-spin text-yellow-500" size={18} />
                    <span className="text-[10px] font-sans">بارکردنی پێداچوونەوەکان...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-800/80 rounded-xl bg-[#08080a]">
                    <p className="text-[11px] text-stone-500 font-sans">هیچ پێداچوونەوە کوالیتی بەرزی بڵاوکراوە لێرە نییە.</p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isAuthor = user?.uid === comment.userId;
                    const isAdminUser = user?.email === "abubakrsleman09@gmail.com";
                    
                    const formatCommentDate = (createdAt: any) => {
                      if (!createdAt) return "ئێستا";
                      let date: Date;
                      if (typeof createdAt?.toDate === "function") {
                        date = createdAt.toDate();
                      } else if (createdAt.seconds) {
                        date = new Date(createdAt.seconds * 1000);
                      } else {
                        date = new Date(createdAt);
                      }
                      return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      }) + " " + date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      });
                    };

                    // Check if it's a comprehensive review
                    const hasComplexRatings = comment.storyRating !== undefined || comment.actingRating !== undefined;

                    return (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-stone-850 bg-[#08080a]/40 p-4 sm:p-5 flex flex-col gap-4 hover:border-stone-800 transition duration-200 text-right"
                      >
                        {/* Header of comment info card */}
                        <div className="flex items-start justify-between flex-row-reverse">
                          <div className="flex items-center gap-2.5">
                            <div className="text-right">
                              <h4 className="text-xs font-bold text-stone-200 flex items-center justify-end gap-1.5">
                                <span>{comment.userName}</span>
                                {comment.userEmail === "abubakrsleman09@gmail.com" && (
                                  <span className="text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">بەرێوەبەر</span>
                                )}
                              </h4>
                              <p className="text-[9px] text-stone-500 mt-0.5 font-sans">
                                {formatCommentDate(comment.createdAt)}
                              </p>
                            </div>
                            {comment.userPhoto ? (
                              <img src={comment.userPhoto} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border border-stone-850" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-stone-850 border border-stone-800 flex items-center justify-center text-stone-400">
                                <User size={14} />
                              </div>
                            )}
                          </div>

                          {/* Comment controls (Edit / Delete / Star rating) */}
                          <div className="flex items-center gap-2">
                            {isAuthor && editingCommentId !== comment.id && (
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.text);
                                  setEditingCommentRating(comment.rating || 5);
                                }}
                                className="h-7 w-7 rounded-lg border border-stone-850 hover:border-yellow-500/30 text-stone-400 hover:text-yellow-500 flex items-center justify-center transition duration-200 cursor-pointer"
                                title="دەستکاریکردنی لێدوان"
                              >
                                <Pencil size={11} />
                              </button>
                            )}

                            {(isAuthor || isAdminUser) && (
                              <button
                                onClick={() => handleCommentDelete(comment.id)}
                                className="h-7 w-7 rounded-lg border border-stone-850 hover:border-red-500/30 text-stone-400 hover:text-red-400 flex items-center justify-center transition duration-200 cursor-pointer"
                                title="سڕینەوەی لێدوان"
                              >
                                <Trash size={12} />
                              </button>
                            )}

                            {/* Stars badge */}
                            <div className="flex gap-0.5 bg-[#0e0e11] px-2.5 py-1 rounded-lg border border-stone-800/80">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={10}
                                  className={s <= (editingCommentId === comment.id ? editingCommentRating : comment.rating) ? "fill-yellow-400 text-yellow-400 stroke-none" : "text-stone-700"}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Text of comment or Edit View */}
                        {editingCommentId === comment.id ? (
                          <div className="mt-1 space-y-3 bg-stone-900/40 p-3.5 rounded-xl border border-stone-800 text-right rtl-dir">
                            {/* Star rating picker for edit */}
                            <div className="flex items-center justify-between text-xs flex-row-reverse mb-1">
                              <span className="text-stone-400 font-sans">هەڵسەنگاندنی نوێ:</span>
                              <div className="flex gap-1 flex-row-reverse">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    type="button"
                                    key={star}
                                    onClick={() => setEditingCommentRating(star)}
                                    className="p-0.5 text-stone-500 hover:text-yellow-400 transition cursor-pointer"
                                  >
                                    <Star
                                      size={15}
                                      className={star <= editingCommentRating ? "fill-yellow-400 text-yellow-400 stroke-none animate-[pulse_1s_infinite]" : "text-stone-700"}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Edit text area */}
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full rounded-lg border border-stone-800 bg-[#121214] p-2.5 text-right text-xs text-stone-200 focus:border-yellow-500/40 focus:outline-none focus:ring-1 focus:ring-yellow-500/20 font-sans leading-relaxed"
                              rows={3}
                            />

                            {/* Edit action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                                className="flex-1 py-1.5 px-3 rounded-lg border border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-400 hover:text-stone-300 font-sans text-[11px] transition cursor-pointer"
                              >
                                پاشگەزبوونەوە
                              </button>
                              <button
                                onClick={() => handleCommentUpdate(comment.id)}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-sans text-[11px] font-bold shadow-lg shadow-yellow-500/5 transition cursor-pointer"
                              >
                                پاشەکەوتکردن
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* If review has a recommendation option */}
                            {comment.isRecommended !== undefined && (
                              <div className="flex justify-start">
                                {comment.isRecommended ? (
                                  <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                                    پێشنیار دەکات ✓
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                                    پێشنیار ناکات ✗
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Main feedback body */}
                            <p className="text-xs text-stone-300 font-sans leading-relaxed text-right whitespace-pre-wrap">
                              {comment.text}
                            </p>

                            {/* Criterion breakdowns meters */}
                            {hasComplexRatings && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-900/10 p-3 rounded-xl border border-stone-850/60 text-right select-none font-sans mt-2">
                                <div className="text-[10px] text-stone-400">
                                  <div className="flex justify-between flex-row-reverse mb-0.5 text-[9px] text-stone-500 mb-1">
                                    <span>چیرۆک</span>
                                    <strong>{comment.storyRating || 8}/١٠</strong>
                                  </div>
                                  <div className="w-full bg-stone-900/80 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(comment.storyRating || 8) * 10}%` }} />
                                  </div>
                                </div>

                                <div className="text-[10px] text-stone-400">
                                  <div className="flex justify-between flex-row-reverse mb-0.5 text-[9px] text-stone-500 mb-1">
                                    <span>نواندن</span>
                                    <strong>{comment.actingRating || 8}/١٠</strong>
                                  </div>
                                  <div className="w-full bg-stone-900/80 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(comment.actingRating || 8) * 10}%` }} />
                                  </div>
                                </div>

                                <div className="text-[10px] text-stone-400">
                                  <div className="flex justify-between flex-row-reverse mb-0.5 text-[9px] text-stone-500 mb-1">
                                    <span>تەکنیکی</span>
                                    <strong>{comment.visualsRating || 8}/١٠</strong>
                                  </div>
                                  <div className="w-full bg-stone-900/80 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(comment.visualsRating || 8) * 10}%` }} />
                                  </div>
                                </div>

                                <div className="text-[10px] text-stone-400">
                                  <div className="flex justify-between flex-row-reverse mb-0.5 text-[9px] text-stone-500 mb-1">
                                    <span>دەنگ و مۆسیقا</span>
                                    <strong>{comment.soundRating || 8}/١٠</strong>
                                  </div>
                                  <div className="w-full bg-stone-900/80 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(comment.soundRating || 8) * 10}%` }} />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Pros & Cons listed visual breakdown */}
                            {((comment.pros && comment.pros.length > 0) || (comment.cons && comment.cons.length > 0)) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 border-t border-stone-850/40 pt-2 text-right">
                                {/* Pros column */}
                                {comment.pros && comment.pros.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-emerald-400 font-bold block">خاڵە بەهێزەکان:</span>
                                    <div className="space-y-0.5">
                                      {comment.pros.map((p: string, idx: number) => (
                                        <div key={idx} className="text-[10px] text-stone-400 flex items-center gap-1 justify-end flex-row-reverse">
                                          <div className="h-1 w-1 bg-emerald-400 rounded-full" />
                                          <span>{p}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Cons column */}
                                {comment.cons && comment.cons.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-red-400 font-bold block">خاڵە لاوازەکان:</span>
                                    <div className="space-y-0.5">
                                      {comment.cons.map((c: string, idx: number) => (
                                        <div key={idx} className="text-[10px] text-stone-400 flex items-center gap-1 justify-end flex-row-reverse">
                                          <div className="h-1 w-1 bg-red-400 rounded-full" />
                                          <span>{c}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Thumbs up upvote review helpful action button bar */}
                            <div className="flex items-center justify-between border-t border-stone-900/80 pt-2.5 mt-2 flex-row-reverse">
                              <button
                                onClick={() => handleToggleHelpful(comment.id)}
                                className={`flex items-center gap-1.5 text-[10px] font-sans px-3 py-1.5 rounded-lg border transition cursor-pointer select-none ${
                                  user && comment.helpfulBy?.includes(user.uid)
                                    ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 font-semibold"
                                    : "bg-transparent border-stone-850 text-stone-400 hover:text-stone-200"
                                }`}
                              >
                                <ThumbsUp size={11} className={user && comment.helpfulBy?.includes(user?.uid) ? "fill-yellow-500/20" : ""} />
                                <span>بەسوودە ({comment.helpfulCount || 0})</span>
                              </button>

                              <span className="text-[9px] text-stone-600 font-sans">ئەم پێداچوونەوەیە چاکسازی دەرهێناوە</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
