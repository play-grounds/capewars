# Cape Wars keepsakes

https://play-grounds.github.io/capewars/ — a trophy for every holder of a Tideholm season DAO.

When a season ends, each holder of its DAO receives **one sat a share** on that season's Cape Wars
sidechain (`sidestr:capewars-s<season>`), paid to the address of their own `did:nostr` key (the same
key, the chain's `cape` prefix), in a transaction whose OP_RETURN reads:

    Tideholm S<season> DAO keepsake: <shares> shares

The page reads the book from the Tideholm API (`/tideholm/api/dao`: holders, their keys, their shares)
and the keepsakes from the chain itself, through the sidestr wallet pinned at 0.0.7. A trophy says
**minted** when a payment with this season's note reached the holder's address, and **book and chain
agree** when the sats, the note and the book all say the same number. Until the season ends it shows
the book alone, as **reserved**. Once a season's treasury is named in `keepsake.mjs`, only payments
that spend the treasury count.

The coins are test coins with no value. A keepsake is a collectible, not the season's prize.

- `keepsake.mjs` — the logic, no DOM: `loadBook`, `openChain`, `keepsakeOf`, `opReturnText`.
- `index.html` — the trophy for one holder (`?season=6&did=did:nostr:<hex>`, or **Show mine** with a
  nostr extension) and the hall of every holder.

The plan is [melvincarvalho/tideholm#193](https://github.com/melvincarvalho/tideholm/issues/193).
Playground software.
