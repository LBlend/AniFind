# AniFind

Quick app that claude made for me and my friends to figure out to watch

Find anime that appear in multiple users' Plan to Watch lists, across MyAnimeList and AniList.

## Setup

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `MAL_CLIENT_ID` | Yes | MyAnimeList API client ID |

**Getting a MAL client ID:**
1. Go to [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
2. Create a new app — select "other" for app type
3. Copy the **Client ID** (not the secret) into `.env.local`

AniList does not require an API key.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
