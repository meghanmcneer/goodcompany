# Good Company

A planning book for long tables. Plain HTML, CSS and JavaScript with no build step, so GitHub Pages can host it for free.

## Put it on GitHub (one time, about 5 minutes)

1. Sign in at github.com, click **+ → New repository**, name it `good-company`, set it to **Public**, and click **Create repository**.
2. On the new repo page, click **uploading an existing file**. Drag in everything inside this folder (`index.html`, `gathering.html`, `recipes.html`, `assets`, `images`, `README.md`), then click **Commit changes**.
3. Go to **Settings → Pages**. Under "Branch," choose **main** and **/ (root)**, then click **Save**.
4. After a minute or two, the site is live at `https://YOUR-USERNAME.github.io/good-company/`. Anyone can open it without logging in.

## Profiles (prototype)

The first screen asks people to create a profile (name, email, guest archetype, favorite things, allergies, photo) or log in. After that, home has two choices: **Inspiration** (a placeholder for now) and **Plan a gathering**.

In The Company tab, edit mode lets you search friends' profiles and add them as guests. Their photo, archetype, favorite things and allergies show up automatically.

Right now profiles live in each person's browser, so friends you can find are anyone who made a profile on the same device. Making profiles shared between people needs a small backend (Supabase or Firebase, both free to start). Everything in `assets/js/auth.js` is set up to swap that in. Profiles are never included in "export for GitHub," so emails don't end up public.

## Editing (pencils, recipes, the plan)

Add `?edit` to the end of any page address, for example:
`https://YOUR-USERNAME.github.io/good-company/gathering.html?edit`

Edit mode turns on these tools:
- **Pencils** on every image let you upload a new photo.
- **Add buttons** for recipes, activities, scrapbook links, market items, guests and itinerary items.
- **Paste a link** in the Recipe Box pulls in the title, photo, ingredients and steps.
- **Recipe drawers** let you set a serve day and time (this builds the prep timeline and oven plan) and leave a star rating and notes on how it went.

Edits are saved in your browser first, so nothing goes public by accident. To publish:

1. Click **export for GitHub** in the bar at the bottom. It downloads `good-company-update.zip`.
2. Unzip it. On GitHub, open the repo, click **Add file → Upload files**, drag in the `assets` and `images` folders from the zip, and commit.
3. Once that's live, click **discard edits** in the edit bar so your browser shows the published version again.

Click **exit** to leave edit mode. Visitors never see the pencils.

## How the kitchen math works

- **Market list.** Every recipe in a gathering adds its ingredients. Matching ingredients are added together (2 eggs + 1 egg = 3 eggs), and cups, tablespoons and teaspoons convert into each other.
- **Prep timeline.** Give a recipe a serve time and the itinerary works backward through its steps. Durations ("for 2 hours"), hands-off steps ("room temperature," "chill," "rest") and "overnight" become flags, and overnight steps move to the evening before.
- **Oven plan.** Oven temperatures and times are read from the steps ("Bake at 375 for 1 hour"). When two dishes need the oven at once, you get suggestions: a shared temperature with adjusted times, using a roast's rest window, or making a dish ahead and rewarming it.

Recipes work best when each step says how long it takes and what temperature it needs.

## Files

- `assets/js/content.js`: all the words and recipes. You can also edit this by hand.
- `images/`: photos.
- `assets/fonts/`: Paloma.
