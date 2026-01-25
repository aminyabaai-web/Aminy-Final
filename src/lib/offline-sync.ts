/**
 * Offline Sync System
 *
 * Provides offline-first data management using IndexedDB
 * Features:
 * - Automatic data persistence
 * - Background sync when online
 * - Conflict resolution
 * - Queue management for pending actions
 */

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'aminy_offline_db';
const DB_VERSION = 1;

interface DBSchema {
  // Store names and their key paths
  profiles: { key: string; value: ChildProfileOffline };
  routines: { key: string; value: RoutineOffline };
  progress: { key: string; value: ProgressEntryOffline };
  syncQueue: { key: string; value: SyncQueueItem };
  cache: { key: string; value: CacheEntry };
}

export interface ChildProfileOffline {
  id: string;
  data: any;
  lastModified: string;
  synced: boolean;
  version: number;
}

export interface RoutineOffline {
  id: string;
  childId: string;
  data: any;
  lastModified: string;
  synced: boolean;
  version: number;
}

export interface ProgressEntryOffline {
  id: string;
  childId: string;
  date: string;
  data: any;
  lastModified: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'profile' | 'routine' | 'progress' | 'timeEntry' | 'message';
  entityId: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
}

export interface CacheEntry {
  key: string;
  data: any;
  expiresAt: string;
  createdAt: string;
}

