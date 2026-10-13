"use client";

import { useEffect, useRef, useState } from "react";
import { searchFoods } from "@/features/food-search/services/foodSearchService";
import type { FoodResult } from "@/features/food-search/types";

export function useFoodSearch(query: string) {
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await searchFoods(query));
        setOpen(true);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Could not search foods.");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading, open, error, setOpen };
}
