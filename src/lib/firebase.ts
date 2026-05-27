export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: {
    providerId: string;
    email: string | null;
  }[];
  tenantId: string | null;
}

// Hardcoded default movies to seed if database is brand new
const defaultSeedMovies: Record<string, any> = {
  "movies/dark_knight": {
    id: "dark_knight",
    titleKu: "سوارچاکی تاریکی",
    titleEn: "The Dark Knight",
    category: "Action",
    year: 2008,
    duration: "2کژ 32خ",
    rating: 9.0,
    description: "کاتێک جۆکەر ئاژاوە لە گۆتهام دروست دەکات، باتمان تاقیکردنەوەیەکی قورسی مۆڕاڵی و جەستەیی دەکات بۆ پاراستنی شارەکەی.",
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    qualities: [
      { label: "1080p FHD", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
      { label: "720p HD", url: "https://www.w3schools.com/html/mov_bbb.mp4" }
    ],
    cast: [
      { name: "Christian Bale", role: "Bruce Wayne / Batman", imageUrl: "" },
      { name: "Heath Ledger", role: "Joker", imageUrl: "" }
    ],
    createdAt: new Date().toISOString()
  },
  "movies/interstellar": {
    id: "interstellar",
    titleKu: "نێوان ئەستێرەکان",
    titleEn: "Interstellar",
    category: "Drama",
    year: 2014,
    duration: "2کژ 49خ",
    rating: 8.7,
    description: "گەشتێکی مێژوویی و زانستی سەرنجڕاکێش بەناو کونێکی کرمیدا بۆ گەڕان بەدوای نیشتمانێکی نوێ بۆ مرۆڤایەتی لەناو ئەستێرەکاندا.",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZAZE3Tc",
    qualities: [
      { label: "1080p FHD", url: "https://www.w3schools.com/html/mov_bbb.mp4" },
      { label: "720p HD", url: "https://www.w3schools.com/html/mov_bbb.mp4" }
    ],
    cast: [
      { name: "Matthew McConaughey", role: "Cooper", imageUrl: "" },
      { name: "Anne Hathaway", role: "Brand", imageUrl: "" }
    ],
    createdAt: new Date().toISOString()
  },
  "movies/bitter_honey": {
    id: "bitter_honey",
    titleKu: "هەنگوینی تاڵ",
    titleEn: "Bitter Honey",
    category: "Kurdish",
    year: 2021,
    duration: "1کژ 45خ",
    rating: 8.5,
    description: "درامایەکی کۆمەڵایەتی و پڕ لە ململانێ لە یەکێک لە گوندەکانی کوردستان کە باس لە خۆشەویستی و کێشە کۆمەڵایەتییەکان دەکات.",
    posterUrl: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=500&auto=format&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    qualities: [
      { label: "1080p FHD", url: "https://www.w3schools.com/html/mov_bbb.mp4" }
    ],
    cast: [
      { name: "کوردستان ئەحمەد", role: "ئەکتەر", imageUrl: "" }
    ],
    createdAt: new Date().toISOString()
  }
};

let store: Record<string, any> = {};
try {
  const data = localStorage.getItem("sheacinema_local_db");
  if (data) {
    store = JSON.parse(data);
  } else {
    // Brand new local DB initialization
    store = {
      ...defaultSeedMovies,
      "admins/local-user-admin-123": {
        id: "local-user-admin-123",
        email: "abubakrsleman4@gmail.com",
        role: "owner",
        addedAt: new Date().toISOString()
      }
    };
    localStorage.setItem("sheacinema_local_db", JSON.stringify(store));
  }
} catch (e) {
  console.error("Local DB load failed:", e);
}

// Always ensure owner admin email is registered locally
if (!store["admins/local-user-admin-123"]) {
  store["admins/local-user-admin-123"] = {
    id: "local-user-admin-123",
    email: "abubakrsleman4@gmail.com",
    role: "owner",
    addedAt: new Date().toISOString()
  };
}

const listeners = new Set<() => void>();
function triggerListeners() {
  listeners.forEach(fn => {
    try { fn(); } catch(e) { console.error(e); }
  });
}

function saveStore() {
  try {
    localStorage.setItem("sheacinema_local_db", JSON.stringify(store));
  } catch (e) {
    console.error("Local DB save failed:", e);
  }
  triggerListeners();
}

// Auth mock implementations
export const googleProvider = { providerId: "google.com" };

let currentAuthUser: User | null = (() => {
  try {
    const saved = localStorage.getItem("local_auth_user");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  
  const isBypass = localStorage.getItem("admin_bypass_active") === "true";
  if (isBypass) {
    const adminUser: User = {
      uid: "bypass-admin",
      email: "abubakrsleman09@gmail.com",
      displayName: "بەڕێوەبەری سەرەکی",
      photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin",
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: "google.com", email: "abubakrsleman09@gmail.com" }],
      tenantId: null
    };
    localStorage.setItem("local_auth_user", JSON.stringify(adminUser));
    return adminUser;
  }

  // Default to a guest user so no account is ever required!
  const guestUser: User = {
    uid: "guest-user",
    email: "guest@sheacinema.com",
    displayName: "میوانی کاتی",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Guest",
    emailVerified: true,
    isAnonymous: true,
    providerData: [],
    tenantId: null
  };
  localStorage.setItem("local_auth_user", JSON.stringify(guestUser));
  return guestUser;
})();

