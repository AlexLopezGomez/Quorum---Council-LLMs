import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getScoreBarColor(score) {
    if (score >= 0.7) return 'bg-verdict-pass';
    if (score >= 0.4) return 'bg-verdict-warn';
    return 'bg-verdict-fail';
}

export function getScoreTextColor(score) {
    if (score >= 0.7) return 'text-emerald-600';
    if (score >= 0.5) return 'text-amber-600';
    return 'text-red-600';
}

export function safeFixed(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return Number(value).toFixed(digits);
}

export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatRelative(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        console.warn('Failed to parse JSON:', err.message);
        return null;
    }
}