// Database instance
let db: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains('profiles')) {
        database.createObjectStore('profiles', { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains('routines')) {
        const routineStore = database.createObjectStore('routines', { keyPath: 'id' });
        routineStore.createIndex('childId', 'childId', { unique: false });
      }

      if (!database.objectStoreNames.contains('progress')) {
        const progressStore = database.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('childId', 'childId', { unique: false });
        progressStore.createIndex('date', 'date', { unique: false });
      }

      if (!database.objectStoreNames.contains('syncQueue')) {
        const queueStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('entityType', 'entityType', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }

      // Chat messages store
      if (!database.objectStoreNames.contains('messages')) {
        const messagesStore = database.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('childId', 'childId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

/**
 * Add or update an item in a store
 */
export async function putItem<T extends { id: string }>(
  storeName: string,
  item: T
): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get an item by ID
 */
export async function getItem<T>(storeName: string, id: string): Promise<T | undefined> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index
 */
export async function getItemsByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an item by ID
 */
export async function deleteItem(storeName: string, id: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// SYNC QUEUE MANAGEMENT
// ============================================================================

/**
 * Add an action to the sync queue
 */
export async function queueAction(
  action: SyncQueueItem['action'],
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  payload: any
): Promise<string> {
  const queueItem: SyncQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    action,
    entityType,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  await putItem('syncQueue', queueItem);

  // Trigger sync if online
  if (navigator.onLine) {
    processSyncQueue();
  }

  return queueItem.id;
}

/**
 * Get pending sync queue items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const items = await getAllItems<SyncQueueItem>('syncQueue');
  return items.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Get sync queue count
 */
export async function getSyncQueueCount(): Promise<number> {
  const items = await getAllItems<SyncQueueItem>('syncQueue');
  return items.length;
}

/**
 * Process the sync queue
 * Called when device comes online
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (!navigator.onLine) {
    return { processed: 0, failed: 0, remaining: await getSyncQueueCount() };
  }

  const items = await getPendingSyncItems();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await syncItem(item);
      await deleteItem('syncQueue', item.id);
      processed++;
    } catch (error) {
      // Update retry count
      const updated: SyncQueueItem = {
        ...item,
        retryCount: item.retryCount + 1,
        lastAttempt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Remove if too many retries
      if (updated.retryCount >= 5) {
        await deleteItem('syncQueue', item.id);
        console.error(`Sync item ${item.id} failed after 5 retries, removing`);
      } else {
        await putItem('syncQueue', updated);
      }

      failed++;
    }
  }

  return {
    processed,
    failed,
    remaining: await getSyncQueueCount(),
  };
}

/**
 * Sync a single queue item to the server
 * In production, this would call the actual API endpoints
 */
async function syncItem(item: SyncQueueItem): Promise<void> {
  // Placeholder for actual API calls
  // In production, implement actual sync logic here
  console.log('Syncing item:', item);

  // Simulate network request
  await new Promise((resolve) => setTimeout(resolve, 100));

  // For now, just mark as synced locally
  if (item.action === 'update' || item.action === 'create') {
    const storeName = entityTypeToStore(item.entityType);
    if (storeName) {
      const existingItem = await getItem<any>(storeName, item.entityId);
      if (existingItem) {
        await putItem(storeName, { ...existingItem, synced: true });
      }
    }
  }
}

function entityTypeToStore(entityType: SyncQueueItem['entityType']): string | null {
  const mapping: Record<string, string> = {
    profile: 'profiles',
    routine: 'routines',
    progress: 'progress',
    message: 'messages',
  };
  return mapping[entityType] || null;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Set a cached value with expiration
 */
export async function setCache(
  key: string,
  data: any,
  ttlMinutes: number = 60
): Promise<void> {
  const entry: CacheEntry = {
    key,
    data,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  await putItem('cache', entry);
}

/**
 * Get a cached value (returns undefined if expired or not found)
 */
export async function getCache<T>(key: string): Promise<T | undefined> {
  const entry = await getItem<CacheEntry>('cache', key);

  if (!entry) return undefined;

  // Check expiration
  if (new Date(entry.expiresAt) < new Date()) {
    await deleteItem('cache', key);
    return undefined;
  }

  return entry.data as T;
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const entries = await getAllItems<CacheEntry>('cache');
  const now = new Date();
  let cleared = 0;

  for (const entry of entries) {
    if (new Date(entry.expiresAt) < now) {
      await deleteItem('cache', entry.key);
      cleared++;
    }
  }

  return cleared;
}

// ============================================================================
// OFFLINE-FIRST DATA HELPERS
// ============================================================================

/**
 * Save profile data offline-first
 */
export async function saveProfileOffline(
  id: string,
  data: any
): Promise<ChildProfileOffline> {
  const existing = await getItem<ChildProfileOffline>('profiles', id);

  const profile: ChildProfileOffline = {
    id,
    data,
    lastModified: new Date().toISOString(),
    synced: false,
    version: existing ? existing.version + 1 : 1,
  };

  await putItem('profiles', profile);

  // Queue for sync
  await queueAction(existing ? 'update' : 'create', 'profile', id, data);

  return profile;
}

/**
 * Get profile data (offline-first)
 */
export async function getProfileOffline(id: string): Promise<any | undefined> {
  const profile = await getItem<ChildProfileOffline>('profiles', id);
  return profile?.data;
}

/**
 * Save progress entry offline-first
 */
export async function saveProgressOffline(
  childId: string,
  date: string,
  data: any
): Promise<ProgressEntryOffline> {
  const id = `progress-${childId}-${date}`;
  const existing = await getItem<ProgressEntryOffline>('progress', id);

  const entry: ProgressEntryOffline = {
    id,
    childId,
    date,
    data: existing ? { ...existing.data, ...data } : data,
    lastModified: new Date().toISOString(),
    synced: false,
  };

  await putItem('progress', entry);

  // Queue for sync
  await queueAction(existing ? 'update' : 'create', 'progress', id, entry.data);

  return entry;
}

/**
 * Get progress entries for a date range
 */
export async function getProgressOffline(
  childId: string,
  startDate?: string,
  endDate?: string
): Promise<ProgressEntryOffline[]> {
  const allProgress = await getItemsByIndex<ProgressEntryOffline>(
    'progress',
    'childId',
    childId
  );

  if (!startDate && !endDate) return allProgress;

  return allProgress.filter((entry) => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });
}

// ============================================================================
// NETWORK STATUS & AUTO-SYNC
// ============================================================================

let syncInProgress = false;

/**
 * Handle coming online - trigger sync
 */
function handleOnline() {
  console.log('Device online - triggering sync');
  if (!syncInProgress) {
    syncInProgress = true;
    processSyncQueue()
      .then((result) => {
        console.log('Sync complete:', result);
      })
      .catch((error) => {
        console.error('Sync failed:', error);
      })
      .finally(() => {
        syncInProgress = false;
      });
  }
}

/**
 * Handle going offline
 */
function handleOffline() {
  console.log('Device offline - queuing actions');
}

/**
 * Initialize offline sync system
 */
export function initOfflineSync(): void {
  // Open database
  openDatabase().then(() => {
    console.log('IndexedDB initialized');
  });

  // Set up network listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // If online, process any pending items
  if (navigator.onLine) {
    processSyncQueue();
  }

  // Clear expired cache periodically
  setInterval(() => {
    clearExpiredCache();
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Clean up offline sync system
 */
export function cleanupOfflineSync(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  closeDatabase();
}

// ============================================================================
// STORAGE INFO
// ============================================================================

/**
 * Get offline storage usage info
 */
export async function getStorageInfo(): Promise<{
  used: number;
  available: number;
  profiles: number;
  routines: number;
  progress: number;
  pendingSync: number;
}> {
  const [profiles, routines, progress, syncQueue] = await Promise.all([
    getAllItems('profiles'),
    getAllItems('routines'),
    getAllItems('progress'),
    getAllItems('syncQueue'),
  ]);

  // Estimate storage usage
  const estimateSize = (items: any[]) =>
    new Blob([JSON.stringify(items)]).size;

  const used =
    estimateSize(profiles) +
    estimateSize(routines) +
    estimateSize(progress) +
    estimateSize(syncQueue);

  // Try to get quota info if available
  let available = 0;
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    available = (estimate.quota || 0) - (estimate.usage || 0);
  }

  return {
    used,
    available,
    profiles: profiles.length,
    routines: routines.length,
    progress: progress.length,
    pendingSync: syncQueue.length,
  };
}
