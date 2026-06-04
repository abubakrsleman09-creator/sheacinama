import React, { useState, useEffect } from "react";
import { X, Star, Calendar, Bookmark, Eye, Play, Share2, CornerDownLeft, Volume2, Info, Lightbulb, LightbulbOff } from "lucide-react";
import { Movie, StreamServer } from "../types";

interface MovieDetailProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieDetail({ movie, onClose }: MovieDetailProps) {
  const [selectedServer, setSelectedServer] = useState<StreamServer | null>(null);
  const [lightsOff, setLightsOff] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-select the first stream server if available
  useEffect(() => {
    if (movie.servers && movie.servers.length > 0) {
      setSelectedServer(movie.servers[0]);
    } else {
      setSelectedServer(null);
    }
  }, [movie]);

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
        <div 
          onClick={() => setLightsOff(false)}
          className="fixed inset-0 z-50 bg-black/98 transition-colors duration-500 cursor-pointer"
        />
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
                <div className="flex justify-between">
                  <span className="text-stone-400 text-xs font-sans">هاوپۆل</span>
                  <span className="text-stone-100 text-xs font-sans">{movie.genre || "دیارینەکراو"}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleShareClick}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-800 bg-[#121214] py-3 text-xs font-semibold text-stone-200 transition-all hover:bg-stone-900 active:scale-95"
              >
                <Share2 size={14} className="text-yellow-400" />
                <span className="font-sans">{copied ? "کۆپی کرا!" : "ناردنی فیلم (شێر)"}</span>
              </button>

              <button
                onClick={() => setLightsOff(!lightsOff)}
                className={`flex px-4 items-center justify-center rounded-xl border py-3 text-xs font-semibold transition-all duration-200 ${
                  lightsOff
                    ? "bg-yellow-500 border-yellow-500 text-stone-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                    : "bg-[#121214] border-stone-800 text-stone-200 hover:bg-stone-900"
                }`}
                title="دۆخی سینەمایی لاینبردن"
              >
                {lightsOff ? <LightbulbOff size={16} /> : <Lightbulb size={16} />}
              </button>
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
                    title={`${movie.title} - ${selectedServer.name}`}
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

            {/* Streaming Server Selector (Dynamic and Interactive) */}
            {movie.servers && movie.servers.length > 0 && (
              <div className="rounded-2xl border border-stone-800 bg-[#0c0c0e] p-5">
                <h3 className="text-stone-300 text-xs font-bold font-sans mb-3 text-right">
                  لستى سێرڤەرەکانی پەخشکردن (سێرڤەری کارا دیاریبکە):
                </h3>
                <div className="flex flex-wrap gap-2.5 justify-start">
                  {movie.servers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setSelectedServer(server)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold font-sans transition-all active:scale-95 duration-200 ${
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

          </div>
        </div>
      </div>
    </div>
  );
}
