# NewPad Backend

Express backend for NewPad. Serves real facility data from the Medicare Care Compare API.

Built by [Mike Gracen](https://github.com/mgracen).

---

## Stack

| Layer | Service | Cost |
|---|---|---|
| Backend | Railway | Free tier |
| Facility data | Medicare Care Compare API | Free, no key required |

---

## Deploy to Railway

- Create a free account at [railway.app](https://railway.app)
- Connect your GitHub account
- Create a new project, deploy from GitHub repo, select **newpad-backend**
- No environment variables required to start
- Generate a domain in Settings under Networking
- Copy the Railway URL - you'll need it for the frontend

---

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /search | Search facilities by zip, care type, budget |
| GET | /facility/:id | Full detail for one facility |
| POST | /claim-interest | Capture facility email for future paid tier |

---

## Files

```
newpad-backend/
├── server.js      Express backend, queries Medicare Care Compare API
├── package.json   Dependencies
└── .nvmrc         Tells Railway to use Node 20
```

---

## Data source

All facility data comes from the [Medicare Care Compare API](https://data.cms.gov/provider-data) - the official U.S. government database. Free, public, no API key required.

---

## License

Personal use. Do whatever you want with it.
