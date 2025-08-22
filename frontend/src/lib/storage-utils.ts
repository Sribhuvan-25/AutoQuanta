/**
 * Storage utilities for managing localStorage quota
 */

export function clearPersistStorage(): void {
  try {
    // Clear redux persist storage
    localStorage.removeItem('persist:autoquanta');
    
    // Clear other large items that might be stored
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('file_content_') || key.startsWith('dataset_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Cleared localStorage to free up space');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

export function getStorageUsage(): { used: number; available: number } {
  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }
    
    // Estimate available space (5MB is typical localStorage limit)
    const estimatedLimit = 5 * 1024 * 1024; // 5MB in characters
    
    return {
      used: totalSize,
      available: estimatedLimit - totalSize
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, available: 0 };
  }
}

export function isStorageQuotaExceeded(): boolean {
  const { available } = getStorageUsage();
  return available < 100000; // Less than 100KB available
}

export function handleQuotaExceededError(): void {
  console.warn('localStorage quota exceeded, clearing cache...');
  clearPersistStorage();
  
  // Reload the page to reset the application state
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}