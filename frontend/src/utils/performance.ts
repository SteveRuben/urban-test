import { useEffect, useState, type DependencyList } from "react";
// Fonction utilitaire pour extraire le message d'erreur
function getErrorMessage(error: unknown, defaultMessage: string = 'Une erreur est survenue'): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
}
// src/utils/performance.ts
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => void>(
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

export const useOptimizedFetch = <T>(
  fetchFn: () => Promise<T>,
  dependencies: DependencyList = [],
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
      } catch (err: unknown) {
        if (mounted) {
          if (retryCount < retries) {
            retryCount++;
            setTimeout(fetchData, retryDelay * retryCount);
          } else {
            setError(getErrorMessage(err));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, retries, retryDelay, cache, ...dependencies]);

  return { data, loading, error };
};