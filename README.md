# Good Company

A planning book for long tables. Plain HTML, CSS and JavaScript with no build step, so GitHub Pages can host it for free.

## Put it on GitHub (one time, about 5 minutes)

1. Sign in at github.com, click **+ → New repository**, name it `goodcompany`, set it to **Public**, and click **Create repository**.
2. On the new repo page, click **uploading an existing file**. Drag in everything inside this folder (`index.html`, `gathering.html`, `recipes.html`, `assets`, `images`, `README.md`), then click **Commit changes**.
3. Go to **Settings → Pages**. Under "Branch," choose **main** and **/ (root)**, then click **Save**.
4. After a minute or two, the site is live at your Pages address (meghanmcneer.com/goodcompany).

## Accounts and sharing (Supabase)

Everything saves online in Supabase, so it's the same on every phone and computer.

- **Accounts.** People sign up with an email and password, confirm their email, then log in. "Forgot your password?" emails a reset link. Change your password from the avatar menu.
- **Finding friends.** Anyone with an account shows up in The Company search (by name or archetype). Emails are never shown.
- **Private by default.** A new gathering is visible only to the person who made it and the people in its company. The maker can switch it to **public**, which lets anyone with the link look but not edit.
- **Sharing.** Add someone from The Company search, or send the **invite link**, which lets them join after logging in. Everyone in the company can edit everything, and changes show up for the others live.
- **Photos** upload to the `photos` storage bucket.
- **First login on an old device.** Plans saved in that browser before the site went online (gatherings, Recipe Box, Activity Ideas) move into your account once.

Setup lives in `good-company-setup.sql` (run once in the Supabase SQL editor). The site only contains the project URL and the publishable key, which are safe to be public; the rules in the database decide who can see what. Never put the secret/service_role key in these files.

## Editing

Everything is editable for anyone in a gathering's company: gatherings, recipes, activities, people, photos and the mood board. Click a pencil to swap a photo, click text to change it, and use the + buttons to add things. Changes save automatically ("saving… / saved" in the corner).

## How the kitchen math works

- **Market list.** Every recipe in a gathering adds its ingredients. Matching ingredients are added together (2 eggs + 1 egg = 3 eggs), and cups, tablespoons and teaspoons convert into each other.
- **Prep timeline.** Give a recipe a serve time and the itinerary works backward through its steps. Durations ("for 2 hours"), hands-off steps ("room temperature," "chill," "rest") and "overnight" become flags, and overnight steps move to the evening before.
- **Oven plan.** Oven temperatures and times are read from the steps ("Bake at 375 for 1 hour"). When two dishes need the oven at once, you get suggestions: a shared temperature with adjusted times, using a roast's rest window, or making a dish ahead and rewarming it.

Recipes work best when each step says how long it takes and what temperature it needs.

## Files

- `assets/js/cloud.js`: the Supabase connection (URL and publishable key at the top).
- `assets/js/content.js`: starter words and recipes.
- `images/`: photos.
- `assets/fonts/`: Paloma.
