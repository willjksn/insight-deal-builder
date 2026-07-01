"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getProductionBoardByProject,
  saveProductionBoard,
  subscribeProductionBoardByProject,
} from "@/lib/firebase/productionFirestore";
import { createEmptyProductionDay } from "@/lib/production/defaults";
import {
  deriveKeyContactsFromBoard,
  keyContactsEmpty,
  mergeKeyContacts,
} from "@/lib/production/callSheetContacts";
import { bookedLocations } from "@/lib/production/locationSync";
import { moveShotBetweenDays } from "@/lib/production/splitShotsAcrossDays";
import { ProductionBoard, ProductionDay } from "@/lib/production/types";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import { useDocument } from "@/hooks/useDocument";
import { Project } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { canManageProjects, canUseShotScout } from "@/lib/utils/permissions";

export function useProductionDayPage(projectId: string, dayId: string) {
  const router = useRouter();
  const { appUser } = useAuth();
  const { data: project, loading: projectLoading } = useDocument<Project>("projects", projectId);
  const projectAccess = useProjectAccess(projectId, project?.ownerUserId);
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEditRef = useRef(false);
  const savingRef = useRef(false);
  const contactsSyncedRef = useRef(false);

  const allowed =
    canUseShotScout(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;
  const canEditShots =
    canUseShotScout(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;
  const canEditSchedule =
    canUseShotScout(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction;

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    if (!projectId || !allowed) return;
    let unsub: (() => void) | undefined;
    setLoading(true);
    getProductionBoardByProject(projectId)
      .then((loaded) => {
        if (loaded) setBoard(loaded);
        unsub = subscribeProductionBoardByProject(
          projectId,
          (remote) => {
            if (!remote || localEditRef.current || savingRef.current) return;
            setBoard(remote);
          },
          () => undefined
        );
      })
      .finally(() => setLoading(false));
    return () => unsub?.();
  }, [projectId, allowed]);

  const day = board?.productionDays.find((d) => d.id === dayId);
  const sortedDays = board
    ? [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)
    : [];
  const boardBookedLocations = board ? bookedLocations(board) : [];

  const saveBoard = useCallback(async (nextBoard: ProductionBoard) => {
    setBoard(nextBoard);
    setSaving(true);
    try {
      const { id, createdAt, updatedAt: _updatedAt, ...rest } = nextBoard;
      await saveProductionBoard(id, rest);
    } finally {
      setSaving(false);
    }
  }, []);

  const persistDay = useCallback(
    (nextDay: ProductionDay) => {
      if (!board) return;
      localEditRef.current = true;
      const nextBoard = {
        ...board,
        productionDays: board.productionDays.map((d) =>
          d.id === nextDay.id ? nextDay : d
        ),
      };
      setBoard(nextBoard);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const { id, createdAt, updatedAt: _updatedAt, ...rest } = nextBoard;
          await saveProductionBoard(id, rest);
        } finally {
          setSaving(false);
          localEditRef.current = false;
        }
      }, 600);
    },
    [board]
  );

  const persistBoard = useCallback(
    (nextBoard: ProductionBoard) => {
      localEditRef.current = true;
      setBoard(nextBoard);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const { id, createdAt, updatedAt: _updatedAt, ...rest } = nextBoard;
          await saveProductionBoard(id, rest);
        } finally {
          setSaving(false);
          localEditRef.current = false;
        }
      }, 600);
    },
    []
  );

  const patchDay = useCallback(
    (patch: Partial<ProductionDay>) => {
      if (!day) return;
      persistDay({ ...day, ...patch });
    },
    [day, persistDay]
  );

  useEffect(() => {
    contactsSyncedRef.current = false;
  }, [dayId]);

  useEffect(() => {
    if (!board || !day || contactsSyncedRef.current) return;
    if (!keyContactsEmpty(day)) return;
    const merged = mergeKeyContacts(day, deriveKeyContactsFromBoard(board));
    const changed =
      merged.producerName !== day.producerName ||
      merged.adName !== day.adName ||
      merged.directorName !== day.directorName ||
      merged.dpName !== day.dpName;
    if (!changed) return;
    contactsSyncedRef.current = true;
    persistDay(merged);
  }, [board, day, persistDay]);

  const addProductionDay = async () => {
    if (!board) return;
    const newDay = createEmptyProductionDay(board.productionDays.length + 1);
    const nextBoard = {
      ...board,
      productionDays: [...board.productionDays, newDay],
    };
    await saveBoard(nextBoard);
    router.push(`/projects/${projectId}/production/days/${newDay.id}`);
  };

  const removeProductionDay = async (id: string) => {
    if (!board || board.productionDays.length <= 1) return;
    const removing = board.productionDays.find((d) => d.id === id);
    if (removing && removing.shots.length > 0) {
      const ok = window.confirm(
        `Remove Day ${removing.dayNumber}? It has ${removing.shots.length} shot(s) — they will be lost unless you move them first. Continue?`
      );
      if (!ok) return;
    } else if (!window.confirm("Remove this production day and its call sheet?")) {
      return;
    }

    const remaining = board.productionDays
      .filter((d) => d.id !== id)
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((d, index) => ({ ...d, dayNumber: index + 1 }));

    const nextBoard = { ...board, productionDays: remaining };
    await saveBoard(nextBoard);

    if (id === dayId) {
      router.push(`/projects/${projectId}/production/days/${remaining[0].id}`);
    }
  };

  const moveShotToDay = useCallback(
    (shotId: string, targetDayId: string) => {
      if (!board || !day) return;
      const nextDays = moveShotBetweenDays(board, shotId, day.id, targetDayId);
      if (!nextDays) return;
      persistBoard({ ...board, productionDays: nextDays });
    },
    [board, day, persistBoard]
  );

  const applyProductionDays = useCallback(
    (nextDays: ProductionDay[]) => {
      if (!board) return;
      persistBoard({ ...board, productionDays: nextDays });
    },
    [board, persistBoard]
  );

  return {
    project,
    board,
    day,
    sortedDays,
    boardBookedLocations,
    loading: projectLoading || loading || projectAccess.loading,
    saving,
    allowed,
    canEditShots,
    canEditSchedule,
    patchDay,
    persistDay,
    persistBoard,
    moveShotToDay,
    applyProductionDays,
    addProductionDay,
    removeProductionDay,
  };
}