const authListeners = new Set<(user: User | null) => void>();

export const auth = {
  get currentUser() {
    return currentAuthUser;
  }
};

export function onAuthStateChanged(authInstance: any, callback: (user: User | null) => void) {
  callback(currentAuthUser);
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

export async function signInWithPopup(authInstance: any, provider: any) {
  const user: User = {
    uid: "bypass-admin",
    email: "abubakrsleman09@gmail.com",
    displayName: "بەڕێوەبەری سەرەکی",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin",
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: "google.com", email: "abubakrsleman09@gmail.com" }],
    tenantId: null
  };
  currentAuthUser = user;
  localStorage.setItem("local_auth_user", JSON.stringify(user));
  localStorage.setItem("admin_bypass_active", "true");
  authListeners.forEach(cb => cb(user));
  return { user };
}

export async function signOut(authInstance: any) {
  const guestUser: User = {
    uid: "guest-user",
    email: "guest@sheacinema.com",
    displayName: "میوانی کاتی",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Guest",
    emailVerified: true,
    isAnonymous: true,
    providerData: [],
    tenantId: null
  };
  currentAuthUser = guestUser;
  localStorage.setItem("local_auth_user", JSON.stringify(guestUser));
  localStorage.removeItem("admin_bypass_active");
  authListeners.forEach(cb => cb(guestUser));
}

// Database references
export const db = {};

export class DocumentReference {
  constructor(public path: string) {}
  get id() {
    return this.path.split('/').pop() || '';
  }
}

export class CollectionReference {
  constructor(public path: string) {}
  get id() {
    return this.path.split('/').pop() || '';
  }
}

export class Query {
  constructor(public collectionPath: string, public constraints: any[] = []) {}
}

export class DocumentSnapshot {
  constructor(
    public id: string,
    private _data: any | undefined,
    public ref: DocumentReference
  ) {}
  exists() {
    return this._data !== undefined;
  }
  data() {
    return this._data;
  }
}

