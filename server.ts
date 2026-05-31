import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Movie, MovieRequest, PlatformStats } from './src/types';

const app = express();
const PORT = 3000;
const MOVIES_FILE = path.join(process.cwd(), 'movies.json');
const REQUESTS_FILE = path.join(process.cwd(), 'movie_requests.json');

app.use(express.json({ limit: '50mb' }));

// Helper to read JSON file safely
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

// Helper to write JSON file safely
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Initial Movie Seeds (Matching images provided by user)
const initialMovies: Movie[] = [
  {
    id: "movie-joker-2019",
    titleKurdish: "جۆکەر",
    titleEnglish: "Joker",
    description: "چیرۆکی فیلمەکە لە ساڵی ١٩٨١ دەست پێدەکات لە شاری گۆسەم کاتێک ئارسەر فلێک کەسێکی گۆشەگیر و تەنهایە و باری دەرونی تەواو نیە دەیەوێت ببێتە لێهاتوو لە کۆمیدیا بەڵام بەهۆی ڕووداوە دڵتەزێنەکانەوە دەبێتە پاشای تاوان و هاوڵاتیەکی دێوانە.",
    contentType: "movie",
    category: "Drama",
    rating: 8.4,
    year: 2019,
    duration: "2h 2m",
    isFeatured: true,
    posterUrl: "https://images.unsplash.com/photo-1559583985-c80d8ad9b29f?auto=format&fit=crop&q=80&w=600",
    bannerUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200",
    servers: [
      { id: "server-1", name: "FASTER-SERVER (VIP)", url: "https://www.youtube.com/embed/zAGVQLH3QPc" },
      { id: "server-2", name: "OK.RU PLAYER", url: "https://ok.ru/videoembed/2042780355157" },
      { id: "server-3", name: "SHEA-STREAM (High Speed)", url: "https://vjs.zencdn.net/v/oceans.mp4" }
    ],
    isPinned: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "movie-1988-kurdish",
    titleKurdish: "١٩٨٨",
    titleEnglish: "1988",
    description: "فیلمێکی درامی مێژوویی و تراژیدی کوردییە کە باس لە کارەساتی کیمیابارانکردنی شاری هەڵەبجە دەکات لەلایەن ڕژێمی پێشووی بەعس، گێڕانەوەی بەسەرهاتی هاوڵاتیانی بێتاوان لە ڕۆژانی کارەساتەکەکەدا.",
    contentType: "movie",
    category: "Kurdish",
    rating: 6.9,
    year: 2024,
    duration: "1h 20m",
    isFeatured: false,
    posterUrl: "https://images.unsplash.com/photo-1543536448-d209d2d13a1c?auto=format&fit=crop&q=80&w=600",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200",
    servers: [
      { id: "server-1", name: "SHEA-STREAM 1", url: "https://www.youtube.com/embed/T0Z8vYt2I50" },
      { id: "server-2", name: "VIP SERVER", url: "https://vjs.zencdn.net/v/oceans.mp4" }
    ],
    isPinned: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "movie-war-machine",
    titleKurdish: "جەنگی جیهانی ٢٠٢٦",
    titleEnglish: "War Machine 2026",
    description: "لە ئەفغانستاندا، سەرکردەیەکی بێناو دەبێتە پاڵەوانی سەرەکی لە پارێزگاریکردنی خاکەکەی بەرامبەر سوپایەکی گەورە و پیشەیی. ئەم فیلمە تێکەڵەیەکە لە ئاکشن، جوڵە و تاکتیکە مۆدێرنەکانی شەڕ.",
    contentType: "movie",
    category: "Action",
    rating: 6.1,
    year: 2026,
    duration: "1h 40m",
    isFeatured: false,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600",
    bannerUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200",
    servers: [
      { id: "server-1", name: "Vidsrc Player", url: "https://vjs.zencdn.net/v/oceans.mp4" },
      { id: "server-2", name: "Direct Link (HD)", url: "https://vjs.zencdn.net/v/oceans.mp4" }
    ],
    isPinned: false,
    createdAt: new Date().toISOString()
  }
];

