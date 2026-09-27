// The season-end DAO keepsake (melvincarvalho/tideholm#193): who held how much of a Tideholm
// season DAO, and what the Cape Wars sidechain says each holder received for it — one sat a share,
// in a transaction that carries its own note. No DOM here: the page draws, this reads.
//
// The book is the Tideholm API's word. The keepsake is the chain's: a payment to the holder's
// did:nostr address (the same key, the chain's prefix) in a transaction whose OP_RETURN reads
// `Tideholm S<season> DAO keepsake: <shares> shares`. When a season names its treasury, only a
// payment that spends the treasury's coins counts.

export const WALLET = 'https://cdn.jsdelivr.net/gh/sidestr/wallet@01f26c33d4a0c3f65b1c061de5899de2f4f1917a/wallet.mjs'; // sidestr 0.0.7
export const EXPLORER = 'https://sidestr.com/explorer/';

export const SEASONS = {
  6: { chain: 'sidestr:capewars-s6', book: 'https://nostr.social/tideholm/api/dao', treasury: null }, // the treasury is named when the season ends
};

export const NOTE = /^Tideholm S(\d+) DAO keepsake: (\d+) shares/;
export const noteText = (season, shares) => `Tideholm S${season} DAO keepsake: ${shares} shares`;

export const pubOf = (did) => { const m = /^(?:did:nostr:)?([0-9a-f]{64})$/i.exec(String(did ?? '').trim()); return m ? m[1].toLowerCase() : null; };
export const medalOf = (rank) => (['gold', 'silver', 'bronze'][rank - 1] ?? 'sea');
export const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? `${n}th` : `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`);
export const txUrl = (chain, txid) => `${EXPLORER}?chain=${encodeURIComponent(chain)}#/tx/${txid}`;
export const addressUrl = (chain, address) => `${EXPLORER}?chain=${encodeURIComponent(chain)}#/address/${address}`;

// The book: holders by shares, ranked, with their did:nostr keys.
export async function loadBook(season, fetchImpl = fetch) {
  const s = SEASONS[season];
  if (!s) throw new Error(`no season ${season}`);
  const d = await (await fetchImpl(s.book, { cache: 'no-store' })).json();
  if (d.season !== Number(season)) throw new Error(`the book is for season ${d.season}, not ${season}`);
  const holders = [...(d.holders ?? [])].sort((a, b) => b.shares - a.shares)
    .map((h, i) => ({ ...h, pub: pubOf(h.key), rank: i + 1, medal: medalOf(i + 1) }));
  return { season: d.season, supply: d.supply, sold: d.sold, opened: d.opened, holders };
}

// The note in an OP_RETURN output, if there is one: 6a <len> data, or 6a 4c <len> data past 75 bytes.
export function opReturnText(scriptHex) {
  const h = String(scriptHex ?? '').toLowerCase();
  if (!h.startsWith('6a') || h.length < 4) return null;
  let at = 2, len = parseInt(h.slice(at, at + 2), 16); at += 2;
  if (len === 0x4c) { len = parseInt(h.slice(at, at + 2), 16); at += 2; }
  const hex = h.slice(at, at + len * 2);
  if (hex.length !== len * 2) return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16))); } catch { return null; }
}

export function keepsakeNote(tx) {
  for (const o of tx.outputs ?? []) { const t = opReturnText(o.scriptPubKey); const m = t && NOTE.exec(t); if (m) return { text: t, season: Number(m[1]), shares: Number(m[2]) }; }
  return null;
}

export const openChain = async (season, onProgress) => {
  const { openWallet } = await import(WALLET);
  return openWallet({ chain: SEASONS[season].chain, onProgress });
};

// What the chain says a holder received: the first payment to their address whose transaction carries
// this season's note (and, once the treasury is named, spends the treasury). `verified` when the sats
// paid, the note and the book all agree.
export function keepsakeOf(w, season, holder) {
  const { script, address } = w.identityOf(holder.pub);
  const treasury = SEASONS[season].treasury ? w.resolveTo(SEASONS[season].treasury).script : null;
  for (const o of w.ex.byScript.get(script)?.outputs ?? []) {
    const t = w.ex.txs.get(o.txid);
    if (!t) continue;
    const note = keepsakeNote(t.tx);
    if (!note || note.season !== Number(season)) continue;
    const fromTreasury = treasury ? t.tx.inputs.some((i) => w.ex.txs.get(i.prevout.txid)?.tx.outputs[i.prevout.vout]?.scriptPubKey === treasury) : null;
    if (treasury && !fromTreasury) continue;
    return { address, txid: o.txid, height: o.height, sats: o.value, note, fromTreasury,
      verified: o.value === holder.shares && note.shares === holder.shares && fromTreasury !== false };
  }
  return { address, txid: null };
}
