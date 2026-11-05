# Framerald: product summary for design work

Paste this into ChatGPT together with the screenshots in `screens/`. Ask it for new layout designs, one page at a time.

## What it is

Framerald is a **personal AI studio** for making images and short videos. One owner, no sign-in, used for hours at a desk, usually in a dim room. You write a prompt (or let an agent plan the shots), Google's models make the image or clip, and everything lands in a library with its cost. It is a **tool, not a marketing site**: dense, quiet, and fast to scan. The pictures and clips are the hero, never the chrome.

Inspired by creative tools like Higgsfield, but with its own name, look and features. Not a copy.

## Who uses it

One person who makes many generations and compares them side by side. Cares about: seeing results large, keeping the good ones, repeating a setup with small changes, and knowing what each generation cost.

## Navigation (left rail, 4 pages)

Image, Video, Agent, Library. A slim rail on the left from 64rem wide; below that it becomes a top bar with the same four links. Wordmark "Framerald" with a small emerald outlined square. The active item has a subtle filled background and an emerald icon.

## Pages

### 1. Image studio (`/image`)
Two panes. **Left: controls panel** (26rem, scrolls on its own, Generate button pinned at the bottom). **Right: results.**
- Prompt box with the rainbow border beam (the only beam in the app). Under it: "Ctrl Enter to generate" hint and a "Refine with agent" button (rewrites your prompt, with Undo).
- "Look" presets (collapsed section, chips like Film noir, 35mm film).
- Reference images: up to 14, drag and drop or add; turns the request into an edit.
- Model select (Nano Banana 2.1, Pro, Lite), aspect ratio picker (10 ratios as small shape chips), size (1K, 2K, 4K), number of images (1 to 4).
- Emerald **Generate** button.
- Results: one block per generation, newest first: the prompt, small meta (model, ratio, size), the estimated cost at top right, then the image tiles. States: empty ("Your images appear here"), generating (skeleton tiles in the right shape), failed (reason + Try again), done. Star to favourite on hover; click opens a detail dialog.

### 2. Video studio (`/video`)
Same two-pane layout as Image.
- Prompt with the beam, Refine with agent.
- Model (Veo 3.1 Lite, Fast, standard), aspect ratio (16:9 or 9:16 only), length (4, 6, 8 seconds), resolution (720p, 1080p, 4K; the last two need 8 seconds), Sound switch.
- First frame and last frame slots (upload or pick from the Library) to animate an image.
- "Camera and look" presets in a collapsed section: camera moves (Slow dolly in, Orbit, Handheld, Crane up, Whip pan...) and looks (Film noir, Anime, Vintage VHS...). Users can add their own.
- Pinned footer: **Estimated cost** (live, changes with every setting) and the emerald **Generate video** button.
- Right side: a list of clips, newest first. A running clip shows a placeholder with a timer ("Generating 0:42, usually 1 to 3 minutes, it keeps going if you leave"). Done clips play inline with Download and Re-run. Failed clips show the reason and Try again. Running clips survive a page reload.

### 3. Agent (`/agent`)
A chat with a planning assistant (Gemini). Three regions: **chat list** (left, 16rem, New chat button), **conversation** (centre), **message box** (bottom, Send or Stop).
- Header: chat title with rename and delete (inline confirm).
- Empty state: "What are you making?" with three example prompts to click.
- The user's messages are right-aligned in a filled bubble. The assistant's reply is plain text, then a **shot list as cards**: a title, "N still frames", and a grid of cards. Each card shows number, label, aspect ratio, the prompt, an optional note, and three actions: **Send to Image**, **Send to Video** (opens that studio with the prompt filled in) and **Refine this shot** (puts it back in the message box). Replies stream in; a small cost shows under each reply.
- On narrow screens the chat list becomes a select menu.

### 4. Library (`/library`)
Everything you have made.
- Header: title "Library" and a four-way filter: All, Images, Videos, Favourites.
- Grid of square tiles (2 columns on phones up to 6 on wide screens), infinite scroll. Video tiles show a play badge and duration. Star on hover to favourite.
- Click a tile to open the **detail dialog**: large image or video player on the left, a side panel with the prompt, model, shape, sound (video), cost and date, then actions: Add to favourites, Edit this image, Animate this image, Re-run these settings, Download, Delete (two-step inline confirm).
- States: loading skeleton grid, empty (per filter), error with retry.

## Design system (fixed, please respect it)

- **Cinematic Dark**: near-black background, slightly lighter cards and panels, hairline borders, white primary, muted grey secondary text, 12px base radius. Font: Geist.
- **One accent: emerald** (for the main action on a screen, the selected chip, the active nav icon and running states). Never as a big fill or decoration.
- **One rainbow border beam**, only around the prompt box, never more than one visible at a time.
- Sentence-case labels, no tracked capitals, no eyebrows above headings, no emoji, no sparkle icons, no gradients or glassmorphism, no rows of identical stat cards, no nested cards.
- Motion only to show state (150 to 250 ms), respects reduced motion.
- Every region that loads data has four states drawn: loading, empty, error, full.
- Plain, human copy. Say what a button does.

## What would help most from ChatGPT

For each page: 2 or 3 alternative layouts that keep the same functions, with the reasoning (hierarchy, density, what moves above the fold), kept inside the design system above. Useful questions:
1. The Video and Image control panels are long. How should the settings be grouped so the cost-driving ones are always visible?
2. How could the results area feel more like a contact sheet or timeline instead of a plain list?
3. How should the Agent's shot cards connect to the studios (for example, send all shots at once, or a storyboard strip)?
4. A better detail view for the Library: more room for the media, smarter placement of the actions.
5. Phone layouts for every page.

## Screenshots in `screens/`

| File | Page and state |
|---|---|
| `studio-empty.png` | Image studio, empty |
| `studio-prefilled.png` | Image studio, opened from an agent shot (prompt and ratio filled) |
| `studio-results.png` | Image studio with a two-image result and its cost |
| `studio-mobile.png` | Image studio on a phone |
| `video-empty.png` | Video studio, empty |
| `video-jobs.png` | Video studio with a running clip and a finished one |
| `video-mobile.png` | Video studio on a phone |
| `agent-empty.png` | Agent, new chat with examples |
| `agent-conversation.png` | Agent with a reply and shot cards |
| `agent-mobile.png` | Agent on a phone |
| `library.png` | Library, all images |
| `library-videos.png` | Library, Videos filter |
| `library-favourites-empty.png` | Library, empty favourites |
| `library-mobile.png` | Library on a phone |
| `dialog.png` | Image detail dialog |
| `dialog-video.png` | Video detail dialog with the player |

Note: the pictures in the screenshots are placeholder gradients and a test pattern from the mock AI, not real output.
