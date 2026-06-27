"use client";

import { useState, useEffect, useCallback } from "react";
import { getAgreementsForUser } from "@/lib/firebase/firestore";
import { Agreement } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { canSeeAllAgreements, canViewAllOrgDeals } from "@/lib/utils/permissions";

export function useAgreements() {
  const { user, appUser } = useAuth();
  const [data, setData] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await getAgreementsForUser({
        canSeeAll: canSeeAllAgreements(appUser),
        email: user.email,
        company: appUser?.company,
        viewAllOrgDeals: canViewAllOrgDeals(appUser),
      });
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, [user, appUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
