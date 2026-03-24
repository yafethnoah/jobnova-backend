import { useEffect, useState } from "react";
import { getJson } from "@/src/lib/localCache";

export function useCachedJson<T>(key: string | null | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        if (typeof key !== "string" || !key.trim()) {
          if (isMounted) setData(null);
          return;
        }
        const result = await getJson<T>(key);
        if (isMounted) setData(result);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void run();
    return () => {
      isMounted = false;
    };
  }, [key]);

  return { data, loading };
}
