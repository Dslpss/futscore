import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all FutScore cache
export const clearCache = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith('futscore_cache_'));
    
    console.log(`[CACHE] Clearing ${cacheKeys.length} cache entries...`);
    await AsyncStorage.multiRemove(cacheKeys);
    console.log('[CACHE] Cache cleared successfully!');
    
    return true;
  } catch (error) {
    console.error('[CACHE] Error clearing cache:', error);
    return false;
  }
};
