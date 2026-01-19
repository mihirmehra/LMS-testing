/**
 * Date utility functions for handling DD-MM-YYYY format
 */

/**
 * Convert DD-MM-YYYY string to Date object
 */
export function parseDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null;

  // Try DD-MM-YYYY format first
  const ddmmyyyyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    
    // Validate that the date is actually valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Fallback: try parsing as ISO string or other formats
  const fallbackDate = new Date(dateString);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

/**
 * Format Date object to DD-MM-YYYY string
 */
export function formatToDDMMYYYY(date: Date | string | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Format Date object to DD-MM-YYYY HH:MM string
 */
export function formatToDDMMYYYYWithTime(date: Date | string | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
