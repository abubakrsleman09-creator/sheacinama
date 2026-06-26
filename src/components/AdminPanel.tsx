import React, { useState } from "react";
import { Plus, Trash2, Edit, Save, PlusCircle, MinusCircle, AlertCircle, RefreshCw, Key, Upload, Image as ImageIcon, Sparkles, Users, Clock, Monitor, Smartphone, Laptop, Globe, Activity } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy, limit, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Movie, StreamServer, Season, Episode } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";

interface AdminPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  userPermissions?: { canPublish: boolean; canEdit: boolean } | null;
  movies: Movie[];
  onMovieSaved: () => void;
  onEditMovie: (movie: Movie) => void;
}

export default function AdminPanel({
  user,
  isAdmin,
  userPermissions,
  movies,
  onMovieSaved,
  onEditMovie,
}: AdminPanelProps) {
  // Movie Form State
  const [activeTab, setActiveTab] = useState<"movies" | "presence" | "analytics" | "admins">("movies");
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [visitLogs, setVisitLogs] = useState<any[]>([]);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Dynamic moderator / admin variables
  const [moderators, setModerators] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newCanPublish, setNewCanPublish] = useState(false);
  const [newCanEdit, setNewCanEdit] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // Compute actual actions capabilities
  const isSuperAdmin = user?.email === "abubakrsleman09@gmail.com";
  const canPublish = isSuperAdmin || (userPermissions ? !!userPermissions.canPublish : false);
  const canEdit = isSuperAdmin || (userPermissions ? !!userPermissions.canEdit : false);

  // Interactive analytics states
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Sync active presence and visit logs when on the presence or analytics tab
  React.useEffect(() => {
    if (activeTab === "movies") return;

    // 1. Listen to active online users in real-time
    const unsubOnline = onSnapshot(collection(db, "online_users"), (snapshot) => {
      const list: any[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.lastActive) {
          const lastActiveTime = new Date(d.lastActive).getTime();
          // Active in the last 25 seconds
          if (now - lastActiveTime < 25000) {
            list.push({ id: docSnap.id, ...d });
          }
        }
      });
      // Sort: newest entered first
      list.sort((a, b) => new Date(b.enteredAt || 0).getTime() - new Date(a.enteredAt || 0).getTime());
      setOnlineUsers(list);
    }, (err) => {
      console.warn("Admin panel online users sync failed:", err);
    });

    // 2. Listen to historical visit logs
    setIsLoadingLogs(true);
    const logsQuery = query(collection(db, "visit_logs"), orderBy("enteredAt", "desc"), limit(100));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setVisitLogs(list);
      setIsLoadingLogs(false);
    }, (err) => {
      console.warn("Admin panel visit logs sync failed:", err);
      setIsLoadingLogs(false);
    });

    return () => {
      unsubOnline();
      unsubLogs();
    };
  }, [activeTab]);

  // Handle wiping visit logs from Firestore
  const handleClearVisitLogs = async () => {
    if (!window.confirm("ئایا دڵنیایت لە سڕینەوەی سەرجەم تۆمارەکانی سەردانیکردن؟")) return;
    setIsClearingLogs(true);
    try {
      const q = query(collection(db, "visit_logs"));
      const snap = await getDocs(q);
      const promises = snap.docs.map(docSnap => deleteDoc(doc(db, "visit_logs", docSnap.id)));
      await Promise.all(promises);
      setSuccessMessage("سەرجەم تۆمارەکانی سەردانیکردن بە سەرکەوتوویی سڕانەوە.");
      setErrorMessage("");
    } catch (err) {
      console.error("Failed to clear visit logs:", err);
      setErrorMessage("سڕینەوەی تۆمارەکان سەرکەوتوو نەبوو.");
    } finally {
      setIsClearingLogs(false);
    }
  };

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
  const [isSeeding, setIsSeeding] = useState(false);

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

  // Handle Local image uploads (converts to compressed Base64 data url)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'poster' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress quality to 0.7 for light-weight data and beautiful resolution
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          
          if (target === 'poster') {
            setPosterUrl(compressedBase64);
            setSuccessMessage("وێنەی پۆستەر بە سەرکەوتوویی بارکرا و قەبارەکەی بە شێوەیەکی گونجاو کەم کرایەوە!");
          } else {
            setBannerUrl(compressedBase64);
            setSuccessMessage("وێنەی باکدرۆپ بە سەرکەوتوویی بارکرا و قەبارەکەی بە شێوەیەکی گونجاو کەم کرایەوە!");
          }
        } else {
          setErrorMessage("هەڵەیەک ڕوویدا لە بارکردن و ڕێکخستنی قەبارەی وێنەکە");
        }
      };

      img.onerror = () => {
        setErrorMessage("پەڕگەی وێنەکە ناتەواوە یان زیانی پێگەیشتووە.");
      };

      img.src = reader.result as string;
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

  // Synchronize moderators collection when on the admins tab
  React.useEffect(() => {
    if (activeTab !== "admins" || !isSuperAdmin) return;

    const unsubMods = onSnapshot(collection(db, "moderators"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setModerators(list);
    }, (err) => {
      console.warn("Admin panel moderators sync failed:", err);
    });

    return () => {
      unsubMods();
    };
  }, [activeTab, isSuperAdmin]);

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!newAdminEmail.trim()) {
      setErrorMessage("تکایە ئیمەیڵی ئەدمینی نوێ بنووسە.");
      return;
    }
    setIsAdminSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const emailLower = newAdminEmail.trim().toLowerCase();
      const docRef = doc(db, "moderators", emailLower);
      await setDoc(docRef, {
        email: emailLower,
        role: "moderator",
        canPublish: newCanPublish,
        canEdit: newCanEdit,
        createdAt: serverTimestamp(),
        addedBy: user?.email || "abubakrsleman09@gmail.com",
      });
      setSuccessMessage(`ئەدمینی نوێ (${emailLower}) بە سەرکەوتوویی زیادکرا.`);
      setNewAdminEmail("");
      setNewCanPublish(false);
      setNewCanEdit(false);
    } catch (err) {
      console.error("Failed to add moderator:", err);
      setErrorMessage("زیادکردنی ئەدمین سەرکەوتوو نەبوو. تکایە دڵنیابەرەوە لە مۆڵەتەکان.");
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleRemoveModerator = async (email: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`ئایا دڵنیایت لە سڕینەوەی ئەم ئەدمینە؟ (${email})`)) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteDoc(doc(db, "moderators", email));
      setSuccessMessage(`ئەدمین (${email}) بە سەرکەوتوویی لابرا.`);
    } catch (err) {
      console.error("Failed to remove moderator:", err);
      setErrorMessage("لابرانی ئەدمین سەرکەوتوو نەبوو.");
    }
  };

  const handleToggleModeratorPermission = async (email: string, field: "canPublish" | "canEdit", currentValue: boolean) => {
    if (!isSuperAdmin) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateDoc(doc(db, "moderators", email), {
        [field]: !currentValue,
      });
      setSuccessMessage("دەسەڵاتی ئەدمین بە سەرکەوتوویی هەموارکرا.");
    } catch (err) {
      console.error("Failed to update moderator permission:", err);
      setErrorMessage("هەموارکردنی دەسەڵات سەرکەوتوو نەبوو.");
    }
  };

  // Seed default sample movies into Firestore database
  const handleSeedDefaultMovies = async () => {
    if (!canPublish) {
      setErrorMessage("ببوورە! تۆ دەسەڵاتی بڵاوکردنەوە یان نووسینەوەی کەتەلۆگت نییە.");
      return;
    }
    setIsSeeding(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const defaultSampleMovies = [
        {
          title: "1988",
          description: "فیلمی ١٩٨٨ فیلمێکی درامای مێژوویی ناوازە و کاریگەری مێژووی نوێی گەلی کوردە دەربارەی مەرگەساتی کيميابارانکردنی هەڵەبجە.",
          year: "2023",
          category: "فیلمی کوردی",
          genre: "دراما",
          rating: "7",
          posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
          bannerUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1200&auto=format&fit=crop",
          servers: [
            { name: "سێرڤەری سەرەکی", url: "https://www.w3schools.com/html/mov_bbb.mp4" }
          ],
          isTrending: true,
          views: 5,
        },
        {
          title: "joker",
          description: "فیلمێکی درامی تاوانکاری ناوازەیە دەربارەی ژیانی ئارسەر فلێک کە چۆن بە هۆی کێشە دەروونی و پشتگوێخستنی کۆمەڵگاوە تەشەنە دەسێنێت بۆ کێشە بەناوبانگەکەی جۆکەر.",
          year: "2019",
          category: "فیلم",
          genre: "دراما",
          rating: "7",
          posterUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=600&auto=format&fit=crop",
          bannerUrl: "https://images.unsplash.com/photo-1542204172-e7052809a1a4?q=80&w=1200&auto=format&fit=crop",
          servers: [
            { name: "سێرڤەری سەرەکی", url: "https://www.w3schools.com/html/movie.mp4" }
          ],
          isTrending: true,
          views: 0,
        },
        {
          title: "war machine 2026",
          description: "فیلمێکی پێشبینیکراوی نوێی زانستی خەیاڵی دەربارەی سەرکێشی تەکنەلۆژیا و شەڕی جیهانی داهاتووی ئامێرە پێشکەوتووەکان.",
          year: "2026",
          category: "فیلم",
          genre: "SCI-FI",
          rating: "6.4",
          posterUrl: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=600&auto=format&fit=crop",
          bannerUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
          servers: [
            { name: "سێرڤەری خێرا", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
          ],
          isTrending: false,
          views: 0,
        },
        {
          title: "swapped",
          description: "ئەنیمێیەکی خەیاڵی و کۆمیدی نوێ کە باس لە خەون و چالاکی خێزانی گۆڕینەوەی جەستەکان دەکات.",
          year: "2026",
          category: "ئەنیمێ",
          genre: "خەیاڵی",
          rating: "7.1",
          posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop",
          bannerUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop",
          servers: [
            { name: "سێرڤەری سەرەکی", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }
          ],
          isTrending: false,
          views: 4,
        },
        {
          title: "hoppers",
          description: "ئەنیمێیەکی ناوازەی دیزنی دەربارەی تێکەڵبوونی گەنجێک لەگەڵ ئاژەڵە ژیکەڵەکان لەرێگەی ڕۆبۆتێکی سەرنجڕاکێشەوە.",
          year: "2026",
          category: "ئەنیمێ",
          genre: "ئەنیمەیشن",
          rating: "8.2",
          posterUrl: "https://images.unsplash.com/photo-1472214222541-d510753a49fa?q=80&w=600&auto=format&fit=crop",
          bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop",
          servers: [
            { name: "سێرڤەری تەواو", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
          ],
          isTrending: false,
          views: 8,
        }
      ];

      for (const movie of defaultSampleMovies) {
        await addDoc(collection(db, "movies"), {
          ...movie,
          createdAt: serverTimestamp()
        });
      }

      setSuccessMessage("هەموو فیلمە نموونەییەکان بە سەرکەوتوویی زیادکران بۆ داتابەیسەکەت!");
      onMovieSaved();
    } catch (err) {
      setErrorMessage("هەڵەیەک ڕوویدا لە کاتی پڕکردنەوەی فیلمەکان. تکایە پشکنین بۆ مۆڵەتی فایەربەیسەکەت بکە.");
      handleFirestoreError(err, OperationType.WRITE, "movies/seed");
    } finally {
      setIsSeeding(false);
    }
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
    if (!canPublish) {
      setErrorMessage("ببوورە! تۆ دەسەڵاتی سڕینەوەی بابەتەکانت نییە.");
      return;
    }
    if (!window.confirm("ئایا دڵنیای لە سڕینەوەی ئەم بابەتە؟")) return;
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const path = `movies`;
      await deleteDoc(doc(db, path, movieId));
      setSuccessMessage("فیلمەکە بە سەرکەوتوویی سڕایەوە.");
      onMovieSaved();
    } catch (err: any) {
      console.error("Deletion error:", err);
      setErrorMessage("ناتوانیت ئەم بابەتە بسڕیتەوە! تکایە متمانە بکەرەوە کە بە ئەکاونتی ڕاستەقینەکەت (abubakrsleman09@gmail.com) لۆگینت کردووە نەک بە جۆری کاتی (Bypass). تەنها ئەکاونتی سەرەکی ڕێگەپێدراوە بۆ سڕینەوە.");
      try {
        handleFirestoreError(err, OperationType.DELETE, `movies/${movieId}`);
      } catch (e) {
        // Prevents unhandled rejections from bubble-crashing the thread
      }
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

    if (editingMovieId) {
      if (!canEdit) {
        setErrorMessage("ببوورە! تۆ دەسەڵاتی دەستکاری کردنی زانیاری بابەتەکانت نییە.");
        return;
      }
    } else {
      if (!canPublish) {
        setErrorMessage("ببوورە! تۆ دەسەڵاتی بڵاوکردنەوەی بابەتی نوێ لەم سایتەدا نییە.");
        return;
      }
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
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage("هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن! دڵنیابەرەوە کە بە ئەکاونتی سەرەکی خۆت (abubakrsleman09@gmail.com) لۆگینت کردووە نەک لۆگینی کاتی (Bypass) تاوەکو مۆڵەتت هەبێت بنوسیتە ناو داتابەسی فایەربەیسەکەت.");
      try {
        handleFirestoreError(err, OperationType.WRITE, `movies/${editingMovieId || "new"}`);
      } catch (e) {}
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

      {/* Tab Switchers */}
      <div className="flex flex-wrap gap-2.5 mb-8 border-b border-stone-850 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("movies")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
            activeTab === "movies"
              ? "bg-yellow-500 text-stone-950 font-black shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
              : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          <span>🎬 بەڕێوەبردنی کەتەلۆگ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("presence")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
            activeTab === "presence"
              ? "bg-yellow-500 text-stone-950 font-black shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
              : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          <span>👥 بینەرانی سەر هێڵ و تۆمارەکان</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("analytics");
            setSelectedGenre(null);
            setSelectedDayIndex(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
            activeTab === "analytics"
              ? "bg-yellow-500 text-stone-950 font-black shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
              : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          <span>📊 بۆردی ئامارەکان (هێڵکاری)</span>
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
              activeTab === "admins"
                ? "bg-yellow-500 text-stone-950 font-black shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
                : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <span>🛡️ بەڕێوەبردنی دەسەڵاتەکان</span>
          </button>
        )}
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

      {activeTab === "movies" ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 animate-in fade-in-50 duration-200">
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
          <h3 className="text-stone-100 text-sm font-bold font-sans mb-4 border-b border-stone-800 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-sans text-stone-400 font-normal text-xs">سەرجەم کەتەلۆگ ({movies.length})</span>
              <button
                type="button"
                onClick={handleSeedDefaultMovies}
                disabled={isSeeding}
                className="text-[9px] sm:text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg hover:bg-yellow-500/20 transition-all font-sans font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="بارکردن یان چاککردنەوەی فیلمە کۆنەکانت"
              >
                {isSeeding ? <RefreshCw className="animate-spin" size={10} /> : <Sparkles size={10} />}
                <span>گەڕاندنەوەی فیلمە کۆنەکان (Joker, 1988...)</span>
              </button>
            </div>
            <span>بەرهەمە بڵاوکراوەکان</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {movies.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-stone-500 text-xs py-10 font-sans text-center">
                <span>داتابەسی فایەربەیسەکەت بەتەواوی بەتاڵە و هیچ فیلمێکی تێدا نییە.</span>
                <button
                  type="button"
                  onClick={handleSeedDefaultMovies}
                  disabled={isSeeding}
                  className="rounded-xl bg-yellow-500 hover:bg-yellow-400 text-stone-950 px-4 py-2.5 font-bold transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(234,179,8,0.15)] disabled:opacity-50 cursor-pointer"
                >
                  {isSeeding ? (
                    <RefreshCw className="animate-spin animate-infinite duration-1000" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  <span>پڕکردنەوەی خۆکار بە فیلمی نموونەیی</span>
                </button>
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
      ) : activeTab === "presence" ? (
        /* Real-time Presence UI */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 text-right animate-in fade-in-50 duration-200">
          
          {/* Left Column: Currently Online Users (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#101012] border border-stone-800/80 rounded-2xl p-6 flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4 flex-row-reverse">
              <div className="flex items-center gap-2 flex-row-reverse">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-stone-100 text-sm font-bold font-sans">بینەرانی ئێستای سەر هێڵ ({onlineUsers.length})</h3>
              </div>
              <Activity size={16} className="text-emerald-500 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {onlineUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs py-10 font-sans text-center">
                  <span>هیچ کەسێک لەسەر هێڵ نییە لەم ساتەدا.</span>
                </div>
              ) : (
                onlineUsers.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-850 bg-[#161619] gap-3 flex-row-reverse"
                  >
                    {/* User profile image & name */}
                    <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                      {item.photoURL ? (
                        <img
                          src={item.photoURL}
                          alt=""
                          className="h-8 w-8 rounded-full border border-stone-800 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-bold text-stone-300 shrink-0">
                          {item.userName ? item.userName.charAt(0) : "👤"}
                        </div>
                      )}
                      <div className="text-right min-w-0">
                        <h4 className="text-xs font-semibold text-stone-200 truncate font-sans">
                          {item.userName}
                        </h4>
                        <p className="text-[9px] text-stone-500 font-sans">
                          {item.userId === "guest" ? "مێوانی ئاسایی" : "بەکارهێنەری لۆگینکراو"}
                        </p>
                      </div>
                    </div>

                    {/* Device icon and entry time */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 flex-row-reverse">
                        {item.userAgent?.toLowerCase().includes("mobi") || item.userAgent?.toLowerCase().includes("android") || item.userAgent?.toLowerCase().includes("iphone") ? (
                          <Smartphone size={12} className="text-yellow-500" />
                        ) : (
                          <Laptop size={12} className="text-emerald-400" />
                        )}
                        <span className="text-[9px] text-stone-400 font-mono">
                          {item.userAgent?.toLowerCase().includes("iphone") ? "iPhone" : 
                           item.userAgent?.toLowerCase().includes("android") ? "Android" : 
                           item.userAgent?.toLowerCase().includes("windows") ? "Windows" : 
                           item.userAgent?.toLowerCase().includes("mac") ? "Mac" : "وێب"}
                        </span>
                      </div>
                      <span className="text-[8px] text-stone-500 font-sans">
                        {item.enteredAt ? `سەرەتای لۆگین: ${new Date(item.enteredAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}` : "ناچالاك"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Historical Visit Logs (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#101012] border border-stone-800/80 rounded-2xl p-6 flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4 flex-row-reverse">
              <div className="flex items-center gap-2 flex-row-reverse">
                <Clock size={16} className="text-yellow-500" />
                <h3 className="text-stone-100 text-sm font-bold font-sans">مێژووی لۆگی سەردانیکردن (دواین ١٠٠ سەردان)</h3>
              </div>
              <button
                type="button"
                onClick={handleClearVisitLogs}
                disabled={isClearingLogs || visitLogs.length === 0}
                className="text-[10px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl transition-all font-sans font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Trash2 size={11} />
                <span>پاککردنەوەی لۆگەکان</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingLogs ? (
                <div className="h-full flex items-center justify-center text-stone-500 text-xs py-10 font-sans">
                  <RefreshCw className="animate-spin text-yellow-500 mr-2" size={16} />
                  <span>باردەکرێت...</span>
                </div>
              ) : visitLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs py-10 font-sans text-center">
                  <span>هیچ مێژوویەک لە داتابەیسەکەدا تۆمار نەکراوە.</span>
                </div>
              ) : (
                visitLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-850/60 bg-[#141416]/50 hover:bg-[#141416] transition-colors gap-4 flex-row-reverse"
                  >
                    {/* Visitor name */}
                    <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                      <div className="h-7 w-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-400 shrink-0">
                        {log.userName?.charAt(0) || "👤"}
                      </div>
                      <div className="text-right min-w-0">
                        <span className="text-xs font-semibold text-stone-300 truncate block font-sans">
                          {log.userName}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono block">
                          ID: {log.userId === "guest" ? "مێوان" : log.userId.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {/* Meta info of the visitor */}
                    <div className="flex items-center gap-6 flex-row-reverse shrink-0">
                      {/* Browser Agent details */}
                      <div className="text-right text-[9px] text-stone-500 max-w-[150px] truncate hidden sm:block font-mono font-sans">
                        {log.userAgent || "Unknown Device"}
                      </div>

                      {/* Visited Date & Time */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-stone-300 font-mono block">
                          {log.enteredAt ? new Date(log.enteredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono block">
                          {log.enteredAt ? new Date(log.enteredAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : activeTab === "admins" && isSuperAdmin ? (
        /* Administrator & Permissions Management Panel */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 text-right animate-in fade-in-50 duration-200">
          
          {/* Add Admin Form Column (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#101012] border border-stone-800/80 rounded-2xl p-6">
            <h3 className="text-stone-100 text-sm font-bold font-sans mb-5 border-b border-stone-800 pb-3 flex items-center justify-between flex-row-reverse">
              <span className="flex items-center gap-2 flex-row-reverse">
                <Users size={16} className="text-yellow-400" />
                <span>زیادکردنی ئەدمینی نوێ</span>
              </span>
            </h3>

            <form onSubmit={handleAddModerator} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 font-sans mb-1.5 text-right">ئیمەیڵی فایەربەیسی بەکارهێنەر (پێویستە)</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full text-xs rounded-xl border border-stone-800 bg-[#161619] px-4 py-3 text-stone-100 focus:border-yellow-500/50 focus:outline-none text-left font-mono"
                />
                <p className="text-[10px] text-stone-500 mt-1.5 font-sans leading-relaxed text-right">
                  تێبینی: ئیمەیڵەکە دەبێت هاوشێوەی ئیمەیڵی چوونەژوورەوەی جیمەیڵەکەی بێت تاوەکو سیستەمەکە بتوانێت بیناسێتەوە.
                </p>
              </div>

              {/* Permissions checkboxes */}
              <div className="bg-[#141416] border border-stone-850 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-stone-300 block mb-1 text-right">دیاریکردنی دەسەڵاتەکان:</span>
                
                <div className="flex items-start gap-3 select-none flex-row-reverse">
                  <input
                    type="checkbox"
                    id="canPublishCheck"
                    checked={newCanPublish}
                    onChange={(e) => setNewCanPublish(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-800 bg-[#161619] text-yellow-500 focus:ring-yellow-500/30 cursor-pointer"
                  />
                  <div className="text-right">
                    <label htmlFor="canPublishCheck" className="text-xs font-bold text-stone-200 cursor-pointer block">
                      بڵاوکردنەوە و سڕینەوە (Publish & Delete)
                    </label>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                      ڕێگەدان بە بڵاوکردنەوەی فیلمی نوێ یان سڕینەوەی فیلمە کۆنەکان لە کەتەلۆگ.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 select-none pt-2 border-t border-stone-800/40 flex-row-reverse">
                  <input
                    type="checkbox"
                    id="canEditCheck"
                    checked={newCanEdit}
                    onChange={(e) => setNewCanEdit(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-800 bg-[#161619] text-yellow-500 focus:ring-yellow-500/30 cursor-pointer"
                  />
                  <div className="text-right">
                    <label htmlFor="canEditCheck" className="text-xs font-bold text-stone-200 cursor-pointer block">
                      دەستکاری کردن و نوێکردنەوە (Edit & Update)
                    </label>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                      ڕێگەدان بە دەستکاری کردن و نوێکردنەوەی فیلمە بڵاوکراوەکان لەگەڵ سێرڤەرەکان.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdminSubmitting}
                className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-black py-3 text-xs transition-all duration-200 shadow-lg shadow-yellow-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAdminSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={13} />
                    <span>تۆمار دەکرێت...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>زیادکردنی بەکارهێنەر وەک ئەدمین</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Admins List Column (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#101012] border border-stone-800/80 rounded-2xl p-6 flex flex-col min-h-[500px]">
            <h3 className="text-stone-100 text-sm font-bold font-sans mb-4 border-b border-stone-800 pb-3 flex justify-between items-center flex-row-reverse">
              <span className="font-sans text-stone-400 font-normal text-xs">ژمارە: ({moderators.length + 1})</span>
              <span>ئەدمین و مۆدێراتۆرە چالاکەکان</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* Super Admin Row (Permanent) */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.02] gap-3 flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                  <div className="h-9 w-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
                    <Key size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 justify-start flex-row-reverse font-sans">
                      <span className="font-mono">abubakrsleman09@gmail.com</span>
                      <span className="bg-yellow-500 text-stone-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans">Super Admin</span>
                    </h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">بەڕێوبەری سەرەکی پەیج و خاوەنی مۆڵەتە باڵاکان</p>
                  </div>
                </div>
                
                <div className="flex gap-2 text-stone-400 font-sans text-[10px]">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-1 rounded-lg">بڵاوکردنەوە ✓</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-1 rounded-lg">دەستکاری ✓</span>
                </div>
              </div>

              {/* Added Moderators List */}
              {moderators.length === 0 ? (
                <div className="py-20 text-center text-stone-500 text-xs font-sans border border-dashed border-stone-850 rounded-xl bg-stone-900/5">
                  هیچ ئەدمینێکی تر نییە لە کاتژمێردا. دەتوانیت لە فۆرمی لای چەپەوە مۆدێراتۆر زیاد بکەیت!
                </div>
              ) : (
                moderators.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-stone-800 bg-[#161619] gap-3 flex-row-reverse hover:border-stone-750 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-row-reverse text-right">
                      <div className="h-9 w-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-400 shrink-0 font-bold text-xs font-sans">
                        Mod
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-200 font-mono text-right">{mod.email}</h4>
                        <p className="text-[9px] text-stone-500 font-sans mt-0.5 text-right">
                          زیادکراوە لە لایەن: {mod.addedBy || "Super Admin"}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Toggles & Delete button */}
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5 font-sans text-[9px]">
                        <button
                          type="button"
                          onClick={() => handleToggleModeratorPermission(mod.email, "canPublish", !!mod.canPublish)}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            mod.canPublish
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                              : "bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-400"
                          }`}
                          title="کلیک بکە بۆ گۆڕینی دەسەڵاتی بڵاوکردنەوە"
                        >
                          {mod.canPublish ? "بڵاوکردنەوە ✓" : "بڵاوکردنەوە ✗"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleModeratorPermission(mod.email, "canEdit", !!mod.canEdit)}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            mod.canEdit
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                              : "bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-400"
                          }`}
                          title="کلیک بکە بۆ گۆڕینی دەسەڵاتی دەستکاری کردن"
                        >
                          {mod.canEdit ? "دەستکاری ✓" : "دەستکاری ✗"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveModerator(mod.email)}
                        className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-500 hover:text-red-400 hover:border-red-500/20 cursor-pointer transition-all active:scale-95"
                        title="سڕینەوەی ئەم ئەدمینە"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Analytics & Charts Dashboard */
        <div className="space-y-5 sm:space-y-8 text-right animate-in fade-in-50 duration-200 font-sans">
          
          {/* Quick Metrics Cards row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
            <div className="bg-[#101012] border border-stone-850 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-stone-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">سەرجەم کەتەلۆگ</span>
              <span className="text-xl sm:text-2xl font-black text-yellow-400 mt-0.5 sm:mt-1 font-mono">{movies.length}</span>
              <span className="text-stone-400 text-[8px] sm:text-[9px] mt-0.5">فیلم و زنجیرە</span>
            </div>
            
            <div className="bg-[#101012] border border-stone-850 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-stone-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">بینەرانی سەر هێڵ</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 sm:mt-1 font-mono flex items-center gap-1 sm:gap-1.5 justify-center">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                </span>
                {onlineUsers.length}
              </span>
              <span className="text-stone-400 text-[8px] sm:text-[9px] mt-0.5">لە خولەکی ئێستادا</span>
            </div>

            <div className="bg-[#101012] border border-stone-850 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-stone-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">سەردانیکردنی گشتی</span>
              <span className="text-xl sm:text-2xl font-black text-blue-400 mt-0.5 sm:mt-1 font-mono">{visitLogs.length}</span>
              <span className="text-stone-400 text-[8px] sm:text-[9px] mt-0.5">تۆماری مێژوویی</span>
            </div>

            <div className="bg-[#101012] border border-stone-850 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-stone-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">ئامارەکانی کات</span>
              <span className="text-base sm:text-lg font-bold text-stone-200 mt-1 sm:mt-1.5 font-sans">ڕاستەوخۆ</span>
              <span className="text-stone-400 text-[8px] sm:text-[9px] mt-0.5">١٠٠٪ کۆنترۆڵکراو</span>
            </div>
          </div>

          {/* Core Analytics: Two columns layout */}
          <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-12">
            
            {/* Interactive Traffic Trend Line Chart */}
            <div className="lg:col-span-7 bg-[#101012] border border-stone-800/80 rounded-2xl p-4 sm:p-6 flex flex-col">
              <div className="border-b border-stone-800 pb-2.5 mb-4 sm:mb-6 flex items-center justify-between flex-row-reverse">
                <h3 className="text-stone-100 text-xs sm:text-sm font-bold font-sans">📈 هێڵکاری ترافیکی بینەران (٧ ڕۆژی ڕابردوو)</h3>
                <span className="text-[9px] sm:text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg">ڕاستەوخۆ</span>
              </div>

              {/* Draw Custom interactive SVG Line chart */}
              {(() => {
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  return d.toISOString().split("T")[0];
                }).reverse();

                const trafficData = last7Days.map(dateStr => {
                  const count = visitLogs.filter(log => log.enteredAt && log.enteredAt.startsWith(dateStr)).length;
                  return { date: dateStr, count };
                });

                const counts = trafficData.map(t => t.count);
                const maxCount = Math.max(...counts, 4); // avoid division by zero or flat charts
                
                // SVG points generation
                const width = 500;
                const height = 180;
                const paddingLeft = 30;
                const paddingRight = 20;
                const paddingTop = 15;
                const paddingBottom = 25;
                
                const usableWidth = width - paddingLeft - paddingRight;
                const usableHeight = height - paddingTop - paddingBottom;
                
                // Generate X and Y coordinates
                const points = trafficData.map((t, idx) => {
                  const x = paddingLeft + (idx / 6) * usableWidth;
                  const y = paddingTop + usableHeight - (t.count / maxCount) * usableHeight;
                  return { x, y, count: t.count, date: t.date };
                });

                // Generate path instruction string
                const pathStr = points.reduce((acc, p, idx) => {
                  return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
                }, "");

                // Area instruction string
                const areaStr = pathStr ? `${pathStr} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` : "";

                const activeDay = selectedDayIndex !== null ? trafficData[selectedDayIndex] : null;

                return (
                  <div className="flex flex-col flex-1 justify-between gap-4 sm:gap-6">
                    <div className="relative w-full flex justify-center bg-stone-950/40 border border-stone-900 rounded-xl p-3 sm:p-4">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#eab308" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#eab308" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = paddingTop + ratio * usableHeight;
                          return (
                            <line 
                              key={idx}
                              x1={paddingLeft} 
                              y1={y} 
                              x2={width - paddingRight} 
                              y2={y} 
                              stroke="#1e1e24" 
                              strokeWidth="0.5" 
                              strokeDasharray="4 4"
                            />
                          );
                        })}

                        {/* Shaded Area */}
                        {areaStr && <path d={areaStr} fill="url(#chartGradient)" />}

                        {/* Main Trend Line */}
                        {pathStr && (
                          <path 
                            d={pathStr} 
                            fill="none" 
                            stroke="#eab308" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}

                        {/* Interactive Nodes */}
                        {points.map((p, idx) => {
                          const isSelected = selectedDayIndex === idx;
                          return (
                            <g key={idx} className="cursor-pointer" onClick={() => setSelectedDayIndex(idx)}>
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={isSelected ? 10 : 6} 
                                fill="#eab308" 
                                fillOpacity={isSelected ? 0.3 : 0} 
                                className="transition-all duration-200"
                              />
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={isSelected ? 5 : 3.5} 
                                fill={isSelected ? "#ffffff" : "#eab308"} 
                                stroke="#070708" 
                                strokeWidth="1.5"
                                className="transition-all duration-200"
                              />
                            </g>
                          );
                        })}

                        {/* X Axis labels */}
                        {points.map((p, idx) => {
                          const formattedDate = new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          return (
                            <text 
                              key={idx}
                              x={p.x} 
                              y={height - 5} 
                              fill="#6b7280" 
                              fontSize="8" 
                              textAnchor="middle"
                              className="font-mono"
                            >
                              {formattedDate}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Interactive Node statistics */}
                    <div className="bg-[#151518] rounded-xl border border-stone-850 p-3 sm:p-4 transition-all duration-300">
                      {activeDay ? (
                        <div className="flex items-center justify-between flex-row-reverse text-right">
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-stone-500 font-mono">{activeDay.date}</p>
                            <h4 className="text-stone-200 text-[11px] sm:text-xs font-bold mt-0.5">ئامارەکانی ڕۆژی دەستنیشانکراو</h4>
                          </div>
                          <div className="flex items-baseline gap-1 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-mono">
                            <span className="text-base sm:text-lg font-black">{activeDay.count}</span>
                            <span className="text-[9px] sm:text-[10px]">سەردان</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-stone-400 text-[10px] sm:text-xs text-center py-1 sm:py-2">💡 کلیک لە هەر خاڵێکی سەر هێڵکارییەکە بکە بۆ بینینی ئاماری وردی ئەو ڕۆژە.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Platform & Devices and Categories stats (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-8">
              
              {/* Category distribution */}
              <div className="bg-[#101012] border border-stone-800/80 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
                <h3 className="text-stone-100 text-xs sm:text-sm font-bold border-b border-stone-800 pb-2.5 mb-4 font-sans">📊 دابەشبوونی بابەتەکان بەپێی جۆر</h3>
                
                {(() => {
                  const categoryCounts: { [key: string]: number } = {};
                  movies.forEach(m => {
                    const cat = m.category || "فیلم";
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                  });
                  const total = Math.max(movies.length, 1);

                  return (
                    <div className="space-y-4">
                      <div className="h-2.5 w-full rounded-full bg-stone-900 overflow-hidden flex flex-row-reverse">
                        {Object.entries(categoryCounts).map(([cat, count], idx) => {
                          const percent = (count / total) * 100;
                          const bgClass = idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-emerald-500" : idx === 2 ? "bg-sky-500" : "bg-purple-500";
                          return (
                            <div 
                              key={cat} 
                              style={{ width: `${percent}%` }} 
                              className={`${bgClass} h-full transition-all`}
                              title={`${cat}: ${count}`}
                            />
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 pt-1.5">
                        {Object.entries(categoryCounts).map(([cat, count], idx) => {
                          const percent = Math.round((count / total) * 100);
                          const borderClass = idx === 0 ? "border-yellow-500/20" : idx === 1 ? "border-emerald-500/20" : idx === 2 ? "border-sky-500/20" : "border-purple-500/20";
                          const dotClass = idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-emerald-500" : idx === 2 ? "bg-sky-500" : "bg-purple-500";

                          return (
                            <div key={cat} className={`border ${borderClass} bg-[#141416]/50 p-2 sm:p-2.5 rounded-xl flex items-center justify-between flex-row-reverse text-right`}>
                              <div className="flex items-center gap-1 sm:gap-1.5 flex-row-reverse">
                                <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${dotClass}`} />
                                <span className="text-[10px] sm:text-xs text-stone-300 font-bold font-sans">{cat}</span>
                              </div>
                              <div className="text-left">
                                <span className="text-stone-200 text-[10px] sm:text-xs font-semibold font-mono">{count} </span>
                                <span className="text-stone-500 text-[8px] sm:text-[9px] font-mono">({percent}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Devices distribution */}
              <div className="bg-[#101012] border border-stone-800/80 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
                <h3 className="text-stone-100 text-xs sm:text-sm font-bold border-b border-stone-800 pb-2.5 mb-4 font-sans">📱 جۆری ئامێری بەکارهێنەران و وێبگەڕەکان</h3>

                {(() => {
                  let mobileCount = 0;
                  let desktopCount = 0;
                  visitLogs.forEach(log => {
                    const ua = (log.userAgent || "").toLowerCase();
                    if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
                      mobileCount++;
                    } else {
                      desktopCount++;
                    }
                  });
                  const total = Math.max(mobileCount + desktopCount, 1);
                  const mobilePercent = Math.round((mobileCount / total) * 100);
                  const desktopPercent = 100 - mobilePercent;

                  return (
                    <div className="space-y-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] sm:text-xs flex-row-reverse text-right">
                          <span className="text-stone-300 font-bold font-sans flex items-center gap-1 flex-row-reverse"><Laptop size={11} className="sm:w-3 sm:h-3" /> کۆمپیوتەر و دێسکتۆپ</span>
                          <span className="text-stone-200 font-semibold font-mono">{desktopPercent}% ({desktopCount} جار)</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${desktopPercent}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] sm:text-xs flex-row-reverse text-right">
                          <span className="text-stone-300 font-bold font-sans flex items-center gap-1 flex-row-reverse"><Smartphone size={11} className="sm:w-3 sm:h-3" /> مۆبایل و تابلێت</span>
                          <span className="text-stone-200 font-semibold font-mono">{mobilePercent}% ({mobileCount} جار)</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${mobilePercent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          {/* Interactive Genre Distribution list */}
          <div className="bg-[#101012] border border-stone-800/80 rounded-2xl p-4 sm:p-6">
            <div className="border-b border-stone-800 pb-2.5 mb-4 sm:mb-6 flex items-center justify-between flex-row-reverse">
              <h3 className="text-stone-100 text-xs sm:text-sm font-bold font-sans">🎭 جۆرەکانی فیلم (کلیک بکە بۆ فلتەرکردن)</h3>
              {selectedGenre && (
                <button 
                  onClick={() => setSelectedGenre(null)}
                  className="text-[9px] sm:text-[10px] text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer font-bold"
                >
                  نیشاندانی هەمووی
                </button>
              )}
            </div>

            {(() => {
              const genreCounts: { [key: string]: number } = {};
              movies.forEach(m => {
                if (m.genre) {
                  m.genre.split(/[,،]/).forEach(g => {
                    const cleanG = g.trim();
                    if (cleanG) {
                      genreCounts[cleanG] = (genreCounts[cleanG] || 0) + 1;
                    }
                  });
                }
              });

              const sortedGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10); // Top 10 genres

              const maxGenreCount = Math.max(...sortedGenres.map(g => g[1]), 1);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                  {/* Left panel */}
                  <div className="space-y-2 sm:space-y-3">
                    {sortedGenres.map(([genreName, count]) => {
                      const isSelected = selectedGenre === genreName;
                      const percent = (count / maxGenreCount) * 100;
                      return (
                        <div 
                          key={genreName}
                          onClick={() => setSelectedGenre(genreName === selectedGenre ? null : genreName)}
                          className={`p-2 sm:p-2.5 rounded-xl border border-stone-900 hover:bg-[#151518]/60 cursor-pointer transition-all flex items-center justify-between gap-3 sm:gap-4 flex-row-reverse text-right ${
                            isSelected ? "bg-[#1d1b13] border-yellow-500/40" : "bg-[#0c0c0e]/40"
                          }`}
                        >
                          <span className="text-[10px] sm:text-xs font-bold text-stone-200 min-w-[60px] sm:min-w-[70px] font-sans">{genreName}</span>
                          
                          <div className="flex-1 h-2 sm:h-2.5 bg-stone-900 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isSelected ? "bg-gradient-to-l from-yellow-500 to-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "bg-stone-800"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <span className="text-[10px] sm:text-xs text-stone-400 font-semibold font-mono min-w-[15px] sm:min-w-[20px] text-left">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right panel */}
                  <div className="bg-stone-950/40 rounded-2xl border border-stone-900 p-3 sm:p-4 min-h-[220px] sm:min-h-[300px] flex flex-col">
                    <h4 className="text-[10px] sm:text-xs font-bold text-stone-300 border-b border-stone-900 pb-2 mb-2.5 font-sans">
                      {selectedGenre ? `فیلمەکان لە جۆری: ${selectedGenre}` : "دەستپێک: فیلمە بڵاوکراوەکان بەپێی جۆر"}
                    </h4>
                    
                    {(() => {
                      const genreMovies = selectedGenre 
                        ? movies.filter(m => m.genre && m.genre.includes(selectedGenre))
                        : movies.slice(0, 5);

                      return (
                        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[200px] sm:max-h-[280px] pr-1">
                          {genreMovies.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-stone-500 text-[10px] sm:text-xs py-10">هیچ فیلمێک نەدۆزرایەوە.</div>
                          ) : (
                            genreMovies.map(m => (
                              <div key={m.id} className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-900/60 border border-stone-850 gap-2 sm:gap-3 flex-row-reverse text-right">
                                <div className="flex items-center gap-2 sm:gap-3 flex-row-reverse min-w-0">
                                  <img src={m.posterUrl} alt="" className="h-8 w-5 sm:h-9 sm:w-6 object-cover rounded border border-stone-800 bg-stone-950 shrink-0" referrerPolicy="no-referrer" />
                                  <div className="min-w-0">
                                    <h5 className="text-[11px] sm:text-xs font-semibold text-stone-200 truncate font-sans">{m.title}</h5>
                                    <p className="text-[9px] sm:text-[10px] text-stone-500 mt-0.5 font-sans">{m.category} • {m.year}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-yellow-500 text-[9px] sm:text-[10px] font-mono font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded-lg">⭐ {m.rating}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}
