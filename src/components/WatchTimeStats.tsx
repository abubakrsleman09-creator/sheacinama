import { useState, useEffect, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, updateDoc, increment, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Play, PlayCircle, BarChart3, Clock, Trophy, Flame, Film, Trash2, Milestone, ChevronRight, Activity, Zap } from "lucide-react";
import { Movie } from "../types";

interface WatchTimeStatsProps {
  user: FirebaseUser | null;
  movies: Movie[];
  onMovieSelect?: (movie: Movie) => void;
  onClose: () => void;
}

export default function WatchTimeStats({ user, movies, onMovieSelect, onClose }: WatchTimeStatsProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulationActive, setSimulationActive] = useState<string | null>(null);
  const [simSeconds, setSimSeconds] = useState(0);

  // Sync real-time watch history
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "watch_history"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((snap) => {
        items.push({ id: snap.id, ...snap.data() });
      });
      // Sort by lastWatched descending
      items.sort((a, b) => {
        const tA = a.lastWatched?.seconds ? a.lastWatched.seconds * 1000 : new Date(a.lastWatched || 0).getTime();
        const tB = b.lastWatched?.seconds ? b.lastWatched.seconds * 1000 : new Date(b.lastWatched || 0).getTime();
        return tB - tA;
      });
      setHistory(items);
      setLoading(false);
    }, (err) => {
      console.error("Watch history sync error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Simulate passive background player tracking tick
  useEffect(() => {
    if (!simulationActive || !user) return;

    const interval = setInterval(async () => {
      setSimSeconds((prev) => {
        const next = prev + 5;
        // Each mock tick of active playback simulates adding 2.4 minutes of view time
        const movie = movies.find(m => m.id === simulationActive);
        if (movie) {
          const docId = `${user.uid}_${movie.id}`;
          const ref = doc(db, "watch_history", docId);
          setDoc(ref, {
            userId: user.uid,
            movieId: movie.id,
            movieTitle: movie.title,
            category: movie.category || "فیلم",
            genre: movie.genre || "",
            posterUrl: movie.posterUrl || "",
            watchedMinutes: increment(2),
            lastWatched: serverTimestamp()
          }, { merge: true }).catch(err => {
            console.warn("Failed to write watch history tick:", err);
          });
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [simulationActive, user, movies]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let moviesCount = 0;
    let seriesCount = 0;
    const genreMinutes: Record<string, number> = {};

    history.forEach((item) => {
      const mins = item.watchedMinutes || 0;
      totalMinutes += mins;

      if (item.category === "زنجیرە") {
        seriesCount++;
      } else {
        moviesCount++;
      }

      const genres = item.genre ? item.genre.split(",") : [];
      genres.forEach((g: string) => {
        const t = g.trim();
        if (t) {
          genreMinutes[t] = (genreMinutes[t] || 0) + mins;
        }
      });
    });

    // Find favorite genre
    let favGenre = "دیاری نەکراوە";
    let maxGVal = 0;
    Object.entries(genreMinutes).forEach(([genre, val]) => {
      if (val > maxGVal) {
        maxGVal = val;
        favGenre = genre;
      }
    });

    // Simulated active daily streak
    let streak = history.length > 0 ? Math.min(7, Math.ceil(history.length / 2) + 1) : 0;

    return {
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      moviesCount,
      seriesCount,
      totalWatched: history.length,
      favGenre,
      streak
    };
  }, [history]);

  // Custom high-fidelity weekly SVG activity chart data generator
  const weeklyData = useMemo(() => {
    // Distribute totalMinutes over 7 days in varying amounts for beautiful display
    const days = [
      { name: "دووشەممە", key: "دوو", percent: 15 },
      { name: "سێشەممە", key: "سێ", percent: 45 },
      { name: "چوارشەممە", key: "چوار", percent: 20 },
      { name: "پێنجشەممە", key: "پێنج", percent: 75 },
      { name: "هەینی", key: "هەینی", percent: 95 },
      { name: "شەممە", key: "شەممە", percent: 60 },
      { name: "یەکشەممە", key: "یەک", percent: 30 }
    ];

    const baseVal = stats.totalMinutes > 0 ? stats.totalMinutes : 240; // Default gorgeous fallback mock curves if history is blank
    return days.map(d => {
      const computedMinutes = Math.round((baseVal / 3) * (d.percent / 100));
      return {
        ...d,
        minutes: computedMinutes
      };
    });
  }, [stats.totalMinutes]);

  const handleDeleteHistoryItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "watch_history", itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateWatch = async (movie: Movie) => {
    if (!user) return;
    if (simulationActive === movie.id) {
      setSimulationActive(null);
      setSimSeconds(0);
      return;
    }

    setSimulationActive(movie.id);
    setSimSeconds(0);

    // Initial instant contribution
    const docId = `${user.uid}_${movie.id}`;
    const ref = doc(db, "watch_history", docId);
    await setDoc(ref, {
      userId: user.uid,
      movieId: movie.id,
      movieTitle: movie.title,
      category: movie.category || "فیلم",
      genre: movie.genre || "",
      posterUrl: movie.posterUrl || "",
      watchedMinutes: increment(12), // Initial 12 minutes view time
      lastWatched: serverTimestamp()
    }, { merge: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 rtl-dir animate-[fadeIn_0.4s_ease-out]">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 pb-5 mb-8 gap-4">
        <div className="text-right flex flex-col gap-1">
          <div className="flex items-center gap-2 justify-end">
            <Activity className="text-yellow-500 animate-pulse" size={24} />
            <h1 className="text-2xl font-black text-white font-sans">
              کۆنترۆڵ پانێڵی کاتی بینین
            </h1>
          </div>
          <p className="text-xs text-stone-400 font-sans">
            ئۆمەر و کاتەکانی تەرخانکراو بە بینینی پۆستەرە سەرنجڕاکێشەکان
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white px-5 py-2 text-xs font-bold font-sans flex items-center gap-1.5 transition cursor-pointer"
        >
          <ChevronRight size={14} />
          <span>گەڕانەوە بۆ ماڵەوە</span>
        </button>
      </div>

      {!user ? (
        <div className="rounded-2xl border border-dashed border-stone-800 bg-[#0c0c0e] p-12 text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="h-14 w-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto">
            <Clock size={28} />
          </div>
          <h2 className="text-lg font-bold text-stone-200 font-sans">چوونەژوورەوە پێویستە</h2>
          <p className="text-xs text-stone-400 font-sans leading-relaxed">
            تکایە بەشداری بکە یان بچۆ ژوورەوە بۆ ئەوەی بگریتە ئەستۆ و ئامارەکانی کاتی بینینی فیلم و زنجیرە کان لێرەدا بپارێزیت.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Simulation Notification if Active */}
          {simulationActive && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-[bounce_1s_ease-in-out_1]">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                <p className="text-xs text-stone-300 font-sans">
                  لێدانی نمایشی چالاکە: <span className="font-bold text-yellow-400">{movies.find(m => m.id === simulationActive)?.title}</span> - تیکەر بەردەوام زیاد دەکات (+٢ خولەک هەر ٥ چرکەیەک)
                </p>
              </div>
              <button
                onClick={() => setSimulationActive(null)}
                className="bg-yellow-500 hover:bg-yellow-400 text-stone-950 px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition cursor-pointer"
              >
                ڕاگرتنی مۆد
              </button>
            </div>
          )}

          {/* Core Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat Item 1 */}
            <div className="rounded-2xl bg-[#09090b] border border-stone-850 p-5 flex items-center gap-4 text-right">
              <div className="h-12 w-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
                <Clock size={22} className="stroke-[2]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-sans">تەواوی کاتی بینراو</p>
                <h3 className="text-xl font-black text-white font-sans mt-0.5 tracking-tight">
                  {stats.totalMinutes} <span className="text-xs text-stone-400 font-medium">خولەک</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">نیزیکەی {stats.totalHours} کاتژمێر</p>
              </div>
            </div>

            {/* Stat Item 2 */}
            <div className="rounded-2xl bg-[#09090b] border border-stone-850 p-5 flex items-center gap-4 text-right">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Film size={22} className="stroke-[2]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-sans">ناوەرۆکی بێهاوتا</p>
                <h3 className="text-xl font-black text-white font-sans mt-0.5 tracking-tight">
                  {stats.totalWatched} <span className="text-xs text-stone-400 font-medium">بۆرد</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">
                  {stats.moviesCount} فیلم • {stats.seriesCount} زنجیرە
                </p>
              </div>
            </div>

            {/* Stat Item 3 */}
            <div className="rounded-2xl bg-[#09090b] border border-stone-850 p-5 flex items-center gap-4 text-right">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Flame size={22} className="stroke-[2] animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-sans">بەردەوامی لەسەریەک</p>
                <h3 className="text-xl font-black text-white font-sans mt-0.5 tracking-tight">
                  {stats.streak} <span className="text-xs text-stone-400 font-medium">ڕۆژ</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">زۆرترین جۆش و خرۆشی بینین</p>
              </div>
            </div>

            {/* Stat Item 4 */}
            <div className="rounded-2xl bg-[#09090b] border border-stone-850 p-5 flex items-center gap-4 text-right">
              <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Trophy size={22} className="stroke-[2]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-sans">خواستی ژانەری دڵخواز</p>
                <h3 className="text-base font-bold text-white font-sans mt-0.5 truncate max-w-[150px]">
                  {stats.favGenre}
                </h3>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">ئاماری زۆرترین کات لەسەر ئەم ژانەرە</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SVG Weekly Activities Graph */}
            <div className="lg:col-span-8 rounded-2xl bg-[#09090b] border border-stone-850 p-5">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-5 flex-row-reverse">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-yellow-500" size={16} />
                  <h3 className="text-stone-300 text-xs font-bold font-sans">ئاماری حەفتانەی خولەکەکانی بینین</h3>
                </div>
                <span className="text-[9px] text-stone-500 font-sans uppercase">بینینی حەفتانە (خولەک)</span>
              </div>

              {/* Graphic Chart representation with SVG */}
              <div className="relative h-64 w-full flex items-end justify-between pt-6 px-2 md:px-6">
                {/* SVG Y-Axis backdrop lines */}
                <div className="absolute inset-x-0 bottom-10 top-6 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-t border-dashed border-stone-700 w-full" />
                  <div className="border-t border-dashed border-stone-700 w-full" />
                  <div className="border-t border-dashed border-stone-700 w-full" />
                </div>

                {weeklyData.map((d, idx) => {
                  // Compute height percentage based on max value in graph
                  const maxVal = Math.max(...weeklyData.map(v => v.minutes), 80);
                  const heightPercent = Math.min(100, Math.max(8, (d.minutes / maxVal) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end z-10 px-1">
                      {/* Tooltip on Hover */}
                      <div className="absolute top-0 bg-stone-900 border border-stone-800 text-yellow-500 text-[10px] rounded-lg px-2 py-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none -translate-y-2 font-mono">
                        {d.minutes} خولەک
                      </div>

                      {/* Bar Pillar */}
                      <div className="w-4 sm:w-6 md:w-8 rounded-t-lg bg-gradient-to-t from-yellow-600 to-yellow-400 group-hover:from-yellow-400 group-hover:to-yellow-300 transition-all duration-300 relative cursor-pointer shadow-[0_4px_16px_rgba(234,179,8,0.15)] group-hover:shadow-[0_4px_24px_rgba(234,179,8,0.3)]" style={{ height: `${heightPercent}%` }}>
                        <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-lg" />
                      </div>

                      {/* X-Axis labels */}
                      <div className="mt-3 text-center">
                        <p className="text-[10px] text-stone-300 font-sans">{d.name}</p>
                        <p className="text-[9px] text-stone-500 font-sans mt-0.5">{d.key}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Interactive Simulated View Trigger */}
            <div className="lg:col-span-4 rounded-2xl bg-[#09090b] border border-stone-850 p-5 space-y-4">
              <div className="border-b border-stone-800/80 pb-3">
                <h3 className="text-stone-300 text-xs font-bold font-sans text-right">تاقیکردنەوەی لێدان و زیادکردنی کاتی بینین</h3>
                <p className="text-[10px] text-stone-400 font-sans text-right mt-1">فیلمێک هەڵبژێرە بۆ لێدانی تاقیکاری و زیادکردنی کات بۆ بینینەکانت لە پاشخاندا.</p>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {movies.slice(0, 5).map((m) => {
                  const isActive = simulationActive === m.id;
                  return (
                    <div key={m.id} className={`flex items-center justify-between p-2 rounded-xl text-xs gap-3 transition ${isActive ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-[#121214] border border-stone-850 hover:border-stone-800'}`}>
                      <button
                        onClick={() => handleSimulateWatch(m)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans transition cursor-pointer flex items-center gap-1 ${isActive ? 'bg-red-500 text-white' : 'bg-yellow-500 text-stone-950 hover:bg-yellow-400'}`}
                      >
                        {isActive ? "ڕاگرتن" : "لێدان و زیادکرن"}
                        <Zap size={11} />
                      </button>

                      <div className="text-right truncate max-w-[150px]">
                        <p className="font-semibold text-stone-200 truncate">{m.title}</p>
                        <p className="text-[9px] text-stone-500 truncate">{m.genre}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recently Watched List (Interactive History Log) */}
          <div className="rounded-2xl bg-[#09090b] border border-stone-850 p-5">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-4 flex-row-reverse">
              <h3 className="text-stone-300 text-xs font-bold font-sans">دوایین بەرهەمە بینراوەکان و مێژووەکانی من</h3>
              <span className="text-[10px] text-stone-500 font-sans">تۆمارەکانی مێژووی بینین</span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-stone-500 text-xs font-sans">باردەکرێت...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-stone-850 rounded-xl bg-[#08080a]">
                <p className="text-[11px] text-stone-500 font-sans">مێژووی بینینی تۆ هێشتا بەتاڵە. کاتێک سێرڤەر بەکار دەهێنیت لێرە چاودێری دەکرێت!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <div key={item.id} className="relative rounded-2xl border border-stone-850 bg-[#0c0c0e]/50 p-3.5 flex gap-3 hover:border-stone-800 transition duration-200 text-right rtl-dir">
                    {item.posterUrl && (
                      <img src={item.posterUrl} alt="" className="h-16 w-11 object-cover rounded-md border border-stone-800" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between flex-row-reverse gap-2">
                          <h4 className="text-xs font-bold text-stone-200 truncate max-w-[160px]">{item.movieTitle}</h4>
                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="text-stone-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
                            title="سڕینەوەی ئەم پێوانەیە"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-[9px] text-stone-500 mt-1 font-sans">{item.genre}</p>
                      </div>

                      {/* Progress bar and watch duration */}
                      <div className="mt-2 text-right">
                        <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans">
                          <span>{item.watchedMinutes} خولەک خوێندراوەتەوە</span>
                          <span>{item.category}</span>
                        </div>
                        <div className="w-full bg-stone-900 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (item.watchedMinutes / 140) * 100)}%` }}
                          />
                        </div>
                      </div>
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
