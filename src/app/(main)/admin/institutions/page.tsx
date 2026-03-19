"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  isAdmin: boolean;
}

interface Institution {
  id: string;
  name: string;
  country: string | null;
  website: string | null;
  createdAt: string;
}

export default function InstitutionsPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCountry, setCreateCountry] = useState("");
  const [createWebsite, setCreateWebsite] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<User>("/api/auth/me"),
      api.get<Institution[]>("/api/institutions"),
    ])
      .then(([user, insts]) => {
        if (!user.isAdmin) {
          router.push("/admin");
          return;
        }
        setInstitutions(insts);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreating(true);
    try {
      const inst = await api.post<Institution>("/api/institutions", {
        name: createName.trim(),
        country: createCountry.trim() || null,
        website: createWebsite.trim() || null,
      });
      setInstitutions((prev) => [inst, ...prev]);
      setCreateName("");
      setCreateCountry("");
      setCreateWebsite("");
      setShowCreate(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create institution";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(inst: Institution) {
    setEditingId(inst.id);
    setEditName(inst.name);
    setEditCountry(inst.country || "");
    setEditWebsite(inst.website || "");
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patch<Institution>(`/api/institutions/${id}`, {
        name: editName.trim(),
        country: editCountry.trim() || null,
        website: editWebsite.trim() || null,
      });
      setInstitutions((prev) =>
        prev.map((inst) => (inst.id === id ? updated : inst))
      );
      setEditingId(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update institution";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Delete institution "${name}"? Courses linked to this institution will have their institution removed.`
      )
    )
      return;
    setDeletingId(id);
    try {
      await api.delete(`/api/institutions/${id}`);
      setInstitutions((prev) => prev.filter((inst) => inst.id !== id));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete institution";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Admin Dashboard
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
          <p className="mt-1 text-sm text-gray-500">
            {institutions.length} institution
            {institutions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Add Institution
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4"
        >
          <h3 className="mb-3 text-sm font-medium text-gray-900">
            New Institution
          </h3>
          {createError && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}
          <div className="space-y-3">
            <input
              type="text"
              required
              placeholder="Institution name *"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Country"
                value={createCountry}
                onChange={(e) => setCreateCountry(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="url"
                placeholder="Website URL"
                value={createWebsite}
                onChange={(e) => setCreateWebsite(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Institutions List */}
      {institutions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">No institutions yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Country
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Website
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  {editingId === inst.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSave(inst.id);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      </td>
                      <td className="hidden px-6 py-3 sm:table-cell">
                        <input
                          type="text"
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="hidden px-6 py-3 md:table-cell">
                        <input
                          type="url"
                          value={editWebsite}
                          onChange={(e) => setEditWebsite(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSave(inst.id)}
                            disabled={saving}
                            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {inst.name}
                      </td>
                      <td className="hidden px-6 py-4 text-sm text-gray-500 sm:table-cell">
                        {inst.country || "\u2014"}
                      </td>
                      <td className="hidden px-6 py-4 text-sm md:table-cell">
                        {inst.website ? (
                          <a
                            href={inst.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            {inst.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(inst)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(inst.id, inst.name)}
                            disabled={deletingId === inst.id}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === inst.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
