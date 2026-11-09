# Phone patterns from Mobbin (2026)

A closer look at real iOS app screens on Mobbin, to answer the product owner's "the phone UI doesn't feel mobile optimized". Research only; no app
code was changed. Checked **2026-11-09** through the Mobbin MCP (28 searches). This builds on [mobile-layout.md](mobile-layout.md) (its M1-M6 are not
repeated here) and the "Layout" section of `docs/architecture/web.md`. The hard rules still apply: targets >= 56 px, keys 72-128 px, text >= 16 px,
the sentence to be spoken is the largest text (40 px), one ember thing (Speak), no gesture-only actions.

**How to read the numbers.** Mobbin previews are 299 px wide. "% H" is a fraction of the screen height (status bar to home indicator) and "% W" a
fraction of the width. "≈ N css" converts a preview size to CSS px on a 393 px wide iPhone (x1.31). All values were read by eye from the previews, so
they are approximate (about ±10%).

**Coverage.** Mobbin returned iOS phone screens only: no Android, no landscape, no AAC apps. **It returned no Google Translate conversation mode,
Apple Translate, iTranslate or SayHi screens.** For "speak" patterns it returned Meta AI Live translation, Singapore Airlines' Translation Assistant,
the Speak app, voice memo screens and TTS readers instead. It returned **no dialer that suggests contacts from the digits typed (9-key predictive matching)**, which would be the closest match to our
sentence candidates.

## Summary: the strongest patterns and what they mean for us

1. **The primary action is in the bottom 20% of the screen, next to the keypad. It is never in the top card.** Dialers put Call under the 0 key at
   77-85% H. Custom amount pads put a full-width Next/Pay/Continue under the keypad at 85-92% H. Forms that use the system keypad put it right above
   the keypad. Record, Start and Push to talk buttons sit at 80-88% H. → Move Speak out of the sentence card into a bar directly under the keypad.
2. **Display at the top, keypad at the bottom, and an empty gap between them.** The value takes 20-35% H and the keypad 40-45% H. The gap between them
   is where things can change size (chips, account rows, hints), so the keypad never moves. → The sentence goes at the top. Its height and the
   alternatives' height are both fixed.
3. **The keypad fills the width in 3 columns, and its keys are wider than tall.** On the system keypad (aspect about 2.6:1), in fintech pads (about
   2:1, unboxed digits) and in grid PIN pads (1.3-1.7:1), each key is a third of the width. Round dialer keys (about 19% W) are the exception, and
   they leave wide empty margins. → Use 3 columns of about 115 x 72-76 px on a 393 px phone.
4. **Backspace is always bottom right.** It sits under # / 9 in every pad found. Clear is rare. When it exists it is an (x) in the display (Venmo,
   Truecaller, Beside), a text key in the empty bottom-left slot (Wealthfront), or it sits behind an Undo or a confirmation. → Our `*` (Back) is
   already bottom left. Keep Clear away from Speak.
5. **Two actions side by side: the secondary on the left, the primary on the right, both lined up with the key columns.** Seen in Beside (Text |
   Call), Venmo (Request | Pay), Careem, komoot, Lightyear and Granola (Hold | End). Skype, Quo and Granola line up the row under the keypad with its
   columns (secondary | Call | Delete). → Under the keypad: **Options** (more actions) in column 1, **Speak** across columns 2-3.
6. **Usually 3 suggestions, in a fixed row right next to where the person types.** Seen in iOS QuickType's 3 slots, the 3 equal quick-amount chips
   above pads (Phantom, Stake, Public, Uniswap, talabat), and 3 stacked replies (Grab, Agoda, TikTok Tako, Noom). Whole sentences show as **full-width
   rows** (Grab, Grab Driver, Gojek), not chips. A horizontal chip strip cuts its last chip off at the edge and needs a swipe (LinkedIn, Alexa,
   Klarna). → Show alternatives as 2-3 full-width rows between the sentence and the keypad. Never use a scrolling strip.
7. **The empty display shows one short placeholder at the display size, in a lighter colour. It never wraps.** For example "$0", "0", "Amount" or
   "1,000". Any longer explanation goes in small helper text below it (Plum's "Enter an amount", Chime's "$1,000 limit"). → At 40 px, "Press a key to
   start" (20 characters) wraps on a 393 px phone. Use a placeholder of 12 characters or fewer at 40 px in a muted colour, with an optional 16-18 px
   hint.
