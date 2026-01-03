"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { MigrationJob } from '@/lib/types';

interface ProgressTrackerProps {
  jobId: string;
  onComplete?: () => void;
}

export function ProgressTracker({ jobId, onComplete }: ProgressTrackerProps) {
  const [job, setJob] = useState<MigrationJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/migrate/status/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data);
        
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'partial') {
          if (onComplete) {
            onComplete();
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();
    
    // Poll every 2 seconds if job is still processing
    const interval = setInterval(() => {
      if (job?.status === 'processing' || job?.status === 'pending') {
        fetchJobStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Job not found
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = job.total > 0 ? (job.progress / job.total) * 100 : 0;
  const successCount = job.results.filter(r => r.status === 'success').length;
  const failureCount = job.results.filter(r => r.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Migration Job
              {job.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
              {job.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription>
              {job.type} migration from {job.source} to {job.destination}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                job.status === 'completed' ? 'default' :
                job.status === 'failed' ? 'destructive' :
                job.status === 'partial' ? 'secondary' :
                'outline'
              }
            >
              {job.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={fetchJobStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">
              {job.progress} / {job.total} items
            </span>
          </div>
          <Progress value={progressPercentage} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{job.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">{failureCount}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {job.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recent Results</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {job.results.slice(-5).reverse().map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted">
                  <span className="truncate flex-1">{result.sourceId}</span>
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {job.error && (
          <div className="text-sm text-red-600 p-2 rounded bg-red-50">
            {job.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

