# Plan: Phase 6, projects as containers and the glass redesign

Date: 2026-11-06. Done when: everything you make belongs to a project with its own address, you can switch and manage projects, and the whole app uses one glass look that stays readable.

## Decisions (from the owner)

- Items made before this stay as they are, in a virtual Unsorted view. Each project has its own address. Trash is built now.
- Sidebar: flush with the screen edges, hides completely, its edge glows with the accent and toggles it; while hidden the whole left edge is a click strip.
- Glass everywhere with correct legibility. Smooth blur-fade transitions, never cuts. Spacing on one scale. No green glow in the background.

## Built

Server: project list with counts and a cover, project and image trash with Restore, project filters for Library, chats and clips. Client: `/p/<id>/...` routes with a scope that validates and remembers the project, redirects from the old addresses, project switcher (digits 1 to 9 while open), project menu (Rename, View trash, Delete), Projects page with trash, breadcrumb header, image history masonry with infinite scroll, Library masonry. Design: glass tokens, spacing scale, page and menu blur-fade, star-border Generate, neutral ambient light and faint filings.

## Known and accepted

- The first run with no project makes one named like "Nov 06 - 11:44". Two browsers opening at the same instant could each make one (it happened once in the e2e run). Delete the extra from the Projects page.
- The digit shortcut stops at 9 and only works while the switcher is open, because browsers keep Cmd+1 to 9 for tabs.
- The project list counts and covers read at most 5,000 items in total.
- Unsorted has only a Library.
- The dark tone is being reviewed: six options were shown to the owner.
