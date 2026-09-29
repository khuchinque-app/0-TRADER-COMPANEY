// Guest account ID management
// Stable userId stored in localStorage for demo purposes

const STORAGE_KEY = 'trading_user_id';

export function getOrCreateUserId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }
  
  // Generate new stable ID
  const newId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}

export function clearUserId(): void {
  localStorage.removeItem(STORAGE_KEY);
}
