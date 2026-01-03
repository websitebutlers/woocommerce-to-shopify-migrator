import { MigrationJob, MigrationResult, Platform } from '../types';
import { saveMigrationJob, getMigrationJob, logMigration } from '../db';
import { v4 as uuidv4 } from 'uuid';

// In-memory queue for MVP (can be replaced with Redis/BullMQ for production)
class MigrationQueue {
  private jobs: Map<string, MigrationJob> = new Map();
  private processing: Set<string> = new Set();

  createJob(
    type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost' | 'attribute' | 'tag' | 'shipping' | 'tax',
    source: Platform,
    destination: Platform,
    items: string[]
  ): MigrationJob {
    const job: MigrationJob = {
      id: uuidv4(),
      type,
      source,
      destination,
      items,
      status: 'pending',
      progress: 0,
      total: items.length,
      results: [],
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    saveMigrationJob(job);
    
    return job;
  }

  getJob(id: string): MigrationJob | null {
    // Try memory first, then database
    const memoryJob = this.jobs.get(id);
    if (memoryJob) return memoryJob;
    
    return getMigrationJob(id);
  }

  updateJob(id: string, updates: Partial<MigrationJob>): void {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, updates);
    saveMigrationJob(job);
  }

  async processJob(
    id: string,
    processor: (itemId: string) => Promise<{ success: boolean; destinationId?: string; error?: string }>
  ): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || this.processing.has(id)) {
      return;
    }

    this.processing.add(id);
    this.updateJob(id, { status: 'processing' });

    logMigration(id, 'info', `Starting migration job for ${job.total} items`);

    const results: MigrationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < job.items.length; i++) {
      const itemId = job.items[i];
      
      try {
        logMigration(id, 'info', `Processing item ${i + 1}/${job.total}: ${itemId}`);
        
        const result = await processor(itemId);
        
        results.push({
          sourceId: itemId,
          destinationId: result.destinationId,
          status: result.success ? 'success' : 'failed',
          error: result.error,
        });

        if (result.success) {
          successCount++;
          logMigration(id, 'info', `Successfully migrated item ${itemId}`, { destinationId: result.destinationId });
        } else {
          failureCount++;
          logMigration(id, 'error', `Failed to migrate item ${itemId}`, { error: result.error });
        }
      } catch (error: any) {
        failureCount++;
        results.push({
          sourceId: itemId,
          status: 'failed',
          error: error.message || 'Unknown error',
        });
        logMigration(id, 'error', `Exception while migrating item ${itemId}`, { error: error.message });
      }

      // Update progress
      this.updateJob(id, {
        progress: i + 1,
        results,
      });
    }

    // Mark as completed
    const finalStatus = failureCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial';
    
    this.updateJob(id, {
      status: finalStatus,
      progress: job.total,
      results,
      completedAt: new Date(),
    });

    logMigration(
      id,
      'info',
      `Migration job completed: ${successCount} succeeded, ${failureCount} failed`,
      { successCount, failureCount }
    );

    this.processing.delete(id);
  }

  isProcessing(id: string): boolean {
    return this.processing.has(id);
  }

  getAllJobs(): MigrationJob[] {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
export const migrationQueue = new MigrationQueue();

