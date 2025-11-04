/**
 * Offline Queue Manager
 *
 * Manages queuing of voice commands when offline using IndexedDB
 * Automatically syncs when connection is restored
 */

export interface QueuedCommand {
  id: string;
  transcript: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  error?: string;
}

const DB_NAME = 'VoiceCommandQueue';
const DB_VERSION = 1;
const STORE_NAME = 'commands';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_COUNT = 3;

/**
 * Offline Queue Manager class
 */
export class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private onQueueChange: ((count: number) => void) | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');

        // Clean up old commands
        this.cleanupOldCommands();

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  /**
   * Queue a command
   */
  async queueCommand(transcript: string): Promise<string> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const command: QueuedCommand = {
      id: this.generateId(),
      transcript,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(command);

      request.onsuccess = () => {
        console.log('Command queued', command.id);
        this.notifyQueueChange();
        resolve(command.id);
      };

      request.onerror = () => {
        console.error('Failed to queue command', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all queued commands
   */
  async getQueuedCommands(): Promise<QueuedCommand[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get queued commands', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get pending commands count
   */
  async getPendingCount(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.count('pending');

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get pending count', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update command status
   */
  async updateCommandStatus(
    id: string,
    status: 'pending' | 'syncing' | 'failed',
    error?: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const command = getRequest.result;

        if (!command) {
          reject(new Error('Command not found'));
          return;
        }

        command.status = status;
        if (error) {
          command.error = error;
        }

        if (status === 'failed') {
          command.retryCount++;
        }

        const updateRequest = store.put(command);

        updateRequest.onsuccess = () => {
          this.notifyQueueChange();
          resolve();
        };

        updateRequest.onerror = () => {
          reject(updateRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Delete command
   */
  async deleteCommand(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Command deleted', id);
        this.notifyQueueChange();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete command', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Process queue (sync with server)
   */
  async processQueue(
    processFunction: (transcript: string) => Promise<void>
  ): Promise<{ success: number; failed: number }> {
    const commands = await this.getQueuedCommands();
    const pendingCommands = commands.filter((cmd) => cmd.status === 'pending');

    let success = 0;
    let failed = 0;

    for (const command of pendingCommands) {
      // Skip if max retries exceeded
      if (command.retryCount >= MAX_RETRY_COUNT) {
        console.warn('Max retries exceeded for command', command.id);
        await this.deleteCommand(command.id);
        failed++;
        continue;
      }

      try {
        // Update status to syncing
        await this.updateCommandStatus(command.id, 'syncing');

        // Process command
        await processFunction(command.transcript);

        // Delete command on success
        await this.deleteCommand(command.id);
        success++;
      } catch (error: any) {
        console.error('Failed to process command', command.id, error);

        // Update status to failed
        await this.updateCommandStatus(command.id, 'failed', error.message);
        failed++;
      }
    }

    console.log('Queue processing complete', { success, failed });
    return { success, failed };
  }

  /**
   * Clear all commands
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Queue cleared');
        this.notifyQueueChange();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear queue', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Cleanup old commands (older than 24 hours)
   */
  async cleanupOldCommands(): Promise<void> {
    if (!this.db) {
      return;
    }

    const commands = await this.getQueuedCommands();
    const now = Date.now();
    let cleaned = 0;

    for (const command of commands) {
      if (now - command.timestamp > MAX_AGE_MS) {
        await this.deleteCommand(command.id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old commands`);
    }
  }

  /**
   * Set queue change callback
   */
  setOnQueueChange(callback: (count: number) => void): void {
    this.onQueueChange = callback;
  }

  /**
   * Notify queue change
   */
  private async notifyQueueChange(): Promise<void> {
    if (this.onQueueChange) {
      const count = await this.getPendingCount();
      this.onQueueChange(count);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default OfflineQueueManager;
