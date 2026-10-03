import { useEffect, useState } from 'react';
import { getImageUrl } from '../services/storage';

// Resuelve una key de R2 (o URL absoluta) a una URL mostrable. Devuelve null mientras carga o si no hay imagen.
export const useImageUrl = (path) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    getImageUrl(path).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [path]);

  return url;
};
