import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, HardDrive, Calendar, Clock, Star, Share2, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { Movie, WatchServer } from '../types';

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MovieDetailModal({ movie, isOpen, onClose }: MovieDetailModalProps) {
  const [activeServer, setActiveServer] = useState<WatchServer | null>(null);
  const [copied, setCopied] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  useEffect(() => {
    if (movie && movie.servers && movie.servers.length > 0) {
      setActiveServer(movie.servers[0]);
    } else {
      setActiveServer(null);
    }
    setPlayerError(false);
    setCopied(false);
  }, [movie]);

  if (!movie) return null;

  const handleShare = () => {
    const url = `${window.location.origin}/?movie=${movie.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract video ID if YouTube to enable full responsive parameters
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
          />

          {/* Large Cinema Modal Panel */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-5xl h-full md:h-auto max-h-[100vh] md:max-h-[92vh] bg-[#0f0f0f] border-0 md:border border-white/10 rounded-none md:rounded-2xl overflow-y-auto no-scrollbar shadow-2xl z-20 flex flex-col"
          >
            {/* Header Toolbar */}
            <div className="sticky top-0 z-30 bg-[#0f0f0f]/85 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between rtl-dir shrink-0">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-right">
                <h2 className="text-lg md:text-xl font-extrabold text-white">{movie.titleKurdish}</h2>
                <p className="text-xs text-gray-500 font-mono tracking-wide">{movie.titleEnglish} ({movie.year})</p>
              </div>
            </div>

            {/* Video Player Display Area */}
            <div className="relative aspect-video w-full min-h-[210px] md:min-h-0 bg-black flex flex-col items-center justify-center text-center overflow-hidden border-b border-[#1A1A1A] shrink-0">
              {activeServer ? (
                <iframe
                  title="Watch Player"
                  src={getEmbedUrl(activeServer.url)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  onError={() => setPlayerError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <AlertTriangle className="w-12 h-12 text-[#FFC80A] mb-3" />
                  <p className="text-sm text-gray-300 font-bold mb-2">هیچ سێرڤەرێکی سەیرکردن زیاد نەکراوە</p>
                  <p className="text-xs text-gray-500 max-w-xs">تکایە لەڕێگەی پانێڵی بەڕێوەبەر سێرڤەر زیاد بکە بۆ ئەم فیلمە.</p>
                </div>
              )}
            </div>

            {/* Main Information Blocks */}
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 rtl-dir text-right">
              
              {/* Left 2 Columns: Movie Information */}
              <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
                
                {/* Meta Attributes Row */}
                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm">
                  <span className="flex items-center gap-1.5 text-[#FFC80A] bg-[#FFC80A]/10 px-3 py-1.5 rounded-full font-bold">
                    <Star className="w-4 h-4 fill-[#FFC80A]" />
                    {movie.rating.toFixed(1)} / ١٠
                  </span>
                  
                  <span className="flex items-center gap-1.5 text-gray-300 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {movie.year}
                  </span>

                  <span className="flex items-center gap-1.5 text-gray-300 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {movie.duration}
                  </span>

                  <span className="text-[#FFC80A] bg-amber-500/10 border border-[#FFC80A]/20 px-3 py-1.5 rounded-full font-bold">
                    {movie.category === 'Kurdish' ? 'بەرهەمی کوردی' : movie.category}
                  </span>

                  <span className="text-xs text-gray-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full uppercase col-span-1">
                    {movie.contentType === 'movie' ? 'فیلم (Movie)' : 'زنجیرە (Series)'}
                  </span>
                </div>

                {/* Plot / Storyline */}
                <div>
                  <h3 className="text-base font-bold text-white mb-2 ml-1">کورتە و چیرۆکی فیلم</h3>
                  <p className="text-sm text-gray-300 leading-relaxed max-w-2xl bg-white/5 p-4 rounded-xl border border-white/5">
                    {movie.description || "هیچ کورتەیەکی درێژ بۆ ئەم ناوەڕۆکە نییە، بەڵام یەکێکە لە بابەتە ناوازە خۆشەکان کە شایەنی سەیرکردنە!"}
                  </p>
                </div>

                {/* Additional Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                    {copied ? 'کۆپی کرا!' : 'هاوبەشکردنی لینک (Share)'}
                  </button>

                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>سەیرکردنی بێ کێشە و خێرا</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Server Switcher Menu */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 space-y-4 order-1 lg:order-2">
                <h3 className="text-sm font-bold text-white flex items-center justify-between ml-1 pb-2 border-b border-white/10">
                  <span>لیستی سێرڤەرەکانی دابینکەر</span>
                  <HardDrive className="w-4 h-4 text-[#FFC80A]" />
                </h3>

                {movie.servers && movie.servers.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {movie.servers.map((serv, index) => (
                      <button
                        key={serv.id || index}
                        onClick={() => setActiveServer(serv)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                          activeServer?.id === serv.id
                            ? 'bg-[#FFC80A] text-black border-[#FFC80A]'
                            : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 ${activeServer?.id === serv.id ? 'fill-black' : 'text-gray-400'}`} />
                        <span>سێرڤەری ({index + 1}) - {serv.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">چاوەڕوانی ئەدمین بە تا سێرڤەر دابنێت...</p>
                )}

                <div className="text-[10px] text-gray-500 bg-[#0f0f0f] p-3 rounded-lg leading-relaxed text-right border border-white/10">
                  ⚠️ کاتێ زانیت فیلمەکە بە دروستی کار ناکات، تکایە سێرڤەرێکی تر لە سێرڤەرەکانی سەرەوە تاقی بکەرەوە.
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
