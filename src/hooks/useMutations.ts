"use client";

import { useState } from "react";
import {
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";

export function useMutations(collectionName: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const id = await createDocument(collectionName, data);
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, data: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await updateDocument(collectionName, id, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteDocument(collectionName, id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { create, update, remove, saving, error };
}
