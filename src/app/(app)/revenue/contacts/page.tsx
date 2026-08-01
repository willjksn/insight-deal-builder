"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueCreateContact,
  revenueDeleteContact,
  revenueListContacts,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueContact } from "@/lib/revenueOpportunities/types/contact";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function RevenueContactsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);
  const [contacts, setContacts] = useState<RevenueContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await revenueListContacts(() => user.getIdToken());
      setContacts(res.contacts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Contacts"
        subtitle="Shared CRM identities across opportunities, outreach, and clients."
      />
      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {canManage ? (
        <Card className="mb-6">
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button
              size="touch"
              disabled={busy || !name.trim()}
              onClick={async () => {
                if (!user) return;
                setBusy(true);
                setError(null);
                try {
                  await revenueCreateContact(() => user.getIdToken(), {
                    name: name.trim(),
                    email: email.trim() || undefined,
                    companyName: companyName.trim() || undefined,
                    title: title.trim() || undefined,
                  });
                  setName("");
                  setEmail("");
                  setCompanyName("");
                  setTitle("");
                  await reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not create");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Opps</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!loading && contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-slate-500">
                  No contacts yet. Save one from an opportunity or add manually.
                </td>
              </tr>
            ) : null}
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  {c.title ? <p className="text-xs text-slate-500">{c.title}</p> : null}
                </td>
                <td className="px-4 py-3 text-slate-700">{c.companyName || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{c.email || c.phone || "—"}</td>
                <td className="px-4 py-3">
                  {(c.opportunityIds ?? []).length ? (
                    <Link
                      href={`/revenue/opportunities/${c.opportunityIds[0]}`}
                      className="text-sky-700 hover:underline"
                    >
                      {c.opportunityIds.length}
                    </Link>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        if (!user) return;
                        setBusy(true);
                        try {
                          await revenueDeleteContact(() => user.getIdToken(), c.id);
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Delete failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
