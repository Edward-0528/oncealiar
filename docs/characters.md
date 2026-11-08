# Characters: the "Tabloid Spy" cast

Players pick a character (an `AvatarId`) and a colour (`PLAYER_COLORS`). The id
lists and metadata live in `shared/src/content.ts`:

- `AVATARS`: the 12 free characters. Use these for random picks, bots and the default picker.
- `PREMIUM_AVATARS`: the paid packs. Only valid in premium rooms.
- `ALL_AVATARS`: every id the client can draw.
- `AVATAR_INFO[id]`: `{ name, line, pack, premium }`.
- `AVATAR_PACKS`: premium packs in display order (`disguise`, `la-familia`).

The art lives in `client/src/components/avatars/` (`free.tsx`, `familia.tsx`,
`gadgets.tsx` (Shoe Phone + Inspector Lupa, sold in Masters of Disguise), `disguise.tsx`, shared parts in `kit.tsx`, the pure SVG renderer in
`render.tsx`). Render a character with
`<Avatar avatar color size mood? animated? masked? sticker? />` (`sticker` adds the
white die-cut halo + hard ink shadow used for exports). Marketing exports come from
the same components: see `docs/assets.md`. To see every character
in every mood, open `?mock=characters` in dev (`avatars/Gallery.tsx`).

## Cast

### Free: The Usual Suspects

| id | Name | One-liner | Player colour tints |
|---|---|---|---|
| `chancla` | **La Chancla** (cover star) | Thrown with love. Never misses. Ask your primos. | the sole |
| `agent` | Agent Fedora | Sunglasses indoors. Trusts no one. | hat band + tie |
| `pigeon` | The Pigeon | Hears everything. Coos for crumbs. | iridescent neck |
| `duck` | Duck Disguise | Definitely not a duck. Look at the mustache. | tiny tilted bowler (the HUGE handlebar mustache is the disguise) |
| `cow` | Totally a Cow | Moo. Definitely moo. | collar + cowbell (a dog in a cow onesie) |
| `goldfish` | Agent Bubbles | Three-second memory. Perfect alibi. | bowl water (tiny trench coat + fedora) |
| `paparazzi` | Paparazzi | Saw that. Already posted it. | lens ring + strap |
| `cat` | Cat Burglar | Steals hearts and codewords. | bandit mask |
| `gnome` | Gnome Knows | Shh. Knows your secret. | pointy hat (white bushy brows do the sus) |
| `ghost` | Ghosted | Left the chat. Still watching. | fedora band |
| `pina` | Undercover Piña | Tropical, mysterious, prickly. | sunglasses frames |
| `nopal` | Don Nopal | That mustache is evidence. | flowers / fruit |

### Premium: Masters of Disguise (`pack: 'disguise'`)

Animals from all over, in hilariously bad disguises.

| id | Name | One-liner | Player colour tints |
|---|---|---|---|
| `penguin` | Le Waiter | Your table is ready. Ze special is: no questions. | bow tie (fake curly mustache, silver tray) |
| `raccoon` | Staff Only | I work here. Please ignore the bins. | hi-vis vest (STAFF badge, clipboard) |
| `bear` | The Tourist | Just visiting. Love your... honey. | bucket hat (camera, flowery shirt) |
| `flamingo` | Just a Lamp | Pink? Lamps can be pink. | lampshade (head, neck and legs poke out) |
| `shoephone` | Shoe Phone | Missed call from your left foot. | the shoe |
| `magnifier` | Inspector Lupa | Sees the clue. Strokes the mustache. | handle |
| `giraffe` | Tall Stranger | Normal guy. Normal height. Nothing up here. | fedora (long trench coat) |

### Premium: La Familia (`pack: 'la-familia'`)

| id | Name | One-liner | Player colour tints |
|---|---|---|---|
| `abuela` | La Abuela | Already took off the chancla. Just in case. | hair rollers |
| `tio` | El Tío | Says he is not cooking. Is cooking. | guayabera |
| `tia` | La Tía Chismosa | Heard it first. Told everyone second. | phone case |
| `villana` | La Villana | Gasps on cue. Has a secret twin. | dramatic collar |
| `primo` | El Primo | Knows a guy. The guy is also a primo. | backwards cap |

## Moods and motion

- `mood="idle"` (the default): resting face.
- `mood="sus"`: heavy eyelid, side-eye, one eyebrow cocked, smirk. Sunglasses slide down.
- `mood="caught"`: pinprick pupils, O mouth, sweat drop. Sunglasses pop up off the face.
- `mood="win"`: happy `^ ^` eyes, open grin, sparkles.
- `animated` turns on a short idle loop (see `avatars.css`). La Chancla swings and her ¡PUM! burst pops, Ghosted floats, the Pigeon head-bobs, and the rest bounce, sway, wiggle or sneak. All motion turns off under `prefers-reduced-motion`. Keep it off for tiny avatars in lists.

## Art rules for new characters

1. **Canvas.** Use a `viewBox="0 0 120 120"`. Keep the silhouette inside roughly 6 to 114, and put the face near the middle so the spy mask fits.
2. **Ink + cel shade.** Draw each main form with `form(uid, key, <shape/>, fill, shade?)` from `kit.tsx`: it adds the 3.5px `#111` outline and one flat darker tone on the lower-right (hand-picked `shade`, or a translucent ink overlay that works on the player colour). Add one small white `Glint` highlight top-left. Other outer shapes use `S`. Interior details use 2.5px (`T` / `L`). Use flat fills only: no gradients, no blur, no external images, no emoji, no fonts except Anton for burst text.
3. **Palette.** Draw from the tabloid constants in `kit.tsx` (`INK`, `RED`, `YELLOW`, `MANILA`, `PAPER`, `CHARCOAL`, `GOLD`, `SKIN.*`). Don't make a character mostly yellow, because the app background is newsprint yellow (the duck is the one exception, and it gets coloured glasses).
4. **Player colour.** Exactly one meaningful, reasonably large part takes `c`, the player colour (a sole, a hat, a mask, a phone). It must stay readable at 32px, so 12 players with the same character can still be told apart. Check it against `coral` and `rose`, which sit close to `RED`.
5. **Faces.** Always build faces from the kit: `Eye` / `Eyes`, `Brows`, `Mouth`, `Shades`, `Cheeks`, `MoodFx`. That is what makes the four moods work on every character. Pass `lid` as the face fill so the sus eyelid matches.
6. **Readability.** At 32px the character should read from its silhouette plus its one colour part. At 240px small jokes (tread notches, stamps, burst text) should reward a close look. Test both sizes in the gallery.
7. **Motion.** Choose an `anim` flavour. Any part that moves on its own gets an `av-part-*` class on a `<g>` **with no `transform` attribute**, because CSS transforms replace SVG transform attributes. Put the positioning transform on an inner group.
8. **Mask.** Set `mask: { x, y, rot?, s? }` to the point between the eyes, so the masked or unmask reveal lines up.
9. **Tone (La Familia and beyond).** Keep it affectionate, the way you'd talk about your own family: chanclas, chisme, telenovelas, BBQ uncles, cousins. No jokes about poverty, immigration, crime or accents, and no caricatured features. Vary the skin tones and keep them warm.
10. **Weight.** Keep each character lean (about 4 KB of rendered SVG; `npm run assets` prints the sizes).
11. **Register it.** Add the id to `AVATARS` or `PREMIUM_AVATARS`, add an `AVATAR_INFO` entry, then add the art to the right `*_ART` map. Typecheck enforces that every id has art.
