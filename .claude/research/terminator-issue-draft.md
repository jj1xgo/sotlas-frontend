# upstream 打診 issue ドラフト

- 投稿先: https://github.com/manuelkasper/sotlas-frontend/issues/new
- 投稿方法: Web UI（スクリーンショット2枚をドラッグ＆ドロップで本文中の指定位置へ）
- 署名: なし（外部リポジトリのため）

---

**Title:**

```
Feature proposal: day/night terminator (greyline) overlay on the map
```

**Body:**

```markdown
Would you be interested in an optional day/night terminator overlay for the map?

**What it does**

- Shades the night side of the earth, in four steps from light to dark: civil, nautical and astronomical twilight, and full night (sun below -18°)
- Updates every minute based on the current time
- Off by default; toggled in the map options panel alongside the other overlays
- An info icon next to the toggle explains the twilight bands

**Why**

Greyline propagation is of obvious interest to activators and chasers alike —
this makes it easy to see at a glance where the terminator currently runs when
planning or watching long-distance S2S and DX contacts.

**Implementation notes**

- No new dependencies: sun position and twilight band polygons are computed in a
  small self-contained utility (`src/utils/terminator.js`), rendered as GeoJSON
  fill layers
- No backend changes

（ここに terminator-map.png をドラッグ＆ドロップ）

（ここに terminator-dialog.png をドラッグ＆ドロップ）

This is already implemented and working in my fork
([jj1xgo/sotlas-frontend@feat/night-terminator](https://github.com/jj1xgo/sotlas-frontend/tree/feat/night-terminator)).
If you like the idea, I'd be happy to clean it up and open a PR.
```