const initialRequests: MovieRequest[] = [
  {
    id: "req-1",
    movieTitle: "Interstellar",
    contentType: "movie",
    requesterName: "ئاراس فەرەج",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "pending"
  },
  {
    id: "req-2",
    movieTitle: "Breaking Bad Season 1",
    contentType: "series",
    requesterName: "دیار هێرش",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "completed"
  }
];

// Initialize DB files if not present
if (!fs.existsSync(MOVIES_FILE)) {
  writeJsonFile(MOVIES_FILE, initialMovies);
}
if (!fs.existsSync(REQUESTS_FILE)) {
  writeJsonFile(REQUESTS_FILE, initialRequests);
}

// ----------------------
// BACKEND API ENDPOINTS
// ----------------------

// 1. Get all movies and series
app.get('/api/movies', (req, res) => {
  const movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  res.json(movies);
});

// 2. Add new movie / series (Admin)
app.post('/api/movies', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت، تەنها بۆ ئەدمین ڕێگەپێدراوە" });
  }

  const movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  const newMovieData = req.body;

  if (!newMovieData.titleKurdish || !newMovieData.titleEnglish) {
    return res.status(400).json({ error: "تکایە ناوی فیلمەکە بە کوردی و ئینگلیزی بنووسە" });
  }

  const id = `movie-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newMovie: Movie = {
    id,
    titleKurdish: newMovieData.titleKurdish,
    titleEnglish: newMovieData.titleEnglish,
    description: newMovieData.description || "",
    contentType: newMovieData.contentType || "movie",
    category: newMovieData.category || "Action",
    rating: parseFloat(newMovieData.rating) || 7.0,
    year: parseInt(newMovieData.year) || new Date().getFullYear(),
    duration: newMovieData.duration || "1h 40m",
    isFeatured: !!newMovieData.isFeatured,
    isPinned: !!newMovieData.isPinned,
    posterUrl: newMovieData.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600",
    bannerUrl: newMovieData.bannerUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200",
    servers: Array.isArray(newMovieData.servers) ? newMovieData.servers : [],
    createdAt: new Date().toISOString()
  };

  // If this movie is set as featured, turn off other featured flags to keep it premium
  if (newMovie.isFeatured) {
    movies.forEach(m => { m.isFeatured = false; });
  }

  movies.unshift(newMovie);
  writeJsonFile(MOVIES_FILE, movies);
  res.status(201).json(newMovie);
});

// 3. Update existing movie / series (Admin)
app.put('/api/movies/:id', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت" });
  }

  const { id } = req.params;
  const movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  const movieIndex = movies.findIndex(m => m.id === id);

  if (movieIndex === -1) {
    return res.status(404).json({ error: "فیلمەکە نەدۆزرایەوە" });
  }

  const updatedData = req.body;
  const existingMovie = movies[movieIndex];

  const updatedMovie: Movie = {
    ...existingMovie,
    titleKurdish: updatedData.titleKurdish ?? existingMovie.titleKurdish,
    titleEnglish: updatedData.titleEnglish ?? existingMovie.titleEnglish,
    description: updatedData.description ?? existingMovie.description,
    contentType: updatedData.contentType ?? existingMovie.contentType,
    category: updatedData.category ?? existingMovie.category,
    rating: updatedData.rating !== undefined ? parseFloat(updatedData.rating) : existingMovie.rating,
    year: updatedData.year !== undefined ? parseInt(updatedData.year) : existingMovie.year,
    duration: updatedData.duration ?? existingMovie.duration,
    isFeatured: updatedData.isFeatured !== undefined ? !!updatedData.isFeatured : existingMovie.isFeatured,
    isPinned: updatedData.isPinned !== undefined ? !!updatedData.isPinned : existingMovie.isPinned,
    posterUrl: updatedData.posterUrl ?? existingMovie.posterUrl,
    bannerUrl: updatedData.bannerUrl ?? existingMovie.bannerUrl,
    servers: Array.isArray(updatedData.servers) ? updatedData.servers : existingMovie.servers,
  };

  if (updatedMovie.isFeatured && !existingMovie.isFeatured) {
    movies.forEach(m => { m.isFeatured = false; });
  }

  movies[movieIndex] = updatedMovie;
  writeJsonFile(MOVIES_FILE, movies);
  res.json(updatedMovie);
});

// 4. Delete movie / series (Admin)
app.delete('/api/movies/:id', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت" });
  }

  const { id } = req.params;
  let movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  const initialLength = movies.length;
  movies = movies.filter(m => m.id !== id);

  if (movies.length === initialLength) {
    return res.status(404).json({ error: "فیلمەکە نەدۆزرایەوە" });
  }

  writeJsonFile(MOVIES_FILE, movies);
  res.json({ success: true, message: "فیلمەکە بە سەرکەوتوویی سڕایەوە" });
});

// 5. Submit user movie request
app.post('/api/requests', (req, res) => {
  const { movieTitle, contentType, requesterName } = req.body;
  if (!movieTitle) {
    return res.status(400).json({ error: "تکایە ناوی فیلم ڕوونکەرەوە" });
  }

  const requests = readJsonFile<MovieRequest[]>(REQUESTS_FILE, []);
  const newRequest: MovieRequest = {
    id: `req-${Date.now()}`,
    movieTitle,
    contentType: contentType || 'movie',
    requesterName: requesterName || 'بەکارهێنەر',
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  requests.unshift(newRequest);
  writeJsonFile(REQUESTS_FILE, requests);
  res.status(201).json(newRequest);
});

// 6. Get all movie requests (Admin Only / Auth protected)
app.get('/api/requests', (req, res) => {
  const requests = readJsonFile<MovieRequest[]>(REQUESTS_FILE, []);
  res.json(requests);
});

// 7. Update status of a request (Admin Only)
app.put('/api/requests/:id', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت" });
  }

  const { id } = req.params;
  const { status } = req.body;
  const requests = readJsonFile<MovieRequest[]>(REQUESTS_FILE, []);
  const reqIndex = requests.findIndex(r => r.id === id);

  if (reqIndex === -1) {
    return res.status(404).json({ error: "داواکارییەکە نەدۆزرایەوە" });
  }

  requests[reqIndex].status = status || 'completed';
  writeJsonFile(REQUESTS_FILE, requests);
  res.json(requests[reqIndex]);
});

// 8. Delete a movie request (Admin Only)
app.delete('/api/requests/:id', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت" });
  }

  const { id } = req.params;
  let requests = readJsonFile<MovieRequest[]>(REQUESTS_FILE, []);
  requests = requests.filter(r => r.id !== id);
  writeJsonFile(REQUESTS_FILE, requests);
  res.json({ success: true });
});

// 9. Get Platform Statistics
app.get('/api/stats', (req, res) => {
  const movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  const requests = readJsonFile<MovieRequest[]>(REQUESTS_FILE, []);

  const totalMovies = movies.filter(m => m.contentType === 'movie').length;
  const totalSeries = movies.filter(m => m.contentType === 'series').length;
  const totalRequests = requests.filter(r => r.status === 'pending').length;
  const totalServersCount = movies.reduce((acc, m) => acc + (m.servers?.length || 0), 0);

  const stats: PlatformStats = {
    totalMovies,
    totalSeries,
    totalRequests,
    totalServersCount
  };

  res.json(stats);
});


// ----------------------------------------
// VITE OR STATIC STATIC SHIELD IN Express
// ----------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static output
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shea Cinema server running on http://localhost:${PORT}`);
  });
}

startServer();