export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
  forEach(callback: (doc: DocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

export function collection(parent: any, ...pathSegments: string[]) {
  let parentPath = '';
  if (parent instanceof DocumentReference) {
    parentPath = parent.path;
  } else if (parent instanceof CollectionReference) {
    parentPath = parent.path;
  }
  const fullSegments = parentPath ? [parentPath, ...pathSegments] : pathSegments;
  const cleaned: string[] = [];
  for (const s of fullSegments) {
    if (s && typeof s === 'string') cleaned.push(s);
  }
  return new CollectionReference(cleaned.join('/'));
}

export function doc(parent: any, ...pathSegments: string[]) {
  let parentPath = '';
  if (parent instanceof CollectionReference) {
    parentPath = parent.path;
  } else if (parent instanceof DocumentReference) {
    parentPath = parent.path;
  }
  const fullSegments = parentPath ? [parentPath, ...pathSegments] : pathSegments;
  const cleaned: string[] = [];
  for (const s of fullSegments) {
    if (s && typeof s === 'string') cleaned.push(s);
  }
  return new DocumentReference(cleaned.join('/'));
}

export function query(collectionRef: any, ...constraints: any[]) {
  const path = collectionRef instanceof CollectionReference ? collectionRef.path : String(collectionRef);
  return new Query(path, constraints);
}

// Constraints
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(num: number) {
  return { type: 'limit', value: num };
}

export function where(field: string, operator: string, value: any) {
  return { type: 'where', field, operator, value };
}

export function serverTimestamp() {
  return { _isTimestamp: true, toDate: () => new Date(), toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
}

export function arrayUnion(...elements: any[]) {
  return { _isArrayUnion: true, elements };
}

export function arrayRemove(...elements: any[]) {
  return { _isArrayRemove: true, elements };
}

// Helpers
function hydrateTimestamps(val: any): any {
  if (!val) return val;
  if (Array.isArray(val)) {
    return val.map(hydrateTimestamps);
  }
  if (typeof val === 'object') {
    if (val._isTimestamp) {
      return {
        ...val,
        toDate: () => new Date(val.millis || Date.now())
      };
    }
    if ('seconds' in val && 'nanoseconds' in val) {
      return {
        ...val,
        toDate: () => new Date((val.seconds || 0) * 1000)
      };
    }
    if (typeof val === 'string' && (val.includes('T') || !isNaN(Date.parse(val)))) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return {
          toDate: () => d,
          seconds: Math.floor(d.getTime() / 1000),
          nanoseconds: 0
        };
      }
    }
    const result: any = {};
    for (const key of Object.keys(val)) {
      result[key] = hydrateTimestamps(val[key]);
    }
    return result;
  }
  return val;
}

function processMutations(data: any, existingObj: any = {}): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(v => processMutations(v));
  }
  if (typeof data === 'object') {
    if (data._isTimestamp) {
      return new Date().toISOString();
    }
    if (data._isArrayUnion) {
      const orig = Array.isArray(existingObj) ? existingObj : [];
      const newItems = data.elements;
      const merged = [...orig];
      for (const item of newItems) {
        if (!merged.includes(item)) merged.push(item);
      }
      return merged;
    }
    if (data._isArrayRemove) {
      const orig = Array.isArray(existingObj) ? existingObj : [];
      const removeItems = data.elements;
      return orig.filter((x: any) => !removeItems.includes(x));
    }
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = processMutations(data[key], existingObj[key]);
    }
    return result;
  }
  return data;
}

// Read implementations
function getDocLocalSync(docRef: DocumentReference) {
  const raw = store[docRef.path];
  const data = raw ? hydrateTimestamps(JSON.parse(JSON.stringify(raw))) : undefined;
  return new DocumentSnapshot(docRef.id, data, docRef);
}

export async function getDoc(docRef: DocumentReference) {
  return getDocLocalSync(docRef);
}

export async function getDocFromServer(docRef: DocumentReference) {
  return getDocLocalSync(docRef);
}

