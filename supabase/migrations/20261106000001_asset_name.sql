-- A name you can give an image or clip. Empty means "use the name made from the prompt".
-- Adding a nullable column changes no existing row. The app works without it (names then stay in the browser).
alter table public.assets
  add column if not exists name text
  check (name is null or char_length(name) between 1 and 80);
