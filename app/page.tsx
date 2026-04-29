"use client";

import { useState } from "react";
import type { AnimeEntry } from "./api/ptw/route";

interface UserEntry {
  id: number;
  value: string;
  source: "mal" | "al";
}

let nextId = 0;

function makeUser(source: "mal" | "al"): UserEntry {
  return { id: nextId++, value: "", source };
}

export default function Home() {
  const [users, setUsers] = useState<UserEntry[]>([makeUser("mal"), makeUser("al")]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnimeEntry[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const addUser = (source: "mal" | "al") =>
    setUsers((prev) => [...prev, makeUser(source)]);

  const removeUser = (id: number) =>
    setUsers((prev) => prev.filter((u) => u.id !== id));

  const updateUser = (id: number, value: string) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, value } : u)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    setErrors([]);
    setFetchError(null);

    const malUsers = users.filter((u) => u.source === "mal" && u.value.trim()).map((u) => u.value.trim());
    const alUsers = users.filter((u) => u.source === "al" && u.value.trim()).map((u) => u.value.trim());

    try {
      const res = await fetch("/api/ptw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ malUsers, alUsers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? "Unknown error");
      } else {
        setResults(data.results);
        setErrors(data.errors ?? []);
        setTotalUsers(data.totalUsers ?? 0);
      }
    } catch {
      setFetchError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AniFind</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Find anime in common across multiple users&apos; Plan to Watch lists from MyAnimeList and AniList.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                  user.source === "mal"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                }`}
              >
                {user.source === "mal" ? "MAL" : "AniList"}
              </span>
              <input
                type="text"
                placeholder={user.source === "mal" ? "MyAnimeList username" : "AniList username"}
                value={user.value}
                onChange={(e) => updateUser(user.id, e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {users.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeUser(user.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  aria-label="Remove"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => addUser("mal")}
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            + MAL user
          </button>
          <button
            type="button"
            onClick={() => addUser("al")}
            className="text-sm px-3 py-1.5 rounded-lg border border-teal-300 text-teal-700 dark:text-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
          >
            + AniList user
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto text-sm px-5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Find common anime"}
          </button>
        </div>
      </form>

      {fetchError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {fetchError}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300 flex flex-col gap-1">
          <span className="font-semibold">Some lists could not be fetched:</span>
          {errors.map((e, i) => <span key={i}>{e}</span>)}
        </div>
      )}

      {results !== null && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">
              {results.length === 0 ? "No anime in common" : `${results.length} anime in common`}
            </h2>
            {results.length > 0 && (
              <span className="text-sm text-gray-500">across {totalUsers} users&apos; PTW lists</span>
            )}
          </div>

          {results.length === 0 && (
            <p className="text-sm text-gray-500">None of the fetched lists share any plan-to-watch entries.</p>
          )}

          <ul className="flex flex-col gap-3">
            {results.map((anime) => (
              <li key={anime.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                {anime.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={anime.imageUrl}
                    alt={anime.title}
                    className="w-12 h-16 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={anime.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline line-clamp-2"
                  >
                    {anime.title}
                  </a>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {anime.users.join(", ")}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                  {anime.userCount}/{totalUsers}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
