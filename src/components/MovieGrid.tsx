import { motion } from 'motion/react';
import { Star, Clock, Trash2, Edit, Award, Film } from 'lucide-react';
import { Movie } from '../types';

interface MovieGridProps {
  movies: Movie[];
  isAdmin: boolean;
  onSelectMovie: (movie: Movie) => void;
  onEditMovie: (movie: Movie) => void;
  onDeleteMovie: (id: string) => void;
  onTogglePinMovie: (movie: Movie) => void;
}

export function MovieGrid({
  movies,
  isAdmin,
  onSelectMovie,
  onEditMovie,
  onDeleteMovie,
  onTogglePinMovie
}: MovieGridProps) {

  if (!movies || movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#222222] flex items-center justify-center text-gray-500 mb-4 animate-pulse">
          🍿
        </div>
        <p className="text-sm text-gray-400 font-medium">هیچ بابەتێک نەدۆزرایەوە</p>
        <p className="text-xs text-gray-600 mt-1">تکایە بگەڕێ بە ناوێکی تردا یان دووبارە تاقی بکەرەوە.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2 md:px-0">
      {movies.map((movie) => (
        <motion.div
          key={movie.id}
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="group relative bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
        >
          {/* Post Image Container */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0f0f0f] cursor-pointer" onClick={() => onSelectMovie(movie)}>
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.titleKurdish}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1c1c1c] via-[#0f0f0f] to-black text-center relative pointer-events-none">
                <Film className="w-10 h-10 text-yellow-500/20 mb-3" />
                <span className="font-bold text-xs text-yellow-500/80 px-1 leading-snug line-clamp-3">{movie.titleKurdish}</span>
                <span className="text-[9px] text-gray-500 mt-1 truncate max-w-full px-2">{movie.titleEnglish}</span>
                <span className="absolute bottom-2 text-[8px] text-gray-700 select-none">SHEA CINEMA</span>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-black/30 pointer-events-none" />

            {/* Left Top Badge: Pin/Featured */}
            {movie.isPinned && (
              <span className="absolute top-2 left-2 bg-[#FFC80A] text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-black" />
                تایبەت
              </span>
            )}

            {/* Right Top Badge: Category */}
            <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-[#FFC80A] text-[9px] px-1.5 py-0.5 rounded font-bold max-w-[80px] truncate">
              {movie.category === 'Kurdish' ? 'Kurdish' : movie.category}
            </span>

            {/* Hover Play Button Trigger */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="w-10 h-10 rounded-full bg-[#FFC80A]/95 text-black flex items-center justify-center shadow-lg shadow-[#FFC80A]/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                <Award className="w-5 h-5 stroke-2" />
              </span>
            </div>

            {/* Admin Controls Floating Toolbar (When Admin logged in) */}
            {isAdmin && (
              <div 
                className="absolute bottom-2 right-2 left-2 flex items-center gap-1.5 z-10"
                onClick={(e) => e.stopPropagation()} // Stop modal from triggering
              >
                {/* Delete button (red) */}
                <button
                  onClick={() => onDeleteMovie(movie.id)}
                  aria-label="Delete movie"
                  className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition-all hover:scale-110 cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Edit button (gray) */}
                <button
                  onClick={() => onEditMovie(movie)}
                  aria-label="Edit movie"
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 shadow transition-all hover:scale-110 cursor-pointer text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {/* Pin toggle button (star) */}
                <button
                  onClick={() => onTogglePinMovie(movie)}
                  aria-label="Toggle pin"
                  className={`w-7 h-7 rounded-full flex items-center justify-center border border-white/10 shadow transition-all hover:scale-110 cursor-pointer text-xs ${
                    movie.isPinned 
                      ? "bg-[#FFC80A] text-black border-none hover:bg-[#E2B200]" 
                      : "bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]"
                  }`}
                >
                  <Star className={`w-3 h-3 ${movie.isPinned ? "fill-black" : ""}`} />
                </button>
              </div>
            )}
          </div>

          {/* Details Bar (Kurdish text right aligned) */}
          <div className="p-3 flex flex-col justify-between flex-grow text-right rtl-dir cursor-pointer" onClick={() => onSelectMovie(movie)}>
            <div>
              <h3 className="text-xs md:text-sm font-black text-white group-hover:text-[#FFC80A] transition-colors truncate">
                {movie.titleKurdish}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono tracking-wide truncate">
                {movie.titleEnglish}
              </p>
            </div>

            {/* Footer Attributes info */}
            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                {movie.duration} • {movie.year}
              </span>
              <span className="flex items-center gap-1 font-bold text-gray-300">
                {movie.rating.toFixed(1)}
                <Star className="w-3 h-3 text-[#FFC80A] fill-[#FFC80A]" />
              </span>
            </div>
          </div>

        </motion.div>
      ))}
    </div>
  );
}
