import React, { useState } from "react";
import { Plus, Trash2, Edit, Save, PlusCircle, MinusCircle, AlertCircle, RefreshCw, Key, Upload, Image as ImageIcon } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Movie, StreamServer, Season, Episode } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";

interface AdminPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  movies: Movie[];
  onMovieSaved: () => void;
  onEditMovie: (movie: Movie) => void;
}

export default function AdminPanel({
  user,
  isAdmin,
  movies,
  onMovieSaved,
  onEditMovie,
}: AdminPanelProps) {
  // Movie Form State
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("فیلم");
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isTrending, setIsTrending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Server slots inside the form
  const [servers, setServers] = useState<Omit<StreamServer, "id">[]>([
    { name: "سێرڤەری سەرەکی", url: "" },
  ]);

  // Seasons state for TV series
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Season / Episode action handlers
  const handleAddSeason = () => {
    const newSeasonId = `sn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nextNum = (seasons.length + 1).toString();
    setSeasons([
      ...seasons,
      {
        id: newSeasonId,
        seasonNumber: nextNum,
        title: `وەرزی ${nextNum}`,
        episodes: []
      }
    ]);
  };

  const handleRemoveSeason = (seasonId: string) => {
    setSeasons(seasons.filter(s => s.id !== seasonId));
  };

  const handleUpdateSeason = (seasonId: string, field: 'seasonNumber' | 'title', value: string) => {
    setSeasons(seasons.map(s => s.id === seasonId ? { ...s, [field]: value } : s));
  };

  const handleAddEpisode = (seasonId: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      const nextEpNum = (s.episodes.length + 1).toString();
      const newEpId = `ep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return {
        ...s,
        episodes: [
          ...s.episodes,
          {
            id: newEpId,
            episodeNumber: nextEpNum,
            title: `ئەڵقەی ${nextEpNum}`,
            servers: [{ id: `srv-${Date.now()}-1`, name: "سێرڤەری سەرەکی", url: "" }]
          }
        ]
      };
    }));
  };

  const handleRemoveEpisode = (seasonId: string, episodeId: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        episodes: s.episodes.filter(e => e.id !== episodeId)
      };
    }));
  };

  const handleUpdateEpisode = (seasonId: string, episodeId: string, field: 'episodeNumber' | 'title', value: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => e.id === episodeId ? { ...e, [field]: value } : e)
      };
    }));
  };

  const handleAddEpisodeServer = (seasonId: string, episodeId: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => {
          if (e.id !== episodeId) return e;
          return {
            ...e,
            servers: [
              ...e.servers,
              { id: `srv-${Date.now()}-${e.servers.length + 1}`, name: `سێرڤەری ${e.servers.length + 1}`, url: "" }
            ]
          };
        })
      };
    }));
  };

  const handleRemoveEpisodeServer = (seasonId: string, episodeId: string, serverId: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => {
          if (e.id !== episodeId) return e;
          if (e.servers.length <= 1) return e;
          return {
            ...e,
            servers: e.servers.filter(srv => srv.id !== serverId)
          };
        })
      };
    }));
  };

  const handleUpdateEpisodeServer = (seasonId: string, episodeId: string, serverId: string, field: 'name' | 'url', value: string) => {
    setSeasons(seasons.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        episodes: s.episodes.map(e => {
          if (e.id !== episodeId) return e;
          return {
            ...e,
            servers: e.servers.map(srv => srv.id === serverId ? { ...srv, [field]: value } : srv)
          };
        })
      };
    }));
  };

  // Handle Local image uploads (converts to Base64 data url)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'poster' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Standard high definition check - check maximum size to protect performance & Firestore constraints
    if (file.size > 850000) { 
      setErrorMessage("وەزارەتی هۆشیارکردنەوە: قەبارەی فایلەکە لێرەدا دەبێت لە ٨٥٠ کیلۆبایت کەمتر بێت بۆ ئەوەی خێرایی نیشاندانی تێک نەچێت!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (target === 'poster') {
        setPosterUrl(base64String);
        setSuccessMessage("وێنەی پۆستەر بە سەرکەوتوویی بارکرا!");
      } else {
        setBannerUrl(base64String);
        setSuccessMessage("وێنەی باکدرۆپ بە سەرکەوتوویی بارکرا!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset form
  const dbResetForm = () => {
    setEditingMovieId(null);
    setTitle("");
    setDescription("");
    setYear(new Date().getFullYear().toString());
    setCategory("فیلم");
    setGenre("");
    setRating("");
    setPosterUrl("");
    setBannerUrl("");
    setIsTrending(false);
    setServers([{ name: "سێرڤەری سەرەکی", url: "" }]);
    setSeasons([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetForm = dbResetForm;

  // Add Server slot
  const handleAddServerSlot = () => {
    setServers([...servers, { name: `سێرڤەری نوێ ${servers.length + 1}`, url: "" }]);
  };

  // Remove Server slot
  const handleRemoveServerSlot = (index: number) => {
    if (servers.length <= 1) {
      setErrorMessage("پێویستە بەلایەنی کەم یەک سێرڤەری ڤیدیۆ هەبێت.");
      return;
    }
    const updated = [...servers];
    updated.splice(index, 1);
    setServers(updated);
  };

  // Update specific Server slot details
  const handleServerChange = (index: number, field: "name" | "url", value: string) => {
    const updated = [...servers];
    updated[index][field] = value;
    setServers(updated);
  };

  // Populate data when editing
  const handleStartEdit = (movie: Movie) => {
    setEditingMovieId(movie.id);
    setTitle(movie.title || "");
    setDescription(movie.description || "");
    setYear(movie.year || "");
    setCategory(movie.category || "فیلم");
    setGenre(movie.genre || "");
    setRating(movie.rating || "");
    setPosterUrl(movie.posterUrl || "");
    setBannerUrl(movie.bannerUrl || "");
    setIsTrending(!!movie.isTrending);
    setServers(
      movie.servers && movie.servers.length > 0
        ? movie.servers.map((s) => ({ name: s.name, url: s.url }))
        : [{ name: "سێرڤەری سەرەکی", url: "" }]
    );
    setSeasons(movie.seasons || []);
    // Smooth scroll to form
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  // Delete a movie from Firestore
  const handleDeleteMovie = async (movieId: string) => {
    if (!window.confirm("ئایا دڵنیای لە سڕینەوەی ئەم بابەتە؟")) return;

    try {
      const path = `movies`;
      await deleteDoc(doc(db, path, movieId));
      setSuccessMessage("فیلمەکە بە سەرکەوتوویی سڕایەوە.");
      onMovieSaved();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `movies/${movieId}`);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!title || !posterUrl) {
      setErrorMessage("تکایە ناونیشان و بەستەری پۆستەر بنوسە.");
      return;
    }

    setIsSubmitting(true);

    // Format server list with specific ID references
    const formattedServers: StreamServer[] = servers.map((s, idx) => ({
      id: `srv-${idx}-${Date.now()}`,
      name: s.name.trim() || `سێرڤەری ${idx + 1}`,
      url: s.url.trim(),
    }));

    const moviePayload = {
      title: title.trim(),
      description: description.trim(),
      year: year.trim(),
      category: category,
      genre: genre.trim(),
      rating: rating.trim(),
      posterUrl: posterUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      servers: formattedServers,
      seasons: category === "زنجیرە" ? seasons : [],
      isTrending: isTrending,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingMovieId) {
        // Update existing movie
        const path = `movies/${editingMovieId}`;
        await updateDoc(doc(db, "movies", editingMovieId), moviePayload);
        setSuccessMessage("بەرهەمەکە بە سەرکەوتوویی هەموارکرایەوە!");
      } else {
        // Create new movie
        const path = `movies`;
        await addDoc(collection(db, "movies"), {
          ...moviePayload,
          createdAt: serverTimestamp(),
        });
        setSuccessMessage("بەرهەمەکە بە سەرکەوتوویی زیادکرا بۆ داتابەیس!");
      }

      resetForm();
      onMovieSaved();
    } catch (err) {
      setErrorMessage("هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردنی داتاکان. لێپێچینەوە لە ڕێساکانی فایەربەیس.");
      handleFirestoreError(err, OperationType.WRITE, `movies/${editingMovieId || "new"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 rtl-dir text-right">
      
      {/* Admin Title Block */}
      <div className="mb-8 border-b border-stone-800 pb-5">
        <h2 className="text-xl font-bold text-white md:text-2xl font-display flex items-center gap-2 justify-start">
          <Key className="text-yellow-400 stroke-[2.5]" size={24} />
          <span>کۆنترۆڵ پانێڵی بەڕێوەبەر</span>
        </h2>
        <p className="text-stone-400 text-xs mt-1 font-sans">
          لێرەوە دەتوانیت فیلم و زنجیرە زیاد بکەیت، سێرڤەر دابنێیت و بژمێری فلیمەکان کۆنترۆڵ بکەیت وەک بڵاوکەرەوە.
        </p>
      </div>

      {/* Success / Error alert boxes */}
      {errorMessage && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400">
          <AlertCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Admin Main Action Grid (Add Movie Form left, list right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form panel */}
        <div className="lg:col-span-7 bg-[#101012] border border-stone-800/80 rounded-2xl p-6">
          <h3 className="text-stone-100 text-sm font-bold font-sans mb-5 border-b border-stone-800 pb-3 flex justify-between items-center">
            <span>{editingMovieId ? "هەموارکردنی زانیاریەکانی بابەت" : "زیادکردنی بابەتێکی نوێ"}</span>
            {editingMovieId && (
              <button onClick={resetForm} className="text-stone-500 hover:text-white text-xs font-normal">
                لابردن / پاشگەزبوونەوە
              </button>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">ناوی فیلم یان زنجیرە (پێویستە)</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="بۆ نموونە: Interstellar"
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">جۆری بەرهەم</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                >
                  <option value="فیلم">فیلم</option>
                  <option value="زنجیرە">زنجیرە</option>
                  <option value="فیلمی کوردی">فیلمی کوردی</option>
                  <option value="ئەنیمێ">ئەنیمێ</option>
                  <option value="دۆکیومێنتاری">دۆکیومێنتاری</option>
                  <option value="تایبەت">تایبەت</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">ساڵی بەرهەمهێنان</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                  className="w-full text-xs text-center rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">هاوپۆل / ژێنەرەکان</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="ئاکشن، سەرکێشی، خەیاڵی"
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">نمرەی IMDb</label>
                <input
                  type="text"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="8.6"
                  className="w-full text-xs text-center rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5">کورتە / دیسکرپشن (کوردى)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="کورتەیەک بنووسە پێک بێت لە تێبینیەکان یان کورتەی فیلمەکە..."
                rows={3}
                className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-400 font-sans">بەستەری پۆستەر یان وێنە (پێویستە)</label>
                <input
                  type="text"
                  required
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://image-url-here..."
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />
                
                {/* Beautiful custom local file picker button */}
                <div className="relative flex items-center justify-center border border-dashed border-stone-800 rounded-xl p-2.5 bg-[#141416] hover:bg-[#18181c] hover:border-yellow-500/30 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'poster')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 font-sans group-hover:text-yellow-400">
                    <Upload size={12} className="text-yellow-500" />
                    <span>یاخود بارکردنی فایل لە ئامێرەکەتەوە</span>
                  </div>
                </div>

                {posterUrl && (
                  <div className="flex items-center gap-2 mt-1 bg-stone-900/40 p-1.5 rounded-lg border border-stone-800/60">
                    <ImageIcon size={14} className="text-yellow-500 flex-shrink-0" />
                    <span className="text-[9px] text-stone-500 truncate max-w-[200px]">{posterUrl.startsWith("data:") ? "فایلی پۆستەر بارکرا (Base64)" : posterUrl}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-400 font-sans">بەستەری باکدرۆپ (بانەرى ناوەوە)</label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://backdrop-url-here..."
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none"
                />

                {/* Beautiful custom local file picker button */}
                <div className="relative flex items-center justify-center border border-dashed border-stone-800 rounded-xl p-2.5 bg-[#141416] hover:bg-[#18181c] hover:border-yellow-500/30 transition-colors cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 font-sans group-hover:text-yellow-400">
                    <Upload size={12} className="text-yellow-500" />
                    <span>یاخود بارکردنی فایل لە ئامێرەکەتەوە</span>
                  </div>
                </div>

                {bannerUrl && (
                  <div className="flex items-center gap-2 mt-1 bg-stone-900/40 p-1.5 rounded-lg border border-stone-800/60">
                    <ImageIcon size={14} className="text-yellow-500 flex-shrink-0" />
                    <span className="text-[9px] text-stone-500 truncate max-w-[200px]">{bannerUrl.startsWith("data:") ? "فایلی بانەر بارکرا (Base64)" : bannerUrl}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 py-1.5 border-y border-stone-800/50">
              <input
                type="checkbox"
                id="trendingCheck"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                className="h-4 w-4 rounded border-stone-800 bg-[#161619] text-yellow-500 focus:ring-yellow-500/30"
              />
              <label htmlFor="trendingCheck" className="text-xs font-sans text-stone-300 cursor-pointer select-none">
                ئەم بابەتە بخەرە بەشی ترێندینگەکان (Trending Highlight)
              </label>
            </div>

            {category === "زنجیرە" ? (
              /* TV Series Seasons & Episodes Interactive Manager */
              <div className="py-4 border-t border-stone-800">
                <div className="flex justify-between items-center mb-4">
                  <button
                    type="button"
                    onClick={handleAddSeason}
                    className="text-xs font-semibold bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-stone-950 border border-yellow-500/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all outline-none"
                  >
                    <PlusCircle size={15} />
                    <span>زیادکردنی وەرزی نوێ</span>
                  </button>
                  <h4 className="text-yellow-400 text-xs font-bold font-sans">بەڕێوەبردنی سیزن و ئەڵقەکانی زنجیرە:</h4>
                </div>

                {seasons.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-dashed border-stone-800 bg-stone-900/10 text-stone-500 text-xs font-sans">
                    تا ئێستا هیچ وەرزێک دروستنەکراوە. بۆ دەستپێکردن کلیک لە "زیادکردنی وەرزی نوێ" بکە.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {seasons.map((season, sIdx) => (
                      <div key={season.id} className="p-4 rounded-xl border border-stone-800 bg-[#141416]/90 space-y-4">
                        {/* Season Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveSeason(season.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg text-[11px] font-sans transition-all flex items-center gap-1"
                          >
                            <Trash2 size={13} />
                            <span>سڕینەوەی ئەم وەرزی {season.seasonNumber}ە</span>
                          </button>
                          
                          <div className="flex items-center gap-2 flex-grow max-w-md justify-end">
                            <input
                              type="text"
                              value={season.title || ""}
                              placeholder="ناو بۆ نموونە: وەرزی یەکەم"
                              onChange={(e) => handleUpdateSeason(season.id, 'title', e.target.value)}
                              className="text-xs rounded-lg border border-stone-800 bg-[#1c1c1f] px-2.5 py-1.5 text-stone-100 text-right focus:outline-none flex-grow"
                            />
                            <input
                              type="text"
                              required
                              value={season.seasonNumber}
                              placeholder="ژمارەی وەرز"
                              onChange={(e) => handleUpdateSeason(season.id, 'seasonNumber', e.target.value)}
                              className="w-16 text-xs rounded-lg border border-stone-800 bg-[#1c1c1f] px-2.5 py-1.5 text-center text-stone-100 focus:outline-none font-mono"
                            />
                            <span className="text-[#ebebee] text-xs font-bold font-sans">سیزن </span>
                          </div>
                        </div>

                        {/* Episodes inside Season */}
                        <div className="space-y-3 rtl-dir text-right">
                          <div className="flex justify-between items-center mb-2">
                            <button
                              type="button"
                              onClick={() => handleAddEpisode(season.id)}
                              className="text-[11px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-sans bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all outline-none"
                            >
                              <Plus size={13} />
                              <span>زیادکردنی ئەڵقە</span>
                            </button>
                            <span className="text-stone-400 text-xs font-bold">ئەڵقەکانی ناو فیلمەکە:</span>
                          </div>

                          {season.episodes.length === 0 ? (
                            <div className="text-center py-4 bg-[#0d0d0f] rounded-lg border border-[#161619] text-stone-500 text-[11px] font-sans">
                              هیچ ئەڵقەیەک زیادنەکراوە.
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                              {season.episodes.map((episode) => (
                                <div key={episode.id} className="p-3 bg-[#0d0d0f] rounded-xl border border-stone-800 space-y-3">
                                  {/* Episode Fields */}
                                  <div className="flex justify-between items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEpisode(season.id, episode.id)}
                                      className="text-stone-500 hover:text-red-400 hover:bg-red-500/5 p-1 rounded-md transition-all"
                                      title="سڕینەوەی ئەم ئەڵقەیە"
                                    >
                                      <Trash2 size={13} />
                                    </button>

                                    <div className="flex gap-2 items-center flex-grow max-w-sm justify-end text-right">
                                      <input
                                        type="text"
                                        value={episode.title || ""}
                                        placeholder="ناونیشانی ئەڵقە (ئارەزوومەندانە)"
                                        onChange={(e) => handleUpdateEpisode(season.id, episode.id, 'title', e.target.value)}
                                        className="text-[11px] rounded-lg border border-stone-800 bg-[#161618] px-2 py-1.5 text-stone-100 text-right focus:outline-none flex-grow"
                                      />
                                      <input
                                        type="text"
                                        required
                                        value={episode.episodeNumber}
                                        placeholder="١"
                                        onChange={(e) => handleUpdateEpisode(season.id, episode.id, 'episodeNumber', e.target.value)}
                                        className="w-12 text-[11px] rounded-lg border border-stone-800 bg-[#161618] px-1.5 py-1.5 text-center text-stone-100 focus:outline-none font-mono font-bold"
                                      />
                                      <span className="text-stone-400 text-xs">ئەڵقەی</span>
                                    </div>
                                  </div>

                                  {/* Episode Servers */}
                                  <div className="mt-2.5 border-t border-[#1a1a1f] pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                      <button
                                        type="button"
                                        onClick={() => handleAddEpisodeServer(season.id, episode.id)}
                                        className="text-[10px] text-yellow-400/80 hover:text-yellow-300 flex items-center gap-1 font-sans cursor-pointer"
                                      >
                                        <Plus size={11} />
                                        <span>زیادکردنی سێرڤەر بۆ ئەم ئەڵقەیە</span>
                                      </button>
                                      <span className="text-stone-500 text-[10px]">فیدیۆی ئەڵقە:</span>
                                    </div>

                                    <div className="space-y-2">
                                      {episode.servers.map((srv) => (
                                        <div key={srv.id} className="flex gap-1.5 items-center">
                                          <button
                                            type="button"
                                            disabled={episode.servers.length <= 1}
                                            onClick={() => handleRemoveEpisodeServer(season.id, episode.id, srv.id)}
                                            className="text-stone-600 hover:text-red-400 hover:bg-stone-800/20 p-1 rounded-md disabled:opacity-35"
                                            title="سڕینەوەی سێرڤەر"
                                          >
                                            <MinusCircle size={13} />
                                          </button>

                                          <div className="flex gap-2 flex-grow">
                                            <input
                                              type="url"
                                              required
                                              value={srv.url}
                                              onChange={(e) => handleUpdateEpisodeServer(season.id, episode.id, srv.id, 'url', e.target.value)}
                                              placeholder="بەستەری لایڤ ستریم یان ئێمبێدی ئەڵقە"
                                              className="flex-grow text-[10px] rounded-lg border border-stone-800 bg-[#141416] px-2 py-1 text-stone-100 focus:outline-none"
                                            />
                                            <input
                                              type="text"
                                              required
                                              value={srv.name}
                                              onChange={(e) => handleUpdateEpisodeServer(season.id, episode.id, srv.id, 'name', e.target.value)}
                                              placeholder="ناوی سێرڤەر"
                                              className="w-24 text-[10px] rounded-lg border border-stone-800 bg-[#141416] px-1.5 py-1 text-stone-100 text-right focus:outline-none font-sans"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Dynamic Server Streams Section */
              <div className="py-2.5">
                <div className="flex justify-between items-center mb-3">
                  <button
                    type="button"
                    onClick={handleAddServerSlot}
                    className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-sans"
                  >
                    <PlusCircle size={15} />
                    <span>زیادکردنی سێرڤەری تر</span>
                  </button>
                  <h4 className="text-[#c1c1c7] text-xs font-bold font-sans">دیاریکردنی سێرڤەرەکانی دابینکردنی بینین:</h4>
                </div>

                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2 pb-1">
                  {servers.map((server, idx) => (
                    <div key={idx} className="flex gap-2 items-center p-3 rounded-xl border border-stone-800 bg-stone-900/40 relative">
                      {/* Delete Server Slot Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveServerSlot(idx)}
                        className="text-stone-500 hover:text-red-400 hover:bg-stone-800 p-1 rounded-md"
                        title="سڕینەوەی ئەم سێرڤەرە"
                      >
                        <MinusCircle size={16} />
                      </button>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 flex-1">
                        {/* Embed / Iframe Server URL */}
                        <div className="sm:col-span-8">
                          <input
                            type="url"
                            required
                            value={server.url}
                            onChange={(e) => handleServerChange(idx, "url", e.target.value)}
                            placeholder="بەستەری لایڤ ستریم (یوتوب ئێمبێد یان لایڤ ئایفڕێم)"
                            className="w-full text-xs rounded-lg border border-stone-800 bg-[#161619] px-2.5 py-1.5 text-stone-100 focus:outline-none"
                          />
                        </div>
                        {/* Server Name */}
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            required
                            value={server.name}
                            onChange={(e) => handleServerChange(idx, "name", e.target.value)}
                            placeholder="ناو، بۆ نموونە: Server HD"
                            className="w-full text-xs rounded-lg border border-stone-800 bg-[#161619] px-2.5 py-1.5 text-stone-100 focus:outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action buttons */}
            <div className="flex gap-3 pt-3 border-t border-stone-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 text-xs font-bold text-stone-950 hover:bg-yellow-400 active:scale-95 transition-transform disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                <span>{editingMovieId ? "هەموارکردن و پاشەکەوت" : "بڵاوکردنەوەی فیلم / زنجیرە"}</span>
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-stone-800 bg-stone-900 px-5 text-xs text-stone-400 hover:text-white"
              >
                پاککردنەوە
              </button>
            </div>
          </form>
        </div>

        {/* Right list table (Existing movie records) */}
        <div className="lg:col-span-5 bg-[#101012] border border-stone-800/80 rounded-2xl p-6 flex flex-col h-[700px]">
          <h3 className="text-stone-100 text-sm font-bold font-sans mb-4 border-b border-stone-800 pb-3 flex justify-between items-center">
            <span className="font-sans text-stone-400 font-normal">سەرجەم کەتەلۆگ ({movies.length})</span>
            <span>بەرهەمە بڵاوکراوەکان</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {movies.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-500 text-xs py-10 font-sans">
                <span>هیچ بابەتێک زیاد نەکراوە تا ئێستا.</span>
              </div>
            ) : (
              movies.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-stone-800/60 bg-[#161619] gap-3"
                >
                  {/* Edit/Delete Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(mov)}
                      className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-yellow-400 hover:border-yellow-500/20"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteMovie(mov.id)}
                      className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-500 hover:text-red-400 hover:border-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Title & Info Card element */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <h4 className="text-xs font-semibold text-stone-100 line-clamp-1 max-w-[150px] font-sans">
                        {mov.title}
                      </h4>
                      <p className="text-[10px] text-stone-500 font-sans">
                        {mov.category} • {mov.year} • {mov.rating || "بێ پلە"}
                      </p>
                    </div>
                    <img
                      src={mov.posterUrl}
                      alt=""
                      className="h-10 w-7 rounded object-cover border border-stone-800 bg-stone-900 flex-shrink-0"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