function getDocsLocalSync(ref: any) {
  const collPath = ref instanceof Query ? ref.collectionPath : ref.path;
  const constraints = ref instanceof Query ? ref.constraints : [];
  
  const prefix = `${collPath}/`;
  const docSnapshots: DocumentSnapshot[] = [];
  
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith(prefix)) {
      const relativePath = key.slice(prefix.length);
      if (!relativePath.includes('/')) {
        const id = relativePath;
        const data = hydrateTimestamps(JSON.parse(JSON.stringify(value)));
        docSnapshots.push(new DocumentSnapshot(id, data, new DocumentReference(key)));
      }
    }
  }
  
  let results = docSnapshots;
  
  for (const c of constraints) {
    if (c.type === 'where') {
      const { field, operator, value } = c;
      results = results.filter(snap => {
        const d = snap.data();
        if (!d) return false;
        const val = d[field];
        if (operator === '==') return val === value;
        if (operator === '!=') return val !== value;
        if (operator === '>') return val > value;
        if (operator === '>=') return val >= value;
        if (operator === '<') return val < value;
        if (operator === '<=') return val <= value;
        if (operator === 'array-contains') {
          return Array.isArray(val) && val.includes(value);
        }
        return true;
      });
    }
  }
  
  for (const c of constraints) {
    if (c.type === 'orderBy') {
      const { field, direction } = c;
      results.sort((a, b) => {
        const valA = a.data()?.[field];
        const valB = b.data()?.[field];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }
  
  for (const c of constraints) {
    if (c.type === 'limit') {
      results = results.slice(0, c.value);
    }
  }
  
  return new QuerySnapshot(results);
}

export async function getDocs(queryOrCollectionRef: any) {
  return getDocsLocalSync(queryOrCollectionRef);
}

export function onSnapshot(ref: any, callback: (snapshot: any) => void, onError?: (error: any) => void) {
  const run = () => {
    try {
      if (ref instanceof DocumentReference) {
        callback(getDocLocalSync(ref));
      } else {
        callback(getDocsLocalSync(ref));
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };
  
  run();
  listeners.add(run);
  return () => {
    listeners.delete(run);
  };
}

// Write implementations
export async function addDoc(collectionRef: CollectionReference, data: any) {
  const id = Math.random().toString(36).substring(2, 15);
  const docPath = `${collectionRef.path}/${id}`;
  const processed = processMutations(data);
  processed.id = id;
  store[docPath] = processed;
  saveStore();
  return new DocumentReference(docPath);
}

export async function setDoc(docRef: DocumentReference, data: any) {
  const processed = processMutations(data);
  if (!processed.id) {
    processed.id = docRef.id;
  }
  store[docRef.path] = processed;
  saveStore();
}

export async function updateDoc(docRef: DocumentReference, data: any) {
  const existing = store[docRef.path] || {};
  const processed = processMutations(data, existing);
  store[docRef.path] = { ...existing, ...processed };
  saveStore();
}

export async function deleteDoc(docRef: DocumentReference) {
  delete store[docRef.path];
  const prefix = `${docRef.path}/`;
  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) {
      delete store[key];
    }
  }
  saveStore();
}

export function writeBatch(dbInstance: any) {
  const operations: (() => void)[] = [];
  return {
    set(docRef: DocumentReference, data: any) {
      operations.push(() => {
        const processed = processMutations(data);
        if (!processed.id) {
          processed.id = docRef.id;
        }
        store[docRef.path] = processed;
      });
    },
    update(docRef: DocumentReference, data: any) {
      operations.push(() => {
        const existing = store[docRef.path] || {};
        const processed = processMutations(data, existing);
        store[docRef.path] = { ...existing, ...processed };
      });
    },
    delete(docRef: DocumentReference) {
      operations.push(() => {
        delete store[docRef.path];
        const prefix = `${docRef.path}/`;
        for (const key of Object.keys(store)) {
          if (key.startsWith(prefix)) {
            delete store[key];
          }
        }
      });
    },
    async commit() {
      operations.forEach(op => op());
      saveStore();
    }
  };
}

// Operations types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Local DB Error handles: ', error, operationType, path);
  throw error;
}
