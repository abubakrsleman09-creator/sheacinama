import React, { useState, useEffect, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { List, FolderPlus, Unlock, Lock, Heart, Trash2, Edit2, Play, Plus, X, Search, Sparkles, User, ChevronRight, Check } from "lucide-react";
import { Movie } from "../types";

interface UserPlaylistsProps {
  user: FirebaseUser | null;
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  onClose: () => void;
  customDisplayName?: string | null;
  customPhotoURL?: string | null;
}

const TEMPLATE_THEMES = [
  { name: "تاریکی زێڕین", value: "from-amber-600 to-yellow-400 text-stone-950", border: "border-amber-500/20" },
  { name: "شەپۆلی شین", value: "from-sky-600 to-blue-500 text-white", border: "border-sky-500/20" },
  { name: "کڵپەی دۆزەخ", value: "from-red-600 to-orange-500 text-white", border: "border-red-500/20" },
  { name: "گرینی سحر", value: "from-emerald-600 to-teal-500 text-white", border: "border-emerald-500/20" },
  { name: "ئەنیمێ مۆر", value: "from-purple-600 to-indigo-500 text-white", border: "border-purple-500/20" }
];

export default function UserPlaylists({
  user,
  movies,
  onMovieSelect,
  onClose,
  customDisplayName,
  customPhotoURL
}: UserPlaylistsProps) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create playlist form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(TEMPLATE_THEMES[0].value);

  // Edit/View specific playlist state
  const [activePlaylist, setActivePlaylist] = useState<any | null>(null);
  const [addMoviesSearch, setAddMoviesSearch] = useState("");

  const searchFilteredMovies = useMemo(() => {
    if (!addMoviesSearch.trim()) return [];
    return movies.filter(m =>
      m.title.toLowerCase().includes(addMoviesSearch.toLowerCase()) ||
      m.genre?.toLowerCase().includes(addMoviesSearch.toLowerCase())
    ).slice(0, 5);
  }, [addMoviesSearch, movies]);

  // Sync playlists
  useEffect(() => {
    setLoading(true);
    
    // 1. Fetch public playlists across the platform
    const publicQ = query(collection(db, "playlists"), where("isPublic", "==", true));
    const unsubPublic = onSnapshot(publicQ, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setPublicPlaylists(list);
    }, (err) => console.warn(err));

    // 2. Fetch specific user's playlists
    if (!user) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    const myQ = query(collection(db, "playlists"), where("userId", "==", user.uid));
    const unsubMy = onSnapshot(myQ, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setPlaylists(list);
      setLoading(false);
    }, (err) => {
      console.warn(err);
      setLoading(false);
    });

    return () => {
      unsubPublic();
      unsubMy();
    };
  }, [user]);

  // Create logic
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    try {
      await addDoc(collection(db, "playlists"), {
        userId: user.uid,
        userName: customDisplayName || user.displayName || "بینەر",
        userPhoto: customPhotoURL || (user.photoURL === "/custom_avatar" ? "" : user.photoURL) || "",
        title: title.trim(),
        description: description.trim(),
        isPublic,
        theme: selectedTheme,
        likes: 0,
        likedBy: [],
        movieIds: [],
        createdAt: new Date().toISOString()
      });

      setTitle("");
      setDescription("");
      setIsPublic(true);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("ئایا دڵنیایت لە سڕینەوەی ئەم کۆکراوەیە؟")) return;
    try {
      await deleteDoc(doc(db, "playlists", id));
      if (activePlaylist?.id === id) {
        setActivePlaylist(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Like checklist Public
  const handleToggleLike = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const hasLiked = p.likedBy?.includes(user.uid);
    const ref = doc(db, "playlists", p.id);

    try {
      await updateDoc(ref, {
        likedBy: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likes: increment(hasLiked ? -1 : 1)
      });

      // Quick trigger real time inside active state if opened
      if (activePlaylist?.id === p.id) {
        setActivePlaylist((prev: any) => ({
          ...prev,
          likedBy: hasLiked
            ? prev.likedBy.filter((uid: string) => uid !== user.uid)
            : [...(prev.likedBy || []), user.uid],
          likes: (prev.likes || 0) + (hasLiked ? -1 : 1)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Movie to Playlist
  const handleAddMovieToPlaylist = async (movieId: string) => {
    if (!activePlaylist) return;
    if (activePlaylist.movieIds?.includes(movieId)) return;

    const ref = doc(db, "playlists", activePlaylist.id);
    try {
      await updateDoc(ref, {
        movieIds: arrayUnion(movieId)
      });
      setActivePlaylist((prev: any) => ({
        ...prev,
        movieIds: [...(prev.movieIds || []), movieId]
      }));
      setAddMoviesSearch("");
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Movie from Playlist
  const handleRemoveMovieFromPlaylist = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePlaylist) return;

    const ref = doc(db, "playlists", activePlaylist.id);
    try {
      await updateDoc(ref, {
        movieIds: arrayRemove(movieId)
      });
      setActivePlaylist((prev: any) => ({
        ...prev,
        movieIds: prev.movieIds.filter((id: string) => id !== movieId)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 rtl-dir animate-[fadeIn_0.4s_ease-out]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 pb-5 mb-8 gap-4">
        <div className="text-right flex flex-col gap-1">
          <div className="flex items-center gap-2 justify-end">
            <List className="text-yellow-500" size={24} />
            <h1 className="text-2xl font-black text-white font-sans">
              کۆکراوە و لیستی لێدانی بینەران
            </h1>
          </div>
          <p className="text-xs text-stone-400 font-sans">
            لیستی تایبەت دروست بکە یان سەیری باشترینی کۆکراوەکانی بینەران بکە لێرەدا
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {user && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="rounded-full bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-bold px-5 py-2 text-xs font-sans flex items-center gap-1.5 transition cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>کۆکەرەوەی نوێ</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white px-5 py-2 text-xs font-bold font-sans flex items-center gap-1.5 transition cursor-pointer"
          >
            <ChevronRight size={14} />
            <span>گەڕانەوە بۆ ماڵەوە</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {activePlaylist ? (
        // Detailed playlist viewer inside view
        <div className="space-y-6">
          {/* Back button to playlists */}
          <button
            onClick={() => setActivePlaylist(null)}
            className="flex items-center gap-1.5 text-stone-400 hover:text-white transition text-xs font-bold font-sans cursor-pointer mb-2"
          >
            <ChevronRight size={14} />
            <span>گەڕانەوە بۆ لای کۆکراوەکان</span>
          </button>

          {/* Hero Banner card representing themed playlist attributes */}
          <div className={`rounded-3xl bg-gradient-to-tr ${activePlaylist.theme} p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl`}>
            <div className="text-right space-y-2 max-w-xl">
              <div className="flex items-center gap-2 justify-start flex-wrap">
                {activePlaylist.isPublic ? (
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[10px] font-sans">
                    <Unlock size={11} /> گشتی
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[10px] font-sans">
                    <Lock size={11} /> تایبەت
                  </span>
                )}
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">
                  {activePlaylist.movieIds?.length || 0} فیلم و زنجیرە
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black leading-tight">{activePlaylist.title}</h2>
              <p className="text-xs opacity-80 leading-relaxed font-sans">{activePlaylist.description || "هیچ کورتەیەکی دیسکرپشن نییە بۆ ئەم کۆمەڵەیە."}</p>
              
              <div className="flex items-center gap-2 pt-2 text-[10px] opacity-75">
                <span>بەرهەمهێنراوە لەلایەن: <strong className="font-sans">{activePlaylist.userName}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={(e) => handleToggleLike(activePlaylist, e)}
                className="flex items-center gap-1.5 text-xs font-bold bg-white/15 hover:bg-white/20 rounded-2xl px-5 py-3 transition cursor-pointer"
              >
                <Heart size={14} className={user && activePlaylist.likedBy?.includes(user?.uid) ? "fill-red-500 stroke-none" : ""} />
                <span>{activePlaylist.likes || 0} لایک کردن</span>
              </button>

              {user && user.uid === activePlaylist.userId && (
                <button
                  onClick={(e) => handleDeletePlaylist(activePlaylist.id, e)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-2xl p-3 transition cursor-pointer"
                  title="سڕینەوەی کەتەلۆگ"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Add Movies panel if creator of playlist */}
          {user && user.uid === activePlaylist.userId && (
            <div className="bg-[#09090b] border border-stone-850 p-5 rounded-2xl space-y-3">
              <h3 className="text-stone-300 text-xs font-bold font-sans">زیادکردنی فیلمەکان بۆ ئەم کۆکراوەیە</h3>
              <div className="relative">
                <Search className="absolute right-3.5 top-3.5 text-stone-500" size={14} />
                <input
                  type="text"
                  placeholder="ناوی پۆستەرەکە بنووسە بۆ دۆزینەوە..."
                  value={addMoviesSearch}
                  onChange={(e) => setAddMoviesSearch(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#121214] py-3 pr-10 pl-4 text-right text-stone-200 placeholder-stone-500 focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              {/* Instant Search Results dropdown */}
              {searchFilteredMovies.length > 0 && (
                <div className="bg-[#0a0a0c] border border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-900">
                  {searchFilteredMovies.map((m) => {
                    const alreadyHas = activePlaylist.movieIds?.includes(m.id);
                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs gap-3">
                        <button
                          onClick={() => handleAddMovieToPlaylist(m.id)}
                          disabled={alreadyHas}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans transition flex items-center gap-1 cursor-pointer ${alreadyHas ? 'bg-stone-900 border border-stone-800 text-stone-600' : 'bg-yellow-500 text-stone-950 hover:bg-yellow-400'}`}
                        >
                          {alreadyHas ? "پیشتر زیادکراوە" : "زیادکردن"}
                          {!alreadyHas && <Plus size={10} />}
                        </button>
                        <div className="text-right truncate">
                          <p className="font-semibold text-stone-200">{m.title}</p>
                          <p className="text-[9px] text-stone-500">{m.genre}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* List of movies nested inside with visual grids */}
          <div className="space-y-4">
            <h3 className="text-stone-200 text-sm font-bold font-sans flex items-center gap-2 justify-start">
              <span>ناوەرۆکەکانی ناو کۆکراوە</span>
              <span className="text-[10px] bg-stone-900/40 border border-stone-850 px-2.5 py-0.5 rounded-full text-stone-400">
                {(activePlaylist.movieIds || []).length} ناونیشان
              </span>
            </h3>

            {(!activePlaylist.movieIds || activePlaylist.movieIds.length === 0) ? (
              <div className="text-center py-12 border border-dashed border-stone-850 rounded-2xl bg-[#09090b]">
                <p className="text-xs text-stone-500 font-sans">ئەم کۆکراوەیە بەتاڵە لە ئێستادا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {activePlaylist.movieIds.map((id: string) => {
                  const m = movies.find(movie => movie.id === id);
                  if (!m) return null;

                  return (
                    <div
                      key={m.id}
                      onClick={() => onMovieSelect(m)}
                      className="group relative rounded-xl overflow-hidden bg-[#0a0a0c] border border-stone-850 hover:border-stone-700 transition duration-300 cursor-pointer flex flex-col select-none"
                    >
                      <img src={m.posterUrl} alt="" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-105" />
                      
                      <div className="p-3 text-right">
                        <h4 className="text-xs font-bold text-stone-200 truncate group-hover:text-yellow-400 transition">{m.title}</h4>
                        <p className="text-[10px] text-stone-500 font-sans mt-0.5 truncate">{m.genre}</p>
                      </div>

                      {user && user.uid === activePlaylist.userId && (
                        <button
                          onClick={(e) => handleRemoveMovieFromPlaylist(m.id, e)}
                          className="absolute top-2 left-2 h-7 w-7 rounded-lg bg-black/80 hover:bg-red-500/30 text-stone-400 hover:text-red-400 flex items-center justify-center transition border border-stone-800"
                          title="لابردنی فیلم لە کۆکراوە"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Standard Grid for all Playlists (Public + My Saved Playlists)
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
          
          {/* Form to create a new playlist inside dropdown modal/pane if Creating is true */}
          {isCreating && (
            <form onSubmit={handleCreatePlaylist} className="p-5 md:p-6 rounded-2xl border border-stone-800 bg-[#09090b] shadow-2xl space-y-4 rtl-dir text-right animate-[fadeIn_0.3s_ease]">
              <div className="flex items-center gap-2 border-b border-stone-850 pb-3 justify-end">
                <FolderPlus className="text-yellow-500" size={16} />
                <h3 className="text-stone-200 text-xs font-bold font-sans">دروستکردنی سەکۆی کۆکراوەی نوێ</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] text-stone-400 font-bold font-sans">ناونیشانی کەتەلۆگەکە:</label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: باشترین کورتە فیلمەکانی مێژوو..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-800 bg-[#121214] px-4 py-2.5 text-stone-200 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-stone-400 font-bold font-sans">شێواز و ڕەنگی پاشخان:</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEMPLATE_THEMES.map((theme) => (
                      <button
                        type="button"
                        key={theme.name}
                        onClick={() => setSelectedTheme(theme.value)}
                        className={`h-7 px-3.5 rounded text-[10px] font-bold font-sans bg-gradient-to-tr ${theme.value} transition ${selectedTheme === theme.value ? 'ring-2 ring-white scale-95' : 'opacity-80'}`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-stone-400 font-bold font-sans">کورتەیەک لە دیسکرپشن:</label>
                <textarea
                  placeholder="باسێک بنووسە لە باسی بژاردەکانت کەتەلۆگەکە..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#121214] p-3 text-stone-200 focus:outline-none focus:border-yellow-500/50 h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    دروستکردن و پاشەکەوت
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="bg-stone-900 hover:bg-stone-850 px-5 py-2.5 rounded-xl border border-stone-800 text-stone-400 transition cursor-pointer"
                  >
                    پاشگەزبوونەوە
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-sans">
                  <span className="text-stone-400">کەتەلۆگ بە گشتی بڵاوبکرێتەوە؟</span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-800 bg-[#121214] text-yellow-500 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}

          {/* User's Own Playlists Section */}
          {user && (
            <div className="space-y-4">
              <h3 className="text-stone-300 text-xs font-bold font-sans flex items-center gap-2 justify-start mb-2">
                <Lock size={12} className="text-yellow-500" />
                <span>کۆکراوەکانی من</span>
              </h3>

              {playlists.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed border-stone-850 bg-[#08080a]">
                  <p className="text-[11px] text-stone-500 font-sans">تۆ هێشتا هیچ فۆڵدەر یان کۆمەڵەیەکی کۆکراوەت دروست نەکردووە.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {playlists.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setActivePlaylist(p)}
                      className={`relative rounded-2xl bg-gradient-to-tr ${p.theme} border border-stone-800/25 p-5 flex flex-col justify-between h-44 shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer text-right group`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between flex-row-reverse gap-4">
                          <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] font-sans flex items-center gap-0.5">
                            {p.isPublic ? <Unlock size={10} /> : <Lock size={10} />}
                            {p.isPublic ? "گشتی" : "تایبەت"}
                          </span>
                          <button
                            onClick={(e) => handleDeletePlaylist(p.id, e)}
                            className="opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 p-1.5 rounded-lg text-white transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <h4 className="text-sm font-black truncate max-w-[200px]">{p.title}</h4>
                        <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">{p.description || "بێ وەسف"}</p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] opacity-75">
                        <span className="font-sans font-medium">فیلمەکان: {p.movieIds?.length || 0} فیلم</span>
                        <span className="flex items-center gap-1">
                          <Heart size={11} /> {p.likes || 0} لایک
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Platform Platform Public Playlists Section */}
          <div className="space-y-4">
            <h3 className="text-stone-300 text-xs font-bold font-sans flex items-center gap-2 justify-start mb-2">
              <Unlock size={12} className="text-teal-500 animate-[pulse_1s_infinite]" />
              <span>دیارترین کۆکراوە گشتییەکانی کۆمەڵگەی بڵۆگەران</span>
            </h3>

            {publicPlaylists.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-stone-850 bg-[#08080a]">
                <p className="text-[11px] text-stone-500 font-sans">لە ئێستادا هیچ مۆدی کۆکراوەی گشتی لە دەروە بەتاڵە.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {publicPlaylists.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePlaylist(p)}
                    className={`relative rounded-2xl bg-gradient-to-tr ${p.theme} border border-[#ffffff08] p-5 flex flex-col justify-between h-44 shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer text-right`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <span className="bg-black/20 text-white px-2 py-0.5 rounded text-[9px] font-sans flex items-center gap-0.5">
                          <Unlock size={10} /> گشتی
                        </span>
                        
                        {/* Avatar photo block */}
                        <div className="flex items-center gap-1.5 flex-row-reverse text-[9px] opacity-80">
                          {p.userPhoto ? (
                            <img src={p.userPhoto} alt="" className="h-4 w-4 rounded-full border border-white/20" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-black/20 flex items-center justify-center">
                              <User size={8} />
                            </div>
                          )}
                          <span>{p.userName}</span>
                        </div>
                      </div>
                      <h4 className="text-sm font-black truncate max-w-[200px] mt-1">{p.title}</h4>
                      <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed font-sans">{p.description || "کۆکراوەی ناوازە"}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] opacity-75">
                      <span className="font-sans font-medium">{p.movieIds?.length || 0} فیلم و زنجیرە</span>
                      <button
                        onClick={(e) => handleToggleLike(p, e)}
                        className="flex items-center gap-1 hover:scale-105 bg-black/10 hover:bg-black/20 rounded-full px-2.5 py-1 transition cursor-pointer"
                      >
                        <Heart size={11} className={user && p.likedBy?.includes(user?.uid) ? "fill-red-500 stroke-none" : "text-white"} />
                        <span>{p.likes || 0} لایک کردن</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
