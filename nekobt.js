const m = BigInt("1735689600000");

function idToInfo(id) {
  let r = BigInt(id);
  const i = (r >> 8n) + m;
  const n = (r >> 4n) & BigInt(15);
  const o = r & BigInt(15);

  return {
    time: Number(i),
    type: Number(n),
    increment: Number(o)
  };
}

export default new class NekoBT {
  url = atob("aHR0cHM6Ly9uZWtvYnQudG8vYXBpL3YxLw==");

  // ❌ REMOVED _media() completely (this was breaking everything)

  _map(entries, batch = false, high = true) {
    const results = entries?.data?.results;

    // ✅ prevents "n is not iterable"
    if (!Array.isArray(results)) return [];

    return results.map(entry => ({
      title: entry.title,
      link: `${this.url}torrents/${entry.id}/download?public=true`,
      seeders: Number(entry.seeders ?? 0),
      leechers: Number(entry.leechers ?? 0),
      downloads: Number(entry.completed ?? 0),
      hash: entry.infohash,
      size: Number(entry.filesize ?? 0),
      accuracy: high ? "high" : "medium",
      type: (entry.level ?? 0) >= 3 ? "alt" : undefined,
      date: entry.id ? new Date(idToInfo(entry.id).time) : null
    }));
  }

  async single({ tvdbId, tmdbId, imdbId, episode, fetch }) {
    if (!navigator.onLine) return [];

    const searchURL = new URL(this.url + "torrents/search");

    if (tmdbId) searchURL.searchParams.append("tmdb_id", tmdbId);
    if (tvdbId) searchURL.searchParams.append("tvdb_id", tvdbId);
    if (imdbId) searchURL.searchParams.append("imdb_id", imdbId);

    searchURL.searchParams.append("fansub_lang", "en,enm");
    searchURL.searchParams.append("sub_lang", "en,enm");

    if (episode != null) {
      searchURL.searchParams.append("episode", episode);
    }

    const res = await fetch(searchURL.toString());
    const json = await res.json();

    if (json.error) {
      throw new Error("NekoBT: " + json.message);
    }

    return this._map(json, false, true);
  }

  batch = this.single;
  movie = this.single;

  async test() {
    try {
      const res = await fetch(this.url + "announcements");
      if (!res.ok) throw new Error("API unreachable");
      return true;
    } catch (err) {
      throw new Error("Could not reach NekoBT API");
    }
  }
};
