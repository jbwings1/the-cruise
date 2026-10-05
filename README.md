# Regan N Elaina's Wedding Cruise

Invite hub for Symphony of the Seas, September 19–25, 2027 (Fort Lauderdale).

## Open locally

Open [`index.html`](index.html) in a browser.

Because chat talks to Supabase over the network, serve the folder with a simple local server if the browser blocks modules/CDN (opening the file directly usually still works for this setup):

```bash
npx --yes serve .
```

## Cruise Chat

- Hub link: **Cruise Chat** → [`chat.html`](chat.html)
- Display name only (saved in the browser)
- Live group messages via Supabase Realtime
- Backend project: `the-cruise` on Supabase

## Who's Coming

- Hub link: **Who's Coming** → [`whos-coming.html`](whos-coming.html) (under Cruise Chat)
- Guests pick Bride or Groom, name their group, list each person, and how they booked
- Submissions stay pending until a host approves with the host PIN
- Public list shows Bride’s side / Groom’s side, group names, people, and a total count

## Pirate treasures (in progress)

- Captain’s cabin (direct link while building): [`pirates-cabin.html`](pirates-cabin.html)
- Walk the Plank game: [`walk-the-plank.html`](walk-the-plank.html)
- Edit quiz questions: [`walk-the-plank-questions.js`](walk-the-plank-questions.js)
- Home-page treasure chest link is intentionally not wired yet

## Edit later

- Hub background photo: [`images/hub-background.jpg`](images/hub-background.jpg)
- Banner / date text: [`index.html`](index.html)
- Wedding page URL: `CRUISE_WEDDING_PAGE_URL` in [`config.js`](config.js)
- Supabase URL/key: [`config.js`](config.js)
- Walk the Plank questions: [`walk-the-plank-questions.js`](walk-the-plank-questions.js)

## Repo

GitHub: [jbwings1/the-cruise](https://github.com/jbwings1/the-cruise)
