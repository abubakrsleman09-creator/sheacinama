import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, KeyRound, Film, Tv, Plus, Calendar, Clock, Star,
  Trash2, PlusCircle, CheckCircle2, AlertCircle, RefreshCw, Layers, Send, Check, Copy, Download
} from 'lucide-react';
import { Movie, ContentType, WatchServer, MovieRequest, PlatformStats } from '../types';

interface AdminPanelProps {
  movies: Movie[];
  onRefreshMovies: () => void;
  onClosePanel: () => void;
}

export function AdminPanel({ movies, onRefreshMovies, onClosePanel }: AdminPanelProps) {
  // Passcode Security state
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // Panel State
  const [activeTab, setActiveTab] = useState<'catalog' | 'requests' | 'stats' | 'json-code'>('catalog');
  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopyJson = () => {
    const cleanJson = JSON.stringify(movies, null, 2);
    navigator.clipboard.writeText(cleanJson)
      .then(() => {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
      })
      .catch(err => console.error("Could not copy text: ", err));
  };

  const handleDownloadJson = () => {
    const fileData = JSON.stringify(movies, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "movies.json";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Form Fields
  const [titleKurdish, setTitleKurdish] = useState('');
  const [titleEnglish, setTitleEnglish] = useState('');
  const [storyline, setStoryline] = useState('');
  const [contentType, setContentType] = useState<ContentType>('movie');
  const [category, setCategory] = useState('Action');
  const [rating, setRating] = useState('7.5');
  const [year, setYear] = useState('2026');
  const [duration, setDuration] = useState('1h 45m');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const [posterUrl, setPosterUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [servers, setServers] = useState<WatchServer[]>([
    { id: 'serv-1', name: 'FAST STREAM', url: 'https://vjs.zencdn.net/v/oceans.mp4' }
  ]);

  // Request logs states
  const [requestLogs, setRequestLogs] = useState<MovieRequest[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiAutofill = async () => {
    if (!titleEnglish.trim()) {
      alert("تکایە سەرەتا ناوی فیلمەکە بە زمانی ئینگلیزی لە خانەکەدا بنووسە، پاشان کلیک بکەرەوە");
      return;
    }

    try {
      setIsAiLoading(true);
      setFormError('');
      setFormSuccess('ژیری دەستکرد خەریکی گەڕان و وەرگێڕانە...');
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'ibos-808'
        },
        body: JSON.stringify({ title: titleEnglish })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.titleEnglish) setTitleEnglish(data.titleEnglish);
        if (data.titleKurdish) setTitleKurdish(data.titleKurdish);
        if (data.description) setStoryline(data.description);
        if (data.category) setCategory(data.category);
        if (data.rating) setRating(data.rating.toString());
        if (data.year) setYear(data.year.toString());
        if (data.duration) setDuration(data.duration);
        if (data.posterUrl) setPosterUrl(data.posterUrl);
        if (data.bannerUrl) setBannerUrl(data.bannerUrl);
        setFormSuccess("زانیارییەکان بە سەرکەوتوویی لەگەڵ وەرگێڕانی کوردی بە ژیری دەستکرد پڕکرانەوە! ✦");
      } else {
        const err = await res.json();
        setFormError(err.error || "سەرکەوتوو نەبوو لە پڕکردنەوەی ژیری دەستکرد");
        setFormSuccess('');
      }
    } catch (err) {
      console.error(err);
      setFormError("نەتوانرا پەیوەندی بە سیستمی ژیری دەستکرد بکرێت");
      setFormSuccess('');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Categories Dropdown list
  const categoriesList = ['Action', 'Drama', 'Kurdish', 'Comedy', 'Horror', 'Anime', 'Adventure', 'History', 'Sci-Fi'];

  // Handle Passcode Unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'ibos-808') {
      setIsUnlocked(true);
      setSecurityError('');
      fetchAdminData();
    } else {
      setSecurityError('کۆدی سیستم هەڵەیە! تکایە دووبارە تاقی بکەرەوە.');
    }
  };

  // Handle local file upload and conversion to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'poster' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (type === 'poster') {
        setPosterUrl(base64String);
      } else {
        setBannerUrl(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fetch admin-related data
  const fetchAdminData = async () => {
    try {
      const p1 = fetch('/api/requests').then(res => res.json());
      const p2 = fetch('/api/stats').then(res => res.json());
      const [reqs, statistics] = await Promise.all([p1, p2]);
      setRequestLogs(reqs);
      setStats(statistics);
    } catch (err) {
      console.error("Error loaded data", err);
    }
  };

  // Pre-fill form when editing
  const handleOpenEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setTitleKurdish(movie.titleKurdish);
    setTitleEnglish(movie.titleEnglish);
    setStoryline(movie.description || '');
    setContentType(movie.contentType);
    setCategory(movie.category);
    setRating(movie.rating.toString());
    setYear(movie.year.toString());
    setDuration(movie.duration);
    setIsFeatured(!!movie.isFeatured);
    setIsPinned(!!movie.isPinned);
    setPosterUrl(movie.posterUrl);
    setBannerUrl(movie.bannerUrl);
    setServers(movie.servers && movie.servers.length > 0 ? movie.servers : [
      { id: 'serv-1', name: 'FAST STREAM', url: '' }
    ]);
    setShowForm(true);
  };

  // Reset form
  const handleOpenAdd = () => {
    setEditingMovie(null);
    setTitleKurdish('');
    setTitleEnglish('');
    setStoryline('');
    setContentType('movie');
    setCategory('Action');
    setRating('7.5');
    setYear('2026');
    setDuration('1h 45m');
    setIsFeatured(false);
    setIsPinned(true);
    setPosterUrl('');
    setBannerUrl('');
    setServers([{ id: 'serv-' + Date.now(), name: 'FAST STREAM', url: 'https://vjs.zencdn.net/v/oceans.mp4' }]);
    setShowForm(true);
  };

  // Watch servers managing functions
  const addServerSlot = () => {
    setServers([
      ...servers,
      { id: 'serv-' + Date.now() + Math.random().toString(36).substr(2, 4), name: `Server ${servers.length + 1}`, url: '' }
    ]);
  };

  const removeServerSlot = (id: string) => {
    // Keep at least one server slot
    if (servers.length <= 1) return;
    setServers(servers.filter(s => s.id !== id));
  };

  const updateServerField = (id: string, field: 'name' | 'url', value: string) => {
    setServers(servers.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleDeleteMovie = async (id: string) => {
    if (!window.confirm("دڵنیای لە سڕینەوەی ئەم بابەتە؟")) return;

    try {
      const response = await fetch(`/api/movies/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': passcode || 'ibos-808' }
      });
      if (response.ok) {
        onRefreshMovies();
        fetchAdminData();
      } else {
        const d = await response.json();
        alert(d.error || "سڕینەوە سەرکەوتوو نەبوو");
      }
    } catch (err) {
      alert("کێشەیەکە هەیە");
    }
  };

  const handleTogglePin = async (movie: Movie) => {
    try {
      const response = await fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': passcode || 'ibos-808'
        },
        body: JSON.stringify({ isPinned: !movie.isPinned })
      });
      if (response.ok) {
        onRefreshMovies();
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestStatus = async (id: string, newStatus: 'pending' | 'completed') => {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': passcode || 'ibos-808'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': passcode || 'ibos-808' }
      });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Form submit (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!titleKurdish.trim() || !titleEnglish.trim()) {
      setFormError('تکایە ناونیشانی فیلم بنووسە بە هەر دوو زمان');
      return;
    }

    // Checking of empty servers
    const emptyServer = servers.find(s => !s.name.trim() || !s.url.trim());
    if (emptyServer) {
       setFormError('تکایە دڵنیابەرەوە کە هیچ سێرڤەرێکی هێڵ بە بەتاڵی جێنەماوە یان سڕیبێتەوە.');
       return;
    }

    setIsSubmitting(true);

    const payload = {
      titleKurdish: titleKurdish.trim(),
      titleEnglish: titleEnglish.trim(),
      description: storyline.trim(),
      contentType,
      category,
      rating: parseFloat(rating) || 7.0,
      year: parseInt(year) || new Date().getFullYear(),
      duration: duration.trim() || '1h 45m',
      isFeatured,
      isPinned,
      posterUrl: posterUrl.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600',
      bannerUrl: bannerUrl.trim() || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200',
      servers
    };

    const targetUrl = editingMovie ? `/api/movies/${editingMovie.id}` : '/api/movies';
    const method = editingMovie ? 'PUT' : 'POST';

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': passcode || 'ibos-808'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const er = await response.json();
        throw new Error(er.error || "کێشەیەک ڕوویدا لە متمانەدان");
      }

      setFormSuccess(editingMovie ? 'فیلمەکە بە سەرکەوتوویی هەموار کرایەوە!' : 'فیلمی نوێ زیادکرا بە سەرکەوتوویی!');
      onRefreshMovies();
      fetchAdminData();

      setTimeout(() => {
        setShowForm(false);
        setEditingMovie(null);
        setFormSuccess('');
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || 'پاشەکەوتکردن شکستی هێنا');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4 md:px-8 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* Lock screen Gate */
          <motion.div
            key="lock"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto bg-[#141414] border border-[#222222] rounded-3xl p-8 shadow-2xl text-center mt-12 rtl-dir"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#FFC80A]/10 border border-[#FFC80A]/30 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-[#FFC80A]" />
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">بەڕێوەبەری سیستەم</h2>
            <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
              تکایە کۆدی ئەمنییەت بنووسە بۆ هاتنە ناوەوە و دەستکاریکردنی فیلمەکان
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              {securityError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                  {securityError}
                </div>
              )}

              <div>
                <input
                  type="password"
                  required
                  placeholder="کۆدی پاس داخل بکە"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-center text-sm px-4 py-3 rounded-xl tracking-widest placeholder:tracking-normal"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClosePanel}
                  className="w-1/2 bg-[#1c1c1c] hover:bg-[#252525] text-gray-300 font-semibold text-xs py-3 rounded-xl transition"
                >
                  گەڕانەوە دواوە
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#FFC80A] hover:bg-[#E2B200] text-black font-extrabold text-xs py-3 rounded-xl transition shadow-lg shadow-[#FFC80A]/10"
                >
                  چوونە ژوورەوە
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Unlocked Full Workspace Panel */
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Header section (Matches Image 2 Navbar setup) */}
            <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 rtl-dir">
              
              <div className="text-right">
                <span className="text-xs text-[#FFC80A] font-bold tracking-widest uppercase mb-1 block">SHEA CINEMA ADMIN SYSTEM</span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">سیستەمی بەڕێوبەرایەتی</h1>
                <p className="text-xs text-gray-400 mt-1">بەڕێوەبردنی فیلمەکان، زنجیرەکان، داواکارییەکانی بەکارهێنەران و شیکاری و سەرچاوەکان.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenAdd}
                  className="bg-[#FFC80A] hover:bg-[#E2B200] text-black font-extrabold text-xs md:text-sm px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-[#FFC80A]/10"
                >
                  <Plus className="w-4 h-4 text-black stroke-3" />
                  <span>زیادکردنی فیلمی نوێ</span>
                </button>
                
                <button
                  onClick={onClosePanel}
                  className="bg-[#1c1c1c] hover:bg-[#252525] border border-[#222222] text-white font-semibold text-xs md:text-sm px-5 py-3 rounded-2xl transition"
                >
                  داخستن
                </button>
              </div>
            </div>

            {/* Dashboard Tabs bar */}
            <div className="flex border-b border-[#222222] gap-1 overflow-x-auto no-scrollbar pb-px rtl-dir">
              <button
                onClick={() => { setActiveTab('catalog'); setShowForm(false); }}
                className={`py-3.5 px-6 font-bold text-xs md:text-sm transition-all relative ${
                  activeTab === 'catalog' && !showForm
                    ? 'text-[#FFC80A]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                فیلم و زنجیرە پۆستکراوەکان ({movies.length})
                {activeTab === 'catalog' && !showForm && (
                  <motion.div layoutId="admTab" className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#FFC80A]" />
                )}
              </button>

              <button
                onClick={() => { setActiveTab('requests'); setShowForm(false); }}
                className={`py-3.5 px-6 font-bold text-xs md:text-sm transition-all relative ${
                  activeTab === 'requests' && !showForm
                    ? 'text-[#FFC80A]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                داواکارییەکانی خەڵک ({requestLogs.length})
                {activeTab === 'requests' && !showForm && (
                  <motion.div layoutId="admTab" className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#FFC80A]" />
                )}
              </button>

              <button
                onClick={() => { setActiveTab('stats'); setShowForm(false); }}
                className={`py-3.5 px-6 font-bold text-xs md:text-sm transition-all relative ${
                  activeTab === 'stats' && !showForm
                    ? 'text-[#FFC80A]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                شیکاری و ئامارەکان
                {activeTab === 'stats' && !showForm && (
                  <motion.div layoutId="admTab" className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#FFC80A]" />
                )}
              </button>

              <button
                onClick={() => { setActiveTab('json-code'); setShowForm(false); }}
                className={`py-3.5 px-6 font-bold text-xs md:text-sm transition-all relative ${
                  activeTab === 'json-code' && !showForm
                    ? 'text-[#FFC80A]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                کۆپیکردنی کۆدی JSON (سەیڤی ئەبەدی) 💾
                {activeTab === 'json-code' && !showForm && (
                  <motion.div layoutId="admTab" className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#FFC80A]" />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showForm ? (
                /* ADD / EDIT MOVIE FORM : (Matches Image 3 precisely) */
                <motion.div
                  key="movie-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[#141414] border border-[#222222] rounded-3xl p-6 md:p-8 rtl-dir text-right space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-[#222222] pb-4">
                    <button
                      onClick={() => { setShowForm(false); setEditingMovie(null); }}
                      className="text-xs text-gray-400 hover:text-white bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#222222]"
                    >
                      پاشگەزبوونەوە
                    </button>
                    <h3 className="text-lg font-extrabold text-[#FFC80A]">
                      {editingMovie ? `هەموارکردنی: ${editingMovie.titleKurdish}` : 'زیادکردنی فیلمی نوێ'}
                    </h3>
                  </div>

                  {formError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl text-center">
                      {formError}
                    </div>
                  )}
                  {formSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-4 rounded-xl text-center">
                      {formSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSubmitForm} className="space-y-6">
                    {/* Columns Wrapper */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column (Metadata) */}
                      <div className="space-y-4">
                        {/* Title Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs text-gray-400 font-semibold">
                                ناوی فیلم (بە ئینگلیزی) *
                              </label>
                              <button
                                type="button"
                                onClick={handleAiAutofill}
                                disabled={isAiLoading}
                                className="text-[10px] text-[#FFC80A] bg-[#FFC80A]/10 border border-[#FFC80A]/30 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-[#FFC80A]/20 transition-all font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {isAiLoading ? (
                                  <>
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#FFC80A]" />
                                    <span>خەریکی گەڕانە...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>پڕکردنەوە بە AI ✦</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Inception"
                              value={titleEnglish}
                              onChange={(e) => setTitleEnglish(e.target.value)}
                              className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl ltr-dir"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-2 font-semibold">
                              ناوی فیلم (بە کوردی) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="بۆ نموونە: دەستپێک"
                              value={titleKurdish}
                              onChange={(e) => setTitleKurdish(e.target.value)}
                              className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Storyline Textarea */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 font-semibold font-sans">
                            چیرۆک و کورتەی فیلم
                          </label>
                          <textarea
                            rows={3}
                            placeholder="چیرۆکی فیلمەکە لێرە بنووسە..."
                            value={storyline}
                            onChange={(e) => setStoryline(e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs p-4 rounded-xl leading-relaxed"
                          />
                        </div>

                        {/* Content Type Selector */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 font-semibold">
                            جۆری ناوەڕۆک (Content Type)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setContentType('movie')}
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all ${
                                contentType === 'movie'
                                  ? 'bg-[#FFC80A] text-black border-[#FFC80A]'
                                  : 'bg-[#1c1c1c] text-gray-300 border-[#222222]'
                              }`}
                            >
                              <Film className="w-4 h-4" />
                              فیلم (Movie)
                            </button>
                            <button
                              type="button"
                              onClick={() => setContentType('series')}
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold transition-all ${
                                contentType === 'series'
                                  ? 'bg-[#FFC80A] text-black border-[#FFC80A]'
                                  : 'bg-[#1c1c1c] text-gray-300 border-[#222222]'
                              }`}
                            >
                              <Tv className="w-4 h-4" />
                              زنجیرە (Series)
                            </button>
                          </div>
                        </div>

                        {/* Category Selector */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 font-semibold">
                            جۆر (Category)
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl appearance-none"
                          >
                            {categoriesList.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Attributes (Rating, Year, Duration) */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-2 font-semibold">
                              ماوە
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 2h 15m"
                              value={duration}
                              onChange={(e) => setDuration(e.target.value)}
                              className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl text-center ltr-dir"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-2 font-semibold">
                              ساڵ
                            </label>
                            <input
                              type="number"
                              placeholder="2026"
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl text-center ltr-dir"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-2 font-semibold">
                              نمرە
                            </label>
                            <input
                              type="text"
                              placeholder="8.5"
                              value={rating}
                              onChange={(e) => setRating(e.target.value)}
                              className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-3 rounded-xl text-center ltr-dir"
                            />
                          </div>
                        </div>

                        {/* Checkboxes parameters */}
                        <div className="flex flex-col gap-2.5 pt-4 border-t border-[#1a1a1a]">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isFeatured}
                              onChange={(e) => setIsFeatured(e.target.checked)}
                              className="rounded border-[#222222] bg-[#1c1c1c] text-[#FFC80A] focus:ring-0 focus:ring-offset-0 w-4 h-4"
                            />
                            <span className="text-xs text-gray-300">دانان وەک فیلمی سەرەکی (لە بەشی سەرەوەی سایتەکە)</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isPinned}
                              onChange={(e) => setIsPinned(e.target.checked)}
                              className="rounded border-[#222222] bg-[#1c1c1c] text-[#FFC80A] focus:ring-0 focus:ring-offset-0 w-4 h-4"
                            />
                            <span className="text-xs text-gray-300">نیشاندانی تاگی تایبەت (Featured Tag) لەسەر کارتی فیلم</span>
                          </label>
                        </div>
                      </div>

                      {/* Right Column (Images/Media & Watch Servers lists) */}
                      <div className="space-y-6">
                        
                        {/* Image Media Upload triggers (Simulating Drag Drop / Link inputs from Image 3) */}
                        <div className="bg-[#1a1a1a]/40 border border-[#222222] rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-gray-300 pb-2 border-b border-[#222222]">وێنە و میدیا</h4>
                          
                          {/* Portrait Poster Input */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">
                              پۆستەری درێژ (PORTRAIT URL) / بارکردنی فایل
                            </label>
                            <div className="flex gap-3 items-start mt-1.5">
                              <div className="flex-grow">
                                <input
                                  type="text"
                                  placeholder="https://example.com/poster.jpg"
                                  value={posterUrl}
                                  onChange={(e) => setPosterUrl(e.target.value)}
                                  className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-2.5 rounded-xl ltr-dir"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'poster')}
                                    className="hidden"
                                    id="poster-file-input"
                                  />
                                  <label
                                    htmlFor="poster-file-input"
                                    className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all text-center"
                                  >
                                    زیادکردنی فایل 📁
                                  </label>
                                  {posterUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setPosterUrl('')}
                                      className="text-red-400 hover:text-red-500 text-[11px]"
                                    >
                                      پاککردنەوە
                                    </button>
                                  )}
                                </div>
                              </div>
                              {posterUrl && (
                                <img
                                  src={posterUrl}
                                  alt="Poster Preview"
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-16 rounded object-cover border border-white/10 bg-black/50 shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">وێنەیەکی گونجاو دابنێ بۆ نیشاندانی سەرەکی کارتەکان یان فایلەکەی باربکە.</p>
                          </div>

                          {/* Landscape Banner Input */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">
                              وێنەی پان (LANDSCAPE BANNER URL) / بارکردنی فایل
                            </label>
                            <div className="flex gap-3 items-start mt-1.5">
                              <div className="flex-grow">
                                <input
                                  type="text"
                                  placeholder="https://example.com/banner.jpg"
                                  value={bannerUrl}
                                  onChange={(e) => setBannerUrl(e.target.value)}
                                  className="w-full bg-[#1c1c1c] border border-[#222222] focus:border-[#FFC80A] focus:outline-none text-white text-xs px-4 py-2.5 rounded-xl ltr-dir"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'banner')}
                                    className="hidden"
                                    id="banner-file-input"
                                  />
                                  <label
                                    htmlFor="banner-file-input"
                                    className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all text-center"
                                  >
                                    زیادکردنی فایل 📁
                                  </label>
                                  {bannerUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setBannerUrl('')}
                                      className="text-red-400 hover:text-red-500 text-[11px]"
                                    >
                                      پاککردنەوە
                                    </button>
                                  )}
                                </div>
                              </div>
                              {bannerUrl && (
                                <img
                                  src={bannerUrl}
                                  alt="Banner Preview"
                                  referrerPolicy="no-referrer"
                                  className="w-20 h-12 rounded object-cover border border-white/10 bg-black/50 shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">وێنەیەکی پان بۆ پشتخانەی بانەری سەرەوە لێرە پاشەکەوت بێت.</p>
                          </div>
                        </div>

                        {/* Stream Servers Dynamic Lists (Perfect execution fit for "سێرڤەر دابنێی و زیاد بکەی و کەم بکەی") */}
                        <div className="bg-[#1a1a1a]/40 border border-[#222222] rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                            <button
                              type="button"
                              onClick={addServerSlot}
                              className="text-xs text-[#FFC80A] hover:text-white flex items-center gap-1 hover:bg-[#FFC80A]/10 px-2 py-1 rounded transition"
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span>زیادکردنی سێرڤەر</span>
                            </button>
                            <h4 className="text-xs font-bold text-gray-300">سێرڤەرەکانی سەیرکردن / پەخش</h4>
                          </div>

                          {servers.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">مادام سێرڤەر نەبێت بینەر ناتوانێ سەیر بکات.</p>
                          ) : (
                            <div className="space-y-3 max-h-56 overflow-y-auto pl-1">
                              {servers.map((serv, index) => (
                                <div key={serv.id} className="bg-black/40 border border-[#222222] rounded-xl p-3 flex flex-col gap-2 relative">
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => removeServerSlot(serv.id)}
                                      className="text-red-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] text-gray-500 font-bold">سێرڤەری مۆدێرن {index + 1}</span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      required
                                      placeholder="ناوی سێرڤەر (e.g. VIP VIP)"
                                      value={serv.name}
                                      onChange={(e) => updateServerField(serv.id, 'name', e.target.value)}
                                      className="col-span-1 bg-[#1c1c1c] border border-[#222222] text-white text-xs px-2.5 py-1.5 rounded-lg text-center"
                                    />
                                    <input
                                      type="text"
                                      required
                                      placeholder="لینکی ڕاستەوخۆ یان لێدانی فایلی لێکۆڵینەوە"
                                      value={serv.url}
                                      onChange={(e) => updateServerField(serv.id, 'url', e.target.value)}
                                      className="col-span-2 bg-[#1c1c1c] border border-[#222222] text-white text-xs px-2.5 py-1.5 rounded-lg ltr-dir"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Form Submission Actions footer */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-[#222222]">
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setEditingMovie(null); }}
                        className="bg-[#202020] hover:bg-[#2A2A2A] text-gray-300 font-semibold text-xs px-5 py-3 rounded-xl transition"
                      >
                        پاشگەزبوونەوە
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#FFC80A] hover:bg-[#E2B200] text-black font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#FFC80A]/10 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-black stroke-3" />
                        {isSubmitting ? 'پاشەکەوت دەکرێت...' : (editingMovie ? 'نوێکردنەوەی گۆڕانکارییەکان' : 'پۆستی فیلم بکە')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : activeTab === 'catalog' ? (
                /* MOVIE CATALOG MANAGEMENT TREE LISTING */
                <motion.div
                  key="catalog-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">تەواوی فیلمەکان ({movies.length} دۆزراوەتەوە)</span>
                    <h3 className="text-sm font-bold text-gray-300">تەواوی بڵاوکراوەکان</h3>
                  </div>

                  <div className="bg-[#141414] border border-[#222222] rounded-3xl overflow-hidden shadow-xl table-auto w-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right rtl-dir text-sm">
                        <thead>
                          <tr className="bg-black/30 border-b border-[#222222] text-gray-400 text-xs font-bold font-sans">
                            <th className="px-5 py-4 w-20 text-center">کردارەکان</th>
                            <th className="px-5 py-4">سێرڤەرەکان</th>
                            <th className="px-5 py-4">جۆرەکان</th>
                            <th className="px-5 py-4">تایبەتمەند</th>
                            <th className="px-5 py-4 text-left font-mono">English Name</th>
                            <th className="px-5 py-4">ناوی بابەت (کوردیش)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222222]/80">
                          {movies.map((m) => (
                            <tr key={m.id} className="hover:bg-[#1A1A1A]/50 transition-colors">
                              {/* Edit & Delete actions buttons */}
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleDeleteMovie(m.id)}
                                    className="p-1 px-2.5 rounded bg-red-600/15 text-red-400 hover:bg-red-600 text-white text-xs transition"
                                  >
                                    سڕینەوە
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(m)}
                                    className="p-1 px-2.5 rounded bg-[#2A2A2A] text-gray-200 hover:bg-[#3A3A3A] hover:text-white text-xs transition"
                                  >
                                    دەستکاری
                                  </button>
                                </div>
                              </td>

                              {/* Watch Servers info */}
                              <td className="px-5 py-3 text-gray-400 text-xs text-center font-mono font-bold">
                                {m.servers?.length || 0} Server
                              </td>

                              {/* Production Type badge */}
                              <td className="px-5 py-3 text-xs font-medium">
                                <span className={`px-2.5 py-1 rounded-full ${
                                  m.contentType === 'series' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-green-500/10 text-green-400'
                                }`}>
                                  {m.contentType === 'series' ? 'زنجیرە' : 'فیلم'}
                                </span>
                              </td>

                              {/* Pin star */}
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => handleTogglePin(m)}
                                  className={`p-1.5 rounded-full transition ${m.isPinned ? 'text-[#FFC80A]' : 'text-gray-600'}`}
                                >
                                  <Star className={`w-4 h-4 ${m.isPinned ? 'fill-[#FFC80A]' : ''}`} />
                                </button>
                              </td>

                              {/* English Title on left column */}
                              <td className="px-5 py-3 text-left font-mono text-xs font-semibold text-gray-300">
                                {m.titleEnglish}
                              </td>

                              {/* Kurdish Title on Right column */}
                              <td className="px-5 py-3 font-bold text-white flex items-center gap-3">
                                <img
                                  src={m.posterUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-12 rounded object-cover"
                                />
                                <div className="flex flex-col text-right">
                                  <span>{m.titleKurdish}</span>
                                  <span className="text-[10px] text-[#FFC80A] font-bold">{m.category} • {m.year}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'json-code' ? (
                /* RAW JSON CODE COPY AND FILE DOWNLOAD PANEL */
                <motion.div
                  key="json-code-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-right rtl-dir"
                >
                  <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 md:p-8 space-y-4">
                    <h3 className="text-xl font-extrabold text-[#FFC80A]">پاراستنی فیلمەکان بۆ هەمیشە وەک کۆد 💾</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      هەرکاتێک فیلمێکی نوێ زیاد دەکەیت یان دەستکاری سێرڤەر و ناونیشانێک دەکەیت، گۆڕانکارییەکان دەستبەجێ لە سێرڤەرەکەت تۆمار دەبێت و سەیڤ دەبێت. بەڵام بۆ ئەوەی دڵنیابیت کە فیلمەکانت 
                      <strong> بۆ هەمیشە بە جێگیری دەپارێزرێن</strong> و بە هیچ جۆرە ڕیستبوونێکی کاتی پرۆژەکە لەسەر ئەنتەرنێت ناسڕێنەوە، دەتوانیت بە دوگمەی خوارەوە سەرجەم کۆدی فیلمە نوێیەکانت بە یەک کلیک کۆپی بکەیت و بیخەیتە نێو کۆدی پڕۆژەکەتەوە.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={handleCopyJson}
                        className="bg-[#FFC80A] hover:bg-[#E2B200] text-black font-extrabold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#FFC80A]/10 cursor-pointer"
                      >
                        {hasCopied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-black stroke-3" />
                            <span>کۆپی کرا! ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-black" />
                            <span>کۆپی کردنی تەواوی کۆدەکە (Copy JSON)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadJson}
                        className="bg-[#1c1c1c] hover:bg-[#252525] border border-[#222222] text-white font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-gray-300" />
                        <span>دابەزاندنی فایلی movies.json</span>
                      </button>
                    </div>

                    <div className="bg-[#FFC80A]/10 border border-[#FFC80A]/30 p-4 rounded-2xl text-xs text-[#FFC80A] leading-relaxed font-semibold">
                      💡 ڕێنمایی جێگیرکردنی کۆد لەناو فایلی سەرەکی:
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-300 font-normal">
                        <li>لێرە کلیک لەسەر دوگمەی زەردی <strong>(کۆپی کردنی تەواوی کۆدەکە)</strong> بکە.</li>
                        <li>پاشان لە بەڕێوبەری کۆی فۆڵدەرەکانی سەرەوە، فایلی <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">/movies.json</code> بکەرەوە.</li>
                        <li>هەموو کۆدە کۆنەکانی ناو فایلی movies.json بسڕەوە و ئەم کۆدە نوێیەی تێدا بەپێست بکە (Paste) و پاشەکەوتی بکە. بەم شێوەیە پۆستەکانت بۆ هەمیشە وەک بەشێکی بنەڕەتی لەگەڵ پاڵەکەتەکانت جێگیر دەبن!</li>
                      </ol>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-xs text-gray-400 font-bold text-right mb-1">پیشاندانی کۆدی کەتەلۆگ بۆ کۆپیکردنی دەستی:</label>
                      <pre className="bg-black/50 border border-[#222222] rounded-2xl p-4 text-[10px] font-mono text-amber-100/90 overflow-x-auto max-h-96 text-left ltr-dir">
                        {JSON.stringify(movies, null, 2)}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'requests' ? (
                /* USER MOVIE REQUESTS LISTING LOGS */
                <motion.div
                  key="requests-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">داواکارییە نوێیەکانی سەردانکەران لێرە دەردەکەون</span>
                    <h3 className="text-sm font-bold text-gray-300">لیستی داواکارییەکان</h3>
                  </div>

                  {requestLogs.length === 0 ? (
                    <div className="bg-[#141414] border border-[#222222] rounded-3xl p-12 text-center text-gray-500 text-xs">
                      هیچ داواکارییەکی فیلم لەم قۆناغەدا نەنێردراوە.
                    </div>
                  ) : (
                    <div className="bg-[#141414] border border-[#222222] rounded-3xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right rtl-dir text-sm">
                          <thead>
                            <tr className="bg-black/30 border-b border-[#222222] text-gray-400 text-xs font-bold">
                              <th className="px-5 py-4 w-28 text-center">سڕینەوە</th>
                              <th className="px-5 py-4 w-32 text-center">بارودۆخ</th>
                              <th className="px-5 py-4 text-center">بەرواری ناردن</th>
                              <th className="px-5 py-4">ناوی داخوازیکەر</th>
                              <th className="px-5 py-4">جۆری ناوەڕۆک</th>
                              <th className="px-5 py-4">بابەتی داواکراو</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#222222]">
                            {requestLogs.map((req) => (
                              <tr key={req.id} className="hover:bg-[#1A1A1A]/30 transition-colors">
                                {/* Delete action */}
                                <td className="px-5 py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRequest(req.id)}
                                    className="text-red-400 hover:text-red-500 p-1 bg-red-500/10 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>

                                {/* Status button toggle */}
                                <td className="px-5 py-3 text-center text-xs">
                                  {req.status === 'completed' ? (
                                    <button
                                      onClick={() => handleRequestStatus(req.id, 'pending')}
                                      className="bg-green-600/15 text-green-400 border border-green-500/20 px-2.5 py-1 rounded font-bold"
                                    >
                                      داکۆکیکراو / تەواوبوو
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRequestStatus(req.id, 'completed')}
                                      className="bg-amber-600/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded font-bold hover:bg-amber-500 hover:text-black transition"
                                    >
                                      ئامادەکردن ⏳
                                    </button>
                                  )}
                                </td>

                                {/* Date */}
                                <td className="px-5 py-3 text-center font-mono text-xs text-gray-400">
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </td>

                                {/* Requester Name */}
                                <td className="px-5 py-3 font-semibold text-gray-300">
                                  {req.requesterName}
                                </td>

                                {/* Type */}
                                <td className="px-5 py-3 text-xs">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    req.contentType === 'series' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-green-500/10 text-green-400'
                                  }`}>
                                    {req.contentType === 'series' ? 'زنجیرە' : 'فیلم'}
                                  </span>
                                </td>

                                {/* Movie title Requested */}
                                <td className="px-5 py-3 font-extrabold text-white">
                                  {req.movieTitle}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* PLATFORM STATS GRID */
                <motion.div
                  key="platform-stats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                  {/* Total Movies Card */}
                  <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 text-right rtl-dir flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <Film className="w-5 h-5 text-[#FFC80A]" />
                      <span className="text-xs text-gray-400 font-bold">فیلمەکان</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-extrabold text-white font-mono">{stats?.totalMovies || 0}</h4>
                      <p className="text-slate-500 text-[10px] mt-1">فیلمی پۆستکراوی تەواو لە سەرانسەری ماڵپەڕ.</p>
                    </div>
                  </div>

                  {/* Total Series Card */}
                  <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 text-right rtl-dir flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <Tv className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs text-gray-400 font-bold">زنجیرەکان</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-extrabold text-white font-mono">{stats?.totalSeries || 0}</h4>
                      <p className="text-slate-500 text-[10px] mt-1">تەواوی مۆڵەتی زنجیرەکان کە لە سیستم کراون.</p>
                    </div>
                  </div>

                  {/* Movie Requests Card */}
                  <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 text-right rtl-dir flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <Send className="w-5 h-5 text-amber-500" />
                      <span className="text-xs text-gray-400 font-bold">داواکاری ماوە</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-extrabold text-white font-mono">{stats?.totalRequests || 0}</h4>
                      <p className="text-slate-500 text-[10px] mt-1">ڕێژەی گشتی بابەتانەی خەڵک کە چاوەڕوانی پۆستن.</p>
                    </div>
                  </div>

                  {/* Total Stream Links Card */}
                  <div className="bg-[#141414] border border-[#222222] rounded-3xl p-6 text-right rtl-dir flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <RefreshCw className="w-5 h-5 text-green-400 animate-spin-slow" />
                      <span className="text-xs text-gray-400 font-bold">لینک و سێرڤەرەکان</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-extrabold text-white font-mono">{stats?.totalServersCount || 0}</h4>
                      <p className="text-slate-500 text-[10px] mt-1">سەرجەم لینکەکانی داواکاری کە بۆ بینەران فەراهەمە.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
