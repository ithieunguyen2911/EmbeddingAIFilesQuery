/**
 * Format utilities for dates and bytes
 */
import { formatDistanceToNow as dfnFormatDistanceToNow } from 'date-fns';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDistanceToNow(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dfnFormatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}
