import { NextRequest, NextResponse } from "next/server";

export interface AnimeEntry {
  id: string;
  title: string;
  imageUrl: string;
  url: string;
  users: string[];
  userCount: number;
}

interface MalAnime {
  node: {
    id: number;
    title: string;
    main_picture?: { medium: string; large: string };
  };
}

interface AniListMedia {
  mediaId: number;
  media: {
    id: number;
    idMal: number | null;
    title: { romaji: string; english: string | null };
    coverImage: { medium: string };
    siteUrl: string;
  };
}

async function fetchMalPtw(username: string): Promise<Map<string, { title: string; imageUrl: string; url: string }>> {
  const result = new Map<string, { title: string; imageUrl: string; url: string }>();
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(username)}/animelist?status=plan_to_watch&limit=${limit}&offset=${offset}&fields=id,title,main_picture`;
    const res = await fetch(url, {
      headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID ?? "" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status === 404) throw new Error(`MAL user "${username}" not found`);
      if (res.status === 403) throw new Error(`MAL user "${username}" has a private list`);
      throw new Error(`MAL API error for "${username}": ${res.status}`);
    }

    const data = await res.json();
    const items: MalAnime[] = data.data ?? [];

    for (const item of items) {
      const key = `mal:${item.node.id}`;
      result.set(key, {
        title: item.node.title,
        imageUrl: item.node.main_picture?.medium ?? "",
        url: `https://myanimelist.net/anime/${item.node.id}`,
      });
    }

    if (!data.paging?.next) break;
    offset += limit;
  }

  return result;
}

const ANILIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME, status: PLANNING) {
    lists {
      entries {
        mediaId
        media {
          id
          idMal
          title { romaji english }
          coverImage { medium }
          siteUrl
        }
      }
    }
  }
}`;

async function fetchAniListPtw(username: string): Promise<Map<string, { title: string; imageUrl: string; url: string }>> {
  const result = new Map<string, { title: string; imageUrl: string; url: string }>();

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { username } }),
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`AniList API error for "${username}": ${res.status}`);

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors[0]?.message ?? "Unknown error";
    if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("invalid")) {
      throw new Error(`AniList user "${username}" not found`);
    }
    throw new Error(`AniList error for "${username}": ${msg}`);
  }

  const lists = json.data?.MediaListCollection?.lists ?? [];
  for (const list of lists) {
    for (const entry of (list.entries as AniListMedia[])) {
      // Use MAL ID as the key when available so cross-platform entries match
      const key = entry.media.idMal ? `mal:${entry.media.idMal}` : `al:${entry.mediaId}`;
      result.set(key, {
        title: entry.media.title.english ?? entry.media.title.romaji,
        imageUrl: entry.media.coverImage.medium,
        url: entry.media.siteUrl,
      });
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const malUsers: string[] = (body.malUsers ?? []).map((u: string) => u.trim()).filter(Boolean);
  const alUsers: string[] = (body.alUsers ?? []).map((u: string) => u.trim()).filter(Boolean);

  if (malUsers.length + alUsers.length < 2) {
    return NextResponse.json({ error: "Please provide at least 2 usernames total." }, { status: 400 });
  }

  // Map from anime key -> { info, users[] }
  const animeMap = new Map<string, { title: string; imageUrl: string; url: string; users: string[] }>();

  const addEntries = (username: string, entries: Map<string, { title: string; imageUrl: string; url: string }>) => {
    for (const [key, info] of entries) {
      const existing = animeMap.get(key);
      if (existing) {
        existing.users.push(username);
      } else {
        animeMap.set(key, { ...info, users: [username] });
      }
    }
  };

  const errors: string[] = [];

  const malResults = await Promise.allSettled(malUsers.map(fetchMalPtw));
  malResults.forEach((r, i) => {
    if (r.status === "fulfilled") addEntries(`${malUsers[i]} (MAL)`, r.value);
    else errors.push((r.reason as Error).message);
  });

  const alResults = await Promise.allSettled(alUsers.map(fetchAniListPtw));
  alResults.forEach((r, i) => {
    if (r.status === "fulfilled") addEntries(`${alUsers[i]} (AniList)`, r.value);
    else errors.push((r.reason as Error).message);
  });

  const totalUsers = malResults.filter(r => r.status === "fulfilled").length +
    alResults.filter(r => r.status === "fulfilled").length;

  if (totalUsers < 2) {
    return NextResponse.json({ error: errors.join(" ") || "Could not fetch any lists." }, { status: 400 });
  }

  const results: AnimeEntry[] = Array.from(animeMap.entries())
    .filter(([, v]) => v.users.length > 1)
    .map(([id, v]) => ({ id, ...v, userCount: v.users.length }))
    .sort((a, b) => b.userCount - a.userCount || a.title.localeCompare(b.title));

  return NextResponse.json({ results, errors, totalUsers });
}
