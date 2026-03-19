"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  isAdmin: boolean;
}

interface MessagePack {
  id: string;
  name: string;
  messages: number;
  price: string;
  isActive: boolean;
  createdAt: string;
}

export default function MessagePacksPage() {
  const router = useRouter();
  const [packs, setPacks] = useState<MessagePack[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createMessages, setCreateMessages] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMessages, setEditMessages] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete/toggle state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<User>("/api/auth/me"),
      api.get<MessagePack[]>("/api/message-packs?admin=true"),
    ])
      .then(([user, data]) => {
        if (!user.isAdmin) {
          router.push("/admin");
          return;
        }
        setPacks(data);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    const msgs = parseInt(createMessages);
    const price = parseFloat(createPrice);

    if (!createName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    if (!msgs || msgs <= 0) {
      setCreateError("Messages must be a positive number.");
      return;
    }
    if (!price || price <= 0) {
      setCreateError("Price must be a positive number.");
      return;
    }

    setCreating(true);
    try {
      const pack = await api.post<MessagePack>("/api/message-packs", {
        name: createName.trim(),
        messages: msgs,
        price,
      });
      setPacks((prev) => [...prev, pack]);
      setCreateName("");
      setCreateMessages("");
      setCreatePrice("");
      setShowCreate(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create message pack";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(pack: MessagePack) {
    setEditingId(pack.id);
    setEditName(pack.name);
    setEditMessages(String(pack.messages));
    setEditPrice(pack.price);
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return;
    const msgs = parseInt(editMessages);
    const price = parseFloat(editPrice);
    if (!msgs || msgs <= 0 || !price || price <= 0) return;

    setSaving(true);
    try {
      const updated = await api.patch<MessagePack>(`/api/message-packs/${id}`, {
        name: editName.trim(),
        messages: msgs,
        price,
      });
      setPacks((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update message pack";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(pack: MessagePack) {
    setTogglingId(pack.id);
    try {
      const updated = await api.patch<MessagePack>(
        `/api/message-packs/${pack.id}`,
        {
          isActive: !pack.isActive,
        }
      );
      setPacks((prev) => prev.map((p) => (p.id === pack.id ? updated : p)));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to toggle status";
      alert(message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete message pack "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/message-packs/${id}`);
      setPacks((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete message pack";
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
          <h1 className="text-2xl font-bold text-gray-900">Message Packs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {packs.length} pack{packs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Add Pack
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4"
        >
          <h3 className="mb-3 text-sm font-medium text-gray-900">
            New Message Pack
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
              placeholder="Pack name *"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                required
                min="1"
                placeholder="Number of messages *"
                value={createMessages}
                onChange={(e) => setCreateMessages(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="Price *"
                value={createPrice}
                onChange={(e) => setCreatePrice(e.target.value)}
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

      {/* Packs List */}
      {packs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">No message packs yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {packs.map((pack) => (
                <tr key={pack.id} className="hover:bg-gray-50">
                  {editingId === pack.id ? (
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
                              handleSave(pack.id);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          min="1"
                          value={editMessages}
                          onChange={(e) => setEditMessages(e.target.value)}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-gray-400">--</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSave(pack.id)}
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
                        {pack.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {pack.messages}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {parseFloat(pack.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(pack)}
                          disabled={togglingId === pack.id}
                          className="group flex items-center gap-2"
                        >
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              pack.isActive ? "bg-green-500" : "bg-gray-300"
                            } ${togglingId === pack.id ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                                pack.isActive
                                  ? "translate-x-4"
                                  : "translate-x-0"
                              }`}
                            />
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              pack.isActive
                                ? "text-green-700"
                                : "text-gray-500"
                            }`}
                          >
                            {pack.isActive ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(pack)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(pack.id, pack.name)}
                            disabled={deletingId === pack.id}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === pack.id ? "..." : "Delete"}
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
