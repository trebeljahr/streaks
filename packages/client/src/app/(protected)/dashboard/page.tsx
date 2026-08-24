"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const itemsQuery = trpc.items.list.useQuery({ limit: 20 });
  const createMutation = trpc.items.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      itemsQuery.refetch();
    },
  });
  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ title: title.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Manage your items</p>
      </div>

      {/* Create item form */}
      <form onSubmit={handleCreate} className="flex gap-4" data-testid="create-item-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title"
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          data-testid="item-title-input"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          data-testid="item-description-input"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          data-testid="create-item-submit"
        >
          {createMutation.isPending ? "Creating..." : "Create"}
        </button>
      </form>

      {/* Items list */}
      {itemsQuery.isLoading ? (
        <p className="text-muted-foreground">Loading items...</p>
      ) : itemsQuery.data?.items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="no-items">
          No items yet. Create one above!
        </p>
      ) : (
        <div className="space-y-2" data-testid="items-list">
          {itemsQuery.data?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border p-4"
              data-testid={`item-${item.id}`}
            >
              <div>
                <h3 className="font-medium">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate({ id: item.id })}
                disabled={deleteMutation.isPending}
                className="text-sm text-destructive hover:underline"
                data-testid={`delete-item-${item.id}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