8. **The primary stays visible when it can't act yet: greyed out, same size, same place.** Seen in Wealthsimple, Oportun, Fuse, X and Up. Acorns puts
   the reason in the label ("$5 minimum"). → Speak should never disappear or move. Its disabled label can say why.
9. **Rare actions go behind one "More" or "Options" button that opens a bottom sheet of big rows with a visible Close.** Seen in Fabric, Substack, Cosmos, Obsidian and
   Notion. Rows are about 52-58 px with an icon and a label. The destructive action comes last, in red, in its own group. → Put Save phrase (and Show,
   if it has to move) in an Options sheet. Spell this word only matters when a word is unknown, so show it as a contextual chip at that moment.
10. **Bottom bars sit just above the home indicator.** The lowest button ends about 24-44 css px above the bottom edge. Voice apps float a centered
    cluster of [secondary] [primary] [secondary] (Claude, Copilot, Shopify). → Pad the action bar with `max(12px, env(safe-area-inset-bottom))`.

## 1. Keypads with a primary action

**Dialers (round keys).** [OpenPhone](https://mobbin.com/screens/274b16c9-3294-4b24-8bbd-a4c7c023da15) and
[TextNow](https://mobbin.com/screens/e543410f-fe2c-45a5-b127-23be8b852be7) leave the top third empty. The keypad sits at 30-75% H, the round keys are
about 18% W (≈ 72 css), and a green Call button the same size as a key sits centered at 81-84% H. Below that is a tab bar.
[Quo](https://mobbin.com/screens/df5e5847-ddfc-4dc5-957c-46491c73d635) and [Granola](https://mobbin.com/screens/d85216ee-49ca-485c-81c4-b45a01d29341)
show the number at about 20% H in a bold style about 26 css px high. Their bottom row lines up with the key columns: Message under *, Call under 0,
Delete under #. [Beside](https://mobbin.com/screens/7e20d106-c159-4e45-a0cf-1174909d5d90) uses two half-width pills under the keypad instead: Text
(secondary, left) and Call (black primary, right), at about 0.75x a key's height. Its number field has a clear (x) inside it.
[Skype](https://mobbin.com/screens/5897daf4-a5ad-495d-9910-084516c0e387) uses full-width unboxed keys at 54-87% H (each about 33% W x 45 css, so wider
than tall), with the row below lined up the same way: contacts | Call | Delete. Granola's in-call keypad
([screen](https://mobbin.com/screens/ff437301-3a4e-43c6-8eb7-ab67d4a00dab)) puts Hold on the left and a red End pill on the right.

**System numeric keypad (forms).** In [Truecaller](https://mobbin.com/screens/8e98906f-81d4-4a4d-b105-f3078996a197),
[One](https://mobbin.com/screens/838b9c67-f2bd-452d-a2cf-787cdd4042d2), [Shelf](https://mobbin.com/screens/fd293377-5b9d-4415-a249-4a76547f0181) and
[Canopi](https://mobbin.com/screens/6e991138-79b5-4515-a93d-f2c491a8c968), the keypad takes the bottom 35-38% H. Its keys are about 32% W x 37 preview
px (aspect about 2.6:1) with the letters under the digit, and Delete is bottom right. The full-width primary sits right above the keypad, slightly
taller than one key (≈ 52 css).

**Custom amount pads.** [Cash App](https://mobbin.com/screens/f9cec454-e8b9-4ee5-aede-9ee842863eb9) shows "$0" at about 18% H in large type (≈ 72
css). The unboxed keypad takes 40-67% H. Under it come Pool | Request as half pills, then a full-width black Pay, then a tab row.
[Wealthsimple](https://mobbin.com/screens/4dec9530-0e0d-4629-8d9a-db205614f426),
[Oportun](https://mobbin.com/screens/b30c3463-208c-49e0-b8a6-5e71dda8319a),
[Lightyear](https://mobbin.com/screens/c3c4d8af-855c-4106-a2ba-0b4bc1a432ea), [Fuse](https://mobbin.com/screens/0709fdce-454d-4d0c-80ee-b5215d0fba0a),
[Acorns](https://mobbin.com/screens/9ed1b29d-116c-4fac-a97c-5ab484a0fc2b) and [X
Money](https://mobbin.com/screens/b5c8106d-6434-4aa3-af96-0e8b8209a2c9) all use the same stack: value at 25-35% H, keypad at 50-85% H, and a
full-width primary at 87-92% H about 0.75-0.85x a key row (≈ 52-58 css). Backspace is bottom right in every one.
[Wealthfront](https://mobbin.com/screens/ffb6a291-db7f-4662-94ab-4923a620285c) puts a "Clear" text key in the bottom-left slot and Done under the
keypad. [Venmo](https://mobbin.com/screens/33c0270f-00b3-43c5-8116-388700016a04) puts Request | Pay as equal halves above a 4-column keypad, and a
small (x) clear next to "$0".

**Grid PIN pads.** [Crypto.com](https://mobbin.com/screens/f0530dbe-5577-49ee-bce0-05950efe5d97) uses full-width cells separated by hairlines (about
1.7:1) at 58-93% H. [5 Minute Journal](https://mobbin.com/screens/8b8c7de9-f026-4397-8d30-9f50f9e8f86b) uses rounded-rectangle keys (about 1.3:1). In
both, Delete is bottom right, and the dots sit above a block of empty space, so feedback never pushes the keys.

## 2. Speak, talk or record as the primary action

- **Full-width bottom button.** [Meta AI Live translation](https://mobbin.com/flows/307fe1e1-0ef1-4025-b62d-c89d98bdc252) has Start/Stop at about 87%
  H, full width (≈ 55 css tall), with "They speak | You speak" selectors right above it. When idle, it shows only a small grey centered hint ("Speak
  now... / Habla ahora..."). In the conversation ([screen](https://mobbin.com/screens/eb2873d4-983a-4d92-8211-af4da5625271)), the translated line is
  bold and larger than the original above it, and a speaker icon sits beside the bubble.
- **Big round button, bottom center.** In the Speak app ([screen](https://mobbin.com/screens/61556f91-425a-4d72-8912-56b2e0bd840e)) the mic is about
  23% W (≈ 92 css) at about 87% H, labelled "Tap to respond". The text card is at the top, with a speaker icon inside it. Voice-memo record buttons
  ([Apple Notes](https://mobbin.com/screens/8d9a3b97-ce5f-4e8c-a06c-e4c1af9d7e2b),
  [Journal](https://mobbin.com/screens/fb8e2aae-a965-40ca-add0-2604b87f1e6b),
  [OpenPhone](https://mobbin.com/screens/620df303-e671-4766-8109-e2095fad7e5d),
  [Beside](https://mobbin.com/screens/5b8e0f57-43b6-459e-8d31-d9202dc176f8),
  [Speechify](https://mobbin.com/screens/fed530bb-bb3e-47ac-86d9-8720c0ba45ed)) are about 19% W (≈ 75 css) at 82-88% H. A small secondary sits on each
  side (transcript on the left, Done on the right) or a label sits underneath.
- **Wide pill flanked by two small buttons.** [Claude](https://mobbin.com/screens/9050ce03-46a9-48d6-91d1-252df02272e7) shows "Push to talk" (about
  48% W) with settings on the left and close on the right. [Copilot](https://mobbin.com/screens/00c22aa2-8f20-424c-bda2-a8630c12b16d) and [Apple Notes
  "Resume"](https://mobbin.com/screens/903ddeb1-ec14-45a0-8283-6c3748b52b91) work the same way.
- **Speak button inside the panel.** [Singapore Airlines](https://mobbin.com/screens/9975067b-7c96-4cc3-af87-3ac651cd8c7f) splits the screen into two
  panels. Each shows its text top left (≈ 32 css) and has a mic button bottom right (≈ 60 css). In [Messages
  Translate](https://mobbin.com/screens/dc4909db-9e9c-42f6-a39b-d6ec45c87e90) the play button is bottom right inside the card.
  [ElevenLabs](https://mobbin.com/screens/b03bbf24-5ca5-4a69-bdff-ac6c6c90daad) puts the text at the top and one row right above the keyboard: voice
  chip, settings, then the black "Regenerate" primary on the right. [Grok](https://mobbin.com/screens/20c5339c-a92e-4600-9bc0-bff7e1300d75) has a
  "Speak" pill bottom right in its composer.
- **Showing the text being spoken.** [Speechify](https://mobbin.com/screens/be023156-4223-4690-9723-4aeaf739983c) and
  [ElevenReader](https://mobbin.com/screens/a056a95b-9dba-46c1-bc17-35e379cdcb50) tint the background of the current sentence and use a stronger tint
  on the current word (ElevenReader's large mode is about 26 css). [Deezer](https://mobbin.com/screens/4d076e31-d344-49a1-917e-43a909ba0345) shows the
  current line bold at full opacity, with the next lines faded. Large text screens shown to someone else ([Calm
  Sleep](https://mobbin.com/screens/37655c6d-346f-4ce6-9f64-216ff8274285), [Calm](https://mobbin.com/screens/64c4a0bc-3157-442e-8d4b-7eb5f080c277))
  use about 26-29 css text, left-aligned or centered, with a visible X at the top and one bottom action.

Across these: the speak/record control is always in the bottom 20%, either a round button of 75-92 css or a pill at least half the screen wide. None
of the apps returned puts it at the top.

## 3. Composer and suggestions

- **QuickType strip:** 3 equal slots, ≈ 40 css tall, separated by dividers, directly above the keys ([Garmin
  Connect](https://mobbin.com/screens/4a9ed69a-039a-472b-aa01-8007afea6e76): "Egg" | Eggs | Eggplant;
  [Tinder](https://mobbin.com/screens/323d69ab-0fbf-4e9e-9be7-8652ab766518)). The middle slot is the literal text typed, and the other two are
  alternatives. That is the same job as our "on show" sentence plus its alternatives.
- **Full-width stacked rows (best for sentences).** [Grab](https://mobbin.com/screens/072f603c-f257-4b9d-bda8-a97b35e713f3) shows "Smart suggestions"
  as 3 full-width one-line rows right above the composer, under a header that collapses with a visible chevron. [Grab
  Driver](https://mobbin.com/screens/8309d0d4-916e-44fc-90a9-665eb1e2f9a2) shows 4 quick replies plus "Add a quick reply", and
  [Gojek](https://mobbin.com/screens/fc6f84fa-d32f-4b30-89af-45f83503b228) 5 rows. [TikTok
  Tako](https://mobbin.com/screens/ccfbc6dd-339b-4a90-b5e3-3f2c83020f04) and [Agoda](https://mobbin.com/screens/70bedca1-6d20-4d84-83ad-10b41b0101bc)
  show 3 stacked items with a → or > at the end.
- **Horizontal chip strips.** [LinkedIn](https://mobbin.com/screens/8ad26749-e524-4ff0-8504-3320564b1795), [Amazon
  Alexa](https://mobbin.com/screens/161a45bf-7553-4dbe-a1e4-fba14401f8cc), [Beside](https://mobbin.com/screens/adf7c6b8-6c1b-4d80-a053-e24fc1cefa6c),
  [Wabi](https://mobbin.com/screens/a453f6ca-f486-493e-9f15-68b4f7f977f8) and
  [Outlook](https://mobbin.com/screens/0a6b0394-6009-4473-b072-e04a65f16e3b) show one row whose last chip is cut off at the screen edge. Reaching the
  rest takes a swipe, so this breaks our no-gesture-only rule.
- **Wrapping pills.** [Wysa](https://mobbin.com/screens/f75c2739-0a09-447a-8c6f-881b0509ec9b) (2 x 3),
  [Zing](https://mobbin.com/screens/9d1ad7d4-dc46-4cce-a02e-efd299750b9e) and [Bolt](https://mobbin.com/screens/371ce83e-ec3b-4268-92f2-2fb17a3afcf2)
  wrap their pills. This works for short words, but the block's height changes with the words, so it would push a keypad around.
- **Long suggestions.** [Noom](https://mobbin.com/screens/f3ebca91-37ea-4846-a830-361415e89670) wraps a pill to 2 lines. Outlook cuts its smart
  replies off at the edge. LinkedIn cuts off the last chip. Grab keeps every row to one line.
- **Autocomplete lists** use full-width rows of ≈ 52 css and mark which part was typed:
  [Zocdoc](https://mobbin.com/screens/10112415-e574-4197-9581-400aebeb105c) colours the typed part blue, while
  [eBay](https://mobbin.com/screens/4c9f2c65-194f-457c-9a82-5b0b91bd57ef), [talabat](https://mobbin.com/screens/36fefcc9-cbb1-4309-8e9f-ed83e238c39a)
  and [Perplexity](https://mobbin.com/screens/b27ec646-8b6f-4dbb-9f5e-54e759155016) make the completion bold. This is a cheap way to show which words
  in a candidate differ from the one on show.
- **Quick picks above a keypad:** 3 equal chips filling the width ([Phantom](https://mobbin.com/screens/134bf697-1ee1-4983-a646-0a7b95f3e80d),
  [Stake](https://mobbin.com/screens/cb3945c8-1627-442e-9692-6d02e5a26689),
  [Public](https://mobbin.com/screens/02eb5050-dc11-4754-a248-078f59ef8756)), 4 in
  [PayPal](https://mobbin.com/screens/a2511c63-f271-49c5-b9f5-a702115046e4), or 5 text links in
  [Plum](https://mobbin.com/screens/3a72a3e1-0183-42f0-88c0-2f826328f068). Always one fixed-height row.

## 4. Secondary actions on dense screens

- **Bottom sheets with big rows and a visible Close.** [Substack](https://mobbin.com/screens/589dc39d-cb2e-4bdb-a8b2-fd95e2016384) has a title plus an
  (x). [Fabric](https://mobbin.com/screens/7123c0a7-4c1b-45f4-a107-b8cd400833c0),
  [Cosmos](https://mobbin.com/screens/dd85455f-ef43-49c2-aeaa-a7684b2ac157),
  [Obsidian](https://mobbin.com/screens/31caa55f-8bb0-4838-be7e-d3030fe33f9c) and
  [Notion](https://mobbin.com/screens/a7648225-1014-4f85-975e-298c777b803a) use grouped rows of ≈ 52-58 css with the destructive one last.
  [Otter](https://mobbin.com/screens/5590a925-0704-43e3-a4cd-20c348709f43) uses an iOS action sheet with a separate Cancel at the bottom.
- **"⋯" opened as a popover from the top right** ([Raycast](https://mobbin.com/screens/053ae09f-bc0e-456b-98a7-84947be58d65),
  [Medium](https://mobbin.com/screens/37fba6a4-e08a-46f5-b2e3-b7b1d2293f39)) is common, but it is out of thumb reach and the menu rows are about 40
  css. Don't copy it.
- **Labelled icon buttons.** In-call screens ([TextNow](https://mobbin.com/screens/944e21b5-8b44-4d5f-aaa0-7034f972417b), [FaceTime in
  Messages](https://mobbin.com/screens/364c0fbc-ff8f-4668-9370-4597cea106eb),
  [Netflix](https://mobbin.com/screens/7ed8545d-7058-442e-8a9d-7b79b6d4a81b)) use 3 round buttons per row, each with a text label under it, and the
  red End centered in the bottom row. Editor toolbars of 6-8 icons above the keyboard ([Apple
  Notes](https://mobbin.com/screens/7bb08911-5536-4780-a180-76823cdf8c9b), [Luma](https://mobbin.com/screens/28a12c18-ca17-4ac5-8a63-55bb6128844d))
  are about 40 css with no labels, which is too small for us.
- **Contextual chips.** These appear only when relevant, between the value and the keypad: Venmo's Gift / Schedule,
  [Satispay](https://mobbin.com/screens/cd23fcff-4703-491e-b7c5-1e87ee2ce1f8)'s "Add a comment", [ANZ
  Plus](https://mobbin.com/screens/a917c1a0-8812-4040-8675-1180a986eaa0)'s "Add Message". That is the right model for "Spell this word" and "Add to my
  words".
- **Destructive actions.** Some apps offer Undo after the fact ([X](https://mobbin.com/screens/ed4a0353-637c-44de-89b8-4b7f681ac94d) toast with Undo,
  [Shop](https://mobbin.com/screens/26edeaa3-1454-4c37-948a-bd6c8eb364ba)). Others confirm first:
  [BitePal](https://mobbin.com/screens/3b190043-0e69-479d-a003-69834c4dd664) asks "Clear this meal" with "Clear meal" and "Keep editing".
  Swipe-to-cancel voice recording ([WhatsApp](https://mobbin.com/screens/5609cf9c-a6e5-4785-ae58-f0d8b9118851),
  [Yubo](https://mobbin.com/screens/e5357631-f7a6-4189-9a02-8d8a06254082)) is gesture-only.
  [Slack](https://mobbin.com/screens/24301e6f-0a19-4840-9750-173f971a38a9) and [Urban
  Company](https://mobbin.com/screens/7906efa6-18da-4cc9-be1d-4aa24e0d2ba3) use a visible (x) on the left and ✓ on the right instead.

## 5. Empty states in large displays

- **Amounts.** The placeholder is always one short token at the full display size. Some use a dark colour (Cash App, Oportun, Wealthsimple,
  [PayPal](https://mobbin.com/screens/7b32a09c-93d3-4557-9ff7-d34982cefbc5)), some mid grey (X Money, Phantom), and some light grey: Fuse,
  [Public](https://mobbin.com/screens/0d1e3ac1-cdf4-46ae-8b6a-1d1ba37b1101),
  [Zomato](https://mobbin.com/screens/3d9363e8-3b5e-40b9-abc0-22a784643083), Plum, Uniswap, and Satispay's "0 €" in a grey box. Plum adds small helper
  text under its grey 0. [Tabby](https://mobbin.com/screens/4e421e14-f58f-49ed-a02e-49613d804bf9) shows an example value ("1,000") in light grey.
  [Up](https://mobbin.com/screens/dba29116-f247-4ae8-9b2f-3dadfba13193) shows the word "Amount" in grey at the value size.
- **Text.** [Bumble](https://mobbin.com/screens/e6c00ac2-8e86-461b-a823-f7d8302bac1d) shows a grey bold prompt (≈ 24 css) that wraps to 2 lines, but
  its box is already tall and empty, so nothing moves. [Preply](https://mobbin.com/screens/867c0250-e868-4931-a923-cd76f9a744fa) shows "Type French
  word" in grey at about 20 css. [Manus](https://mobbin.com/screens/c19c77b7-6f0d-41a7-9555-b51b4c99bbed) centers "What can I do for you?" in the
  empty canvas. [Singapore Airlines](https://mobbin.com/screens/9e49865e-6919-4193-84d8-68650d4eaa4a) shows no placeholder at all, only the mic
  button.
- In none of these does the placeholder take more room than the entered value would. When the hint is long, it is smaller than the value, or it sits
  in a box that is already big enough.

## 6. Bottom bars and the safe area

In the previews the home indicator sits at about 98.5% H. Bottom primaries (Lightyear, Fuse, Acorns, X Money, Oportun) end about 24-44 css above the
bottom edge, which is the home-indicator zone plus a small margin. Floating tab bars
([Quo](https://mobbin.com/screens/df5e5847-ddfc-4dc5-957c-46491c73d635), [Slack](https://mobbin.com/screens/d94e3e83-3200-4770-bb09-85ea0b6e1a5f),
[Crouton](https://mobbin.com/screens/bfb5df79-f490-45d3-b573-35d72f6ff3c8)) and floating action clusters
([Shopify](https://mobbin.com/screens/fcfd23ed-f847-402d-ab2f-81f826fd847e): gear | Quick sale | x) sit above it. The system keypad runs under it,
keeping the globe and mic row in the inset. Sticky primary pairs ([komoot](https://mobbin.com/screens/1fa31e4a-763f-465c-9e86-d441f66254a8): Finish |
Resume, and [Lightyear](https://mobbin.com/screens/a526b208-1007-48a0-8316-5a5ac0ef8731): Cancel | Confirm) are two equal halves with the primary on
the right. In Safari tabs `env(safe-area-inset-bottom)` can be 0 (see mobile-layout.md, S24), so keep a minimum of 12 px of padding.

## Proposed phone layout (portrait, 393 x ~660 px Safari viewport)

The layout follows patterns 1-10 and the hard rules. Every row has a fixed height, so no key ever moves. Sizes are in CSS px, with 16 px side gutters,
so the content is 361 px wide.

```
 y=0   ┌──────────────────────────────────────────────┐
       │ Ninth Life                ● status   [ Menu ]│  Header 56: Menu 56x56, top right (rare actions)
 y=56  ├──────────────────────────────────────────────┤
       │ I need some water                       [⤢]  │  Sentence 72: 40px, 1 line, scrolls inside, keeps
       │                                              │  the newest word in view. Largest text on screen.
       │                                              │  [⤢] Show = 56 icon. Empty: muted "Type to talk"
       │                                              │  (≤12 chars, 40px) + optional 16px hint, no wrap.
 y=128 ├──────────────────────────────────────────────┤
       │  I need some **help**                     ›  │  Alternatives 2 x 56 + 8 gap = 120: full-width
       │  I **feed** some water          [ More 56 ]  │  rows, 20px, one line each, differing word bold.
       │                                              │  Fixed slots; contextual chip (Spell this word /
       │                                              │  Add to my words) replaces row 2 when needed
 y=256 ├──────────────────────────────────────────────┤
       │ ┌────────┐ ┌────────┐ ┌────────┐             │
       │ │ 1 .?!  │ │ 2 abc  │ │ 3 def  │             │  Keypad 4 x 72 + 3 x 8 = 312
       │ └────────┘ └────────┘ └────────┘             │  Keys 115 x 72 (wider than tall, 3 columns)
       │ │ 4 ghi  │ │ 5 jkl  │ │ 6 mno  │             │  Bottom row: * Back | 0 Space | # Next
       │ │ 7 pqrs │ │ 8 tuv  │ │ 9 wxyz │             │  (keys 76 tall when the viewport is >= 680)
       │ │ * Back │ │ 0 ␣    │ │ # Next │             │
 y=568 ├──────────────────────────────────────────────┤
       │ ┌────────┐ ┌────────────────────────────────┐│  Action bar 72, on the key columns:
       │ │⋯Options│ │          🔊  SPEAK              ││  col 1 Options (Save phrase, Clear, Show...)
       │ └────────┘ └────────────────────────────────┘│  cols 2-3 Speak, the only ember thing
 y=640 │          (12px or the safe-area inset)        │  padding: max(12px, env(safe-area-inset-bottom))
 y=660 └──────────────────────────────────────────────┘
```

Notes on the sketch:
- **Speak is about 238 x 72**, as tall as a key and on the same column grid (patterns 1 and 5). That puts it in the bottom-right thumb zone. The
  "Keypad on the left / right" setting from mobile-layout.md could mirror the bar for left-handed people. When Speak can't act, it stays greyed out in
  place, and its label can explain why (pattern 8).
- **Clear moves off the main row.** Put it in the Options sheet with Undo (X, Shop), or as an (x) in the sentence row's top right, as in Venmo,
  Truecaller and Beside. In either place it is far from Speak, which matters for tremor. A 56 px (x) inside the row costs about 64 px of line width
  (about 3 characters at 40 px), so the Options sheet is the roomier choice.
- **The Options sheet** (named so it is not confused with the sentence "More" button) is a bottom sheet with a visible Close first and big rows
  (≥ 56 px, 18-20 px text): Save phrase, Clear sentence (last, separated), and Show if it is not kept as the [⤢] icon in the sentence row (pattern 9).
- **Alternatives:** 2 rows plus More, rather than the current 3 + More below the keypad. QuickType shows the same amount: the text on show plus two
  others. The rows sit right where the eyes move from the sentence to the keys, so no scrolling is needed.
- **Height check:** 56 + 72 + 120 + 8 + 312 + 8 + 72 + 12 = **660**. At 680 px or taller, the extra height goes to the keys (up to 76-96). On
  shorter viewports, first drop to one alternative row (saving 64). Keys never go below 72. On iPhone SE (375 x about 548 in a tab) that still does
  not fit with a 56 px header. Fold Menu into the action bar's left button: 64 sentence + 56 alternative + 8 + 312 keypad + 8 + 64 action bar +
  12 = 524. Our arithmetic only; verify it in `test/e2e/responsive.mjs` before committing.
- **Focus and scan order change:** keypad, then action bar (Speak), then alternatives, then sentence, then header. The web-ui spec, `accessibility.md`
  rule 7 and the scan-grid rows in `web.md` must change together (as noted in mobile-layout.md F16).
- **Unverified:** these are design-library observations, not usability tests with AAC users. Check on a real iPhone in a Safari tab and as an
  installed app, with someone using one hand.
