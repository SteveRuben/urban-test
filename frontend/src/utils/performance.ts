import { useEffect, useState } from "react";

// src/utils/performance.ts
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Hook pour les requêtes API optimisées
export const useOptimizedFetch = <T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    retries?: number;
    retryDelay?: number;
    cache?: boolean;
  } = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { retries = 3, retryDelay = 1000, cache = true } = options;

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchFn();
        
        if (mounted) {
          setData(result);
          
          // Cache en localStorage si activé
          if (cache) {
            const cacheKey = `cache_${JSON.stringify(dependencies)}`;
            localStorage.setItem(cacheKey, JSON.stringify({
              data: result,
              timestamp: Date.now()
            }));
          }
        }
      } catch (err: any) {
        if (mounted) {
          if (retryCount < retries) {
            retryCount++;
            setTimeout(fetchData, retryDelay * retryCount);
          } else {
            setError(err.message || 'Une erreur est survenue');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Vérifier le cache d'abord
    if (cache) {
      const cacheKey = `cache_${JSON.stringify(dependencies)}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const isStale = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
          
          if (!isStale) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        } catch {
          // Cache corrompu, continuer avec la requête
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { data, loading, error };
};