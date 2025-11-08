import { format, parse } from 'date-fns';

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD)
 */
export const toISODate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Parses an ISO date string (YYYY-MM-DD) to Date object
 */
export const parseISODate = (str: string): Date => {
  return parse(str, 'yyyy-MM-dd', new Date());
};

/**
 * Formats a date for display (e.g., "Jan 15, 2024")
 */
export const formatDisplayDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

/**
 * Formats an ISO date string for display
 */
export const formatISODateForDisplay = (isoDate: string): string => {
  return formatDisplayDate(parseISODate(isoDate));
};

/**
 * Gets today's ISO date string
 */
export const getTodayISO = (): string => {
  return toISODate(new Date());
};

/**
 * Checks if a date string is valid ISO format
 */
export const isValidISODate = (str: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  
  try {
    const date = parseISODate(str);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};
