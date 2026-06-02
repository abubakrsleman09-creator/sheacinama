import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import { Movie, MovieRequest, PlatformStats } from './src/types';

const app = express();
const PORT = 3000;
const MOVIES_FILE = path.join(process.cwd(), 'movies.json');
const REQUESTS_FILE = path.join(process.cwd(), 'movie_requests.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const LEGACY_DIR = path.join(process.cwd(), 'uploads');

// Ensure public uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Migrate legacy uploaded files to public folder to support static compilation bundle
if (fs.existsSync(LEGACY_DIR)) {
  try {
    const files = fs.readdirSync(LEGACY_DIR);
    for (const file of files) {
      const srcPath = path.join(LEGACY_DIR, file);
      const destPath = path.join(UPLOADS_DIR, file);
      if (fs.lstatSync(srcPath).isFile()) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (copyErr) {
          console.error(`Error copying ${file} to public uploads:`, copyErr);
        }
      }
    }
    console.log("Successfully migrated files from legacy uploads to public/uploads!");
  } catch (err) {
    console.error("Failed legacy uploads migration:", err);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper to save base64 image data physically to /uploads/ folder to keep movies.json tiny and clean
function saveBase64Image(dataUrl: string, prefix: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  try {
    const parts = dataUrl.split(';base64,');
    if (parts.length !== 2) {
      return dataUrl;
    }
    const mime = parts[0]; // e.g., "data:image/png"
    const base64Data = parts[1].replace(/\s/g, ''); // strip any newlines or spaces
    const ext = mime.split('/')[1] || 'png';
    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Failed to save base64 image physically:", error);
    return dataUrl;
  }
}

// Convert any existing base64 image strings inside movies.json to static files on server start
function sanitizeAndConvertBase64Movies() {
  const movies = readJsonFile<Movie[]>(MOVIES_FILE, []);
  let changed = false;

  const updated = movies.map((movie, index) => {
    let posterUrl = movie.posterUrl;
    let bannerUrl = movie.bannerUrl;

    if (posterUrl && posterUrl.startsWith('data:image/')) {
      const newUrl = saveBase64Image(posterUrl, `movie-${movie.id || index}-poster`);
      if (newUrl !== posterUrl) {
        posterUrl = newUrl;
        changed = true;
      }
    }

    if (bannerUrl && bannerUrl.startsWith('data:image/')) {
      const newUrl = saveBase64Image(bannerUrl, `movie-${movie.id || index}-banner`);
      if (newUrl !== bannerUrl) {
        bannerUrl = newUrl;
        changed = true;
      }
    }

    return {
      ...movie,
      posterUrl,
      bannerUrl
    };
  });

  if (changed) {
    console.log("Successfully converted base64 images inside movies.json to static /uploads/ files!");
    writeJsonFile(MOVIES_FILE, updated);
  }
}

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
    posterUrl: "/uploads/movie-movie-joker-2019-poster-1780414416218-9426.jpeg",
    bannerUrl: "/uploads/movie-movie-joker-2019-banner-1780414416219-2338.jpeg",
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
    posterUrl: "/uploads/movie-movie-1988-kurdish-poster-1780414524493-1647.png",
    bannerUrl: "https://www.zimihc.nl/content/uploads/2024/08/1988-film-960x540.jpg?x15409",
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
    posterUrl: "/uploads/movie-movie-war-machine-poster-1780414321363-2782.jpeg",
    bannerUrl: "/uploads/movie-movie-war-machine-banner-1780414321367-742.png",
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

// Convert legacy base64 entries to physical files in /uploads/
sanitizeAndConvertBase64Movies();

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

  const id = newMovieData.id || `movie-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Convert uploaded images if base64 to save local files inside uploads/ folder
  const savedPoster = newMovieData.posterUrl ? saveBase64Image(newMovieData.posterUrl, `movie-${id}-poster`) : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600";
  const savedBanner = newMovieData.bannerUrl ? saveBase64Image(newMovieData.bannerUrl, `movie-${id}-banner`) : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200";

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
    posterUrl: savedPoster,
    bannerUrl: savedBanner,
    servers: Array.isArray(newMovieData.servers) ? newMovieData.servers : [],
    createdAt: newMovieData.createdAt || new Date().toISOString()
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

  const updatedPoster = updatedData.posterUrl !== undefined ? saveBase64Image(updatedData.posterUrl, `movie-${id}-poster`) : existingMovie.posterUrl;
  const updatedBanner = updatedData.bannerUrl !== undefined ? saveBase64Image(updatedData.bannerUrl, `movie-${id}-banner`) : existingMovie.bannerUrl;

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
    posterUrl: updatedPoster,
    bannerUrl: updatedBanner,
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

// AI Autofill movies metadata using Gemini 3.5 Flash (translates and extracts specs seamlessly)
app.post('/api/autofill', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== 'ibos-808') {
    return res.status(403).json({ error: "تۆ ناتوانیت ئەم کارە بکەیت" });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "تکایە ناوی فیلمەکە بنووسە" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined, returning simulated metadata");
      return res.json({
        titleEnglish: title,
        titleKurdish: title,
        description: `کورتەی فیلمی ${title} (بۆ چالاکی فیلمەکان بەبێ کێشە، دەبێت کلیل لە بەشی Settings دابنرێت یاخود بە دەست پڕبکرێتەوە)`,
        category: "Action",
        rating: 7.5,
        year: 2026,
        duration: "1h 45m",
        posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600",
        bannerUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200"
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Search and extract complete info about the movie/series named "${title}". 
      Return accurate, professional cinematic metadata.
      - The 'description' field MUST be formatted in elegant Kurdish (Soranî) language, describing the storyline nicely in 2 or 3 sentences.
      - The 'titleKurdish' field is the translated title in Kurdish (Soranî/Kurdish characters) or transliterated if a direct translation doesn't exist.
      - Choose one of these categories only for the 'category' field: 'Action', 'Drama', 'Kurdish', 'Comedy', 'Horror', 'Anime', 'Adventure', 'History', 'Sci-Fi'.
      - For 'posterUrl' and 'bannerUrl', use a direct stock image links or general Unsplash tags based on the theme (e.g. Unsplash images with film, cinema, space, action keyword) if you do not have official ones. Dont leave them empty.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleEnglish: { type: Type.STRING, description: "Official English Title of the movie" },
            titleKurdish: { type: Type.STRING, description: "Kurdish written translation of the movie name" },
            description: { type: Type.STRING, description: "Beautiful Kurdish (Soranî) description summary of the movie" },
            category: { type: Type.STRING, description: "Genre category" },
            rating: { type: Type.NUMBER, description: "Movie Rating (e.g., 8.2)" },
            year: { type: Type.INTEGER, description: "Release year as an integer" },
            duration: { type: Type.STRING, description: "Duration string (e.g. '1h 50m' or '2h 10m')" },
            posterUrl: { type: Type.STRING, description: "Search Unsplash or online image URL for the poster" },
            bannerUrl: { type: Type.STRING, description: "Search Unsplash or online image URL for the banner/landscape" },
          },
          required: ["titleEnglish", "titleKurdish", "description", "category", "rating", "year", "duration"]
        }
      }
    });

    if (response?.text) {
      const result = JSON.parse(response.text.trim());
      if (!result.posterUrl) {
        result.posterUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600";
      }
      if (!result.bannerUrl) {
        result.bannerUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200";
      }
      return res.json(result);
    } else {
      throw new Error("Empty text returned from Gemini API");
    }

  } catch (err: any) {
    console.error("AI Auto-fill failed", err);
    res.status(500).json({ error: "سیستمی ژیری دەستکرد نەیتوانی زانیارییەکان ڕاکێشێت، تکایە بە دەست بنووسە" });
  }
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
