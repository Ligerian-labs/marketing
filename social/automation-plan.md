# Social Media Automation Plan — Ligerian Labs

## Blog → Social Posts Pipeline

### Flow
```
Blog published (Astro RSS/webhook)
  → OpenClaw detects new post
  → Generates platform-specific content:
      → X: thread (summary + link)
      → IG: caption + carousel text (manual design trigger)
      → TikTok: script outline (manual filming trigger)
  → Human reviews/approves
  → Posts scheduled via API
```

### Trigger Options
1. **RSS polling** — Check `ligerianlabs.fr/rss.xml` every hour
2. **Git hook** — Post-deploy webhook triggers the pipeline
3. **Manual** — Command: `openclaw social publish --url <blog-url>`

---

## APIs & Tools

### X (Twitter) API v2
- **Endpoint:** `api.twitter.com/2/tweets`
- **Auth:** OAuth 2.0 (PKCE) or OAuth 1.0a
- **Free tier:** 1,500 tweets/month write (enough)
- **Can automate:** Tweets, threads, polls
- **Cannot:** DMs at free tier, analytics (need Basic $100/mo)

### Instagram Graph API (via Meta)
- **Endpoint:** `graph.facebook.com/v18.0/{ig-user-id}/media`
- **Auth:** Facebook App + long-lived token
- **Can automate:** Feed posts (single image, carousel), Reels (video URL)
- **Cannot:** Stories (not supported via API), DMs
- **Requires:** Facebook Page linked to IG Business account

### TikTok Content Posting API
- **Status:** Limited access, approval required
- **Can automate:** Video uploads with description
- **Cannot:** Most things — TikTok API is restrictive
- **Realistic approach:** Generate scripts + captions, film/post manually

---

## Automation vs Human Touch

### Fully Automatable ✅
- Blog → X thread generation and posting
- Blog → IG caption generation (text only)
- Scheduling posts at optimal times
- Hashtag insertion based on content category
- RSS monitoring for new blog posts
- Analytics collection and weekly reports

### Semi-Automated 🔄 (AI generates, human approves)
- Hot take tweets (AI drafts from AI news feeds)
- IG carousel text content (human designs slides)
- Reply suggestions for comments/DMs
- Content calendar generation

### Human Only ❌
- TikTok/Reel filming
- Behind-the-scenes photos
- Real-time engagement (conversations, community)
- Crisis management
- Approving anything that goes public

---

## OpenClaw Skill: `social-media`

### Proposed Structure
```
skills/social-media/
├── SKILL.md              # Skill description + usage
├── config.yaml           # API keys, account IDs, defaults
├── commands/
│   ├── publish.md        # Blog → social pipeline
│   ├── schedule.md       # Schedule a post for later
│   ├── draft.md          # Generate drafts for review
│   └── report.md         # Weekly analytics summary
├── templates/
│   ├── x-thread.md       # Template for blog → X thread
│   ├── x-take.md         # Template for hot takes
│   ├── ig-caption.md     # Template for IG captions
│   └── tiktok-script.md  # Template for TikTok scripts
└── cron/
    ├── rss-check.md      # Hourly: check for new blog posts
    └── weekly-report.md  # Monday: compile analytics
```

### Key Commands

**`openclaw social publish --url <blog-url>`**
1. Fetch and parse blog post
2. Generate X thread (5-8 tweets, French, with hashtags)
3. Generate IG caption (with hashtags)
4. Generate TikTok script outline
5. Present all drafts for approval
6. Post approved content via APIs

**`openclaw social draft --type <take|tip|engagement> --topic <topic>`**
1. Generate platform-appropriate draft
2. Save to review queue
3. Notify for approval

**`openclaw social report`**
1. Pull follower counts, engagement rates, top posts
2. Compare to previous week
3. Generate summary with recommendations

### Environment Variables
```
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
META_APP_ID=
META_APP_SECRET=
```

### Implementation Priority
1. **Phase 1:** Blog → X thread (highest ROI, easiest API)
2. **Phase 2:** Blog → IG caption generation (manual post)
3. **Phase 3:** Scheduling + analytics
4. **Phase 4:** TikTok script generation
