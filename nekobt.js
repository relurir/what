const mappings = fetch(
  atob("aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL1RoYVVua25vd24vYW5pbWUtbGlzdHMtdHMvcmVmcy9oZWFkcy9tYWluL2RhdGEvbmJ0LW1hcHBpbmcuanNvbg==")
).then(res => res.json());

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

  async _media({ tvdbId, tmdbId, imdbId, fetch }) {
    const map = await mappings;

    const nekoID =
      map?.tvdb?.[tvdbId] ??
      map?.tmdb?.[tmdbId] ??
      map?.imdb?.[imdbId];

    if (!nekoID) {
      throw new Error("No NekoBT mapping found for provided anime.");
    }

    const res = await fetch(this.url + `media/${nekoID}`);
    const json = await res.json();

    if (json.error) {
      throw new Error("NekoBT: " + json.message);
    }

    return {
      nekoID,
      data: json.data
    };
  }

  _map(entries, batch = false, high = true) {
    const results = entries?.data?.results;

    // ✅ FIX for "n is not iterable"
    if (!Array.isArray(results)) {
      return [];
    }

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

  async single({ tvdbId, tvdbEId, tmdbId, imdbId, episode, fetch }) {
    if (!navigator.onLine) return [];

    const { data, nekoID } = await this._media({
      tvdbId,
      tmdbId,
      imdbId,
      fetch
    });

    const ep =
      data?.episodes?.find(e => e.tvdbId === tvdbEId) ??
      data?.episodes?.find(e => e.episode === episode);

    let searchURL =
      `${this.url}torrents/search?media_id=${nekoID}` +
      `&fansub_lang=en%2Cenm&sub_lang=en%2Cenm`;

    if (ep?.id) {
      searchURL += `&episode_ids=${ep.id}`;
    }

    const res = await fetch(searchURL);
    const json = await res.json();

    if (json.error) {
      throw new Error("NekoBT: " + json.message);
    }

    return this._map(json, !!tvdbEId);
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
