# Plan: Phase 5, layout rebuild

Date: 2026-11-05. Done when: the Image and Video studios use the layout the owner chose after the Higgsfield study, everything still works, and the owner has confirmed the details by using it.

## Decisions (from the owner)

- Sidebar stays, collapsible (icon rail), no top bar. Edge click and Ctrl or Cmd + B toggle it.
- Image studio: results fill the canvas, the composer is docked at the bottom. Video studio: a 22 rem control panel and a results stage. No "How it works" tab.
- Accent #7ad950. Dark palette is stepped zinc. No BorderBeam. Pointer cursor on clickable controls. Skeletons shimmer.
- Costs show in rupees (display only, rate from `NEXT_PUBLIC_USD_INR`, default 88). A balance chip, top right, takes the figure from the Google Cloud console and subtracts what the app spends after that.

## Built

Collapsible sidebar. Docked composer: Agent mode (inner glow, one edge sweep, hands the idea to the Agent page), model picker, aspect ratio menu, quality menu with notes, count stepper, Look and project, estimated price on Generate, scrollable chip strip with arrows, prompt clears on submit (switchable). Media picker above the dock: Uploads (Recent, All), Generations, Favourites, sort. Results: masonry grid sized S, M or L, or grouped by batch. Tiles: name from the prompt, heart, reuse, a menu with favourite, reuse, animate, download, copy prompt, rename, delete. Generating tiles with drifting blur and an estimated percentage.

## Known and accepted

- Names you give an image stay in this browser. Saving them in the database needs a new `name` column (one small migration); not done because it changes the schema.
- The balance is typed in; this app cannot read a Google Cloud balance.
- The percentage on a generating tile is an estimate from elapsed time. Google reports no progress.
- Picker sorting offers Last created and First created. "Last used" would need usage tracking.
- The image cost estimate uses token counts from one real 1K call and Google's listed price; 2K and 4K token counts are assumptions. Image quality "4K" costs more by that estimate.
- `NEXT_PUBLIC_USD_INR` is a fixed rate you set; Google bills at its own rate.
