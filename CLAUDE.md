# NaoBridge (脑桥) — WeChat Mini Program Forum for Brain Injury Patients

## Project Overview

A WeChat Mini Program community forum ("脑桥") designed for brain injury patients (TBI, stroke, cerebral palsy, etc.) and their families. Built on principles of **humanitarianism** and **rationalism**, providing a safe, warm, and accessible online space for mutual support, recovery sharing, and science-based discussion.

**Core Principles (Non-negotiable):**

1. **Humanitarianism First** — User dignity and safety are the top priority. Zero tolerance for discrimination, mockery, or false medical information.
2. **Clean Forum Design** — UI based on egg-24time's card-based forum style with light blue theme (#4A90D9). Accessibility adaptations planned for Phase 2.
3. **Rationalism as Guardian** — Encourage scientific discussion, flag unverified information, prevent pseudoscience and quack remedies.

**Product Name:** 脑桥 (NaoBridge)
**Platform:** WeChat Mini Program
**Target Users:** Brain injury patients, their families, and supporters
**AppID:** wx7c18fe75931e9951

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | WeChat Mini Program native framework (WXML + WXSS + JS) |
| Backend | Egg.js (Node.js, Koa-based MVC framework) |
| Database | MySQL 8.0 (via Sequelize ORM) |
| Cache | Redis 6.0 (session/cache) |
| Deployment | WeChat Cloud Hosting (微信云托管) — Docker container |
| Storage | WeChat Cloud Storage (images, files) |
| Auth | JWT (email/password) + WeChat OpenID (wx.login) |
| Content Security | Local Trie-based filter + WeChat msgSecCheck API |
| Admin Panel | Web-based admin dashboard |

### Why WeChat Cloud Hosting (云托管)?

| Advantage | Description |
|-----------|-------------|
| **No domain needed** | Cloud Hosting provides internal endpoints — no domain purchase or ICP filing required |
| **Auto HTTPS** | TLS/SSL handled automatically by the platform |
| **Direct Mini Program access** | Use `wx.cloud.callContainer()` — no server domain whitelist needed |
| **Existing code reuse** | Egg.js backend deploys as-is via Docker, no rewrite |
| **Built-in MySQL & Redis** | Managed database services included |
| **Auto scaling** | Scales from 0 to handle traffic spikes |
| **Low cost** | Pay-per-use, free tier available |

## Directory Structure

```
/wechatapp
├── CLAUDE.md                 # This file — global project context
├── plan.md                   # Full project plan (read-only reference)
├── project.config.json       # WeChat DevTools project config
├── Dockerfile                # Docker build config for Cloud Hosting
├── .dockerignore             # Files excluded from Docker image
│
├── miniprogram/              # Mini Program frontend code
│   ├── app.js                # App entry (wx.cloud.init + auto-login)
│   ├── app.json              # App config (9 pages, tabBar, window)
│   ├── app.wxss              # Global styles
│   ├── pages/
│   │   ├── index/            # Home page (post list + category tabs)
│   │   ├── post-detail/      # Post detail page (content + comments)
│   │   ├── create-post/      # Create post page (editor + image upload)
│   │   ├── profile/          # User profile / WeChat login + registration
│   │   ├── messages/         # Notification center
│   │   ├── report/           # Report page
│   │   ├── community-rules/  # Community guidelines page
│   │   ├── about/            # About us page
│   │   └── privacy/          # Privacy policy + medical disclaimer
│   ├── components/           # Reusable components
│   ├── utils/
│   │   ├── api.js            # API layer (wx.cloud.callContainer wrapper)
│   │   ├── content-security.js  # Content security helpers
│   │   └── time.js           # Time formatting utilities
│   ├── styles/               # Shared style variables and mixins
│   └── images/               # Static image assets
│
├── server/                   # Egg.js backend (deployed via Docker)
│   ├── package.json          # Dependencies and scripts
│   ├── config/
│   │   ├── config.default.js      # Base config (JWT, wechat, naobridge limits)
│   │   ├── config.prod.js         # Production config (env vars for DB/Redis/JWT/WeChat)
│   │   ├── config.unittest.js     # Test config (SQLite in-memory)
│   │   ├── plugin.js              # Egg plugins (sequelize, validate, redis)
│   │   └── plugin.unittest.js     # Test plugin overrides (redis disabled)
│   ├── app/
│   │   ├── router.js              # 32 API routes
│   │   ├── controller/            # 6 controllers
│   │   │   ├── user.js            #   register, login, wxLogin, wxRegister, me, profile, follow
│   │   │   ├── post.js            #   create, list, show, update, destroy, like, favorite, report
│   │   │   ├── comment.js         #   create, reply, like, destroy
│   │   │   ├── notification.js    #   list, markRead, markAllRead, unreadCount
│   │   │   ├── admin.js           #   stats, reviewReport, mute/ban/unmute, words
│   │   │   └── channel.js         #   list, show
│   │   ├── service/               # 8 services
│   │   │   ├── user.js            #   register, login, wxLogin, wxRegister, profile, follow
│   │   │   ├── wechat.js          #   code2Session, checkTextSecurity, getAccessToken
│   │   │   ├── post.js            #   CRUD + like/favorite + sensitive & WeChat security check
│   │   │   ├── comment.js         #   create/reply/delete + sensitive & WeChat security check
│   │   │   ├── notification.js    #   list, markRead, markAllRead, unreadCount
│   │   │   ├── report.js          #   create report, duplicate check
│   │   │   ├── admin.js           #   stats, mute/ban, review, word management
│   │   │   └── channel.js         #   list, show
│   │   ├── model/                 # 13 Sequelize models
│   │   │   ├── user.js            #   + openid field (WeChat identity)
│   │   │   ├── userprofile.js
│   │   │   ├── user_follow.js
│   │   │   ├── post.js
│   │   │   ├── post_image.js
│   │   │   ├── post_comment.js
│   │   │   ├── post_like.js
│   │   │   ├── post_feedback.js
│   │   │   ├── favorite.js
│   │   │   ├── notification.js
│   │   │   ├── admin.js
│   │   │   ├── sensitive_word.js
│   │   │   └── channel.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   ├── check_status.js    # Block muted/banned users
│   │   │   └── error_handler.js   # Unified error code mapping
│   │   └── extend/
│   │       ├── filter.js          # Trie-based sensitive word filter
│   │       └── helper.js          # DB-dialect-safe helpers (safeDecrement)
│   ├── test/                      # 154 tests (90%+ coverage)
│   │   ├── .setup.js              # Bootstrap: sync models to SQLite
│   │   └── app/
│   │       ├── extend/
│   │       │   └── filter.test.js          # 26 tests — Trie filter unit tests
│   │       ├── middleware/
│   │       │   ├── auth.test.js            # 7 tests — JWT auth
│   │       │   ├── check_status.test.js    # 7 tests — mute/ban checks
│   │       │   └── error_handler.test.js   # 11 tests — error code mapping
│   │       ├── controller/
│   │       │   ├── user.test.js            # 19 tests — register, login, profile, follow
│   │       │   ├── wx-auth.test.js         # 10 tests — wx-login, wx-register
│   │       │   ├── post.test.js            # 23 tests — CRUD, like, favorite, report
│   │       │   ├── comment.test.js         # 11 tests — create, reply, delete
│   │       │   ├── notification.test.js    # 9 tests — list, read, unread-count
│   │       │   ├── admin.test.js           # 17 tests — stats, mute, ban, words
│   │       │   └── channel.test.js         # 4 tests — list, show
│   │       └── service/
│   │           ├── wechat.test.js          # 6 tests — code2Session, content security
│   │           └── content-security.test.js # 5 tests — post/comment integration
│   ├── scripts/
│   │   └── export-data.sh         # Data export from Alibaba Cloud MySQL
│   ├── db-cloud-hosting.sql       # Fresh schema for Cloud Hosting MySQL (13 tables + seed)
│   ├── db-migration.sql           # Incremental migration for existing tftime database
│   └── db-migration-openid.sql    # Add openid column to existing users table
│
├── docs/                     # Project documentation
│   ├── api.md                # API documentation
│   ├── database.md           # Database schema documentation
│   └── deployment.md         # Deployment guide
│
└── admin/                    # Admin dashboard (Web)
    ├── index.html
    ├── css/
    └── js/
```

## API Architecture

### Base URL

Frontend calls backend via WeChat Cloud Hosting container:

```javascript
// miniprogram/utils/api.js — request() function
wx.cloud.callContainer({
  config: { env: getApp().globalData.cloudEnv },
  path: '/api/v1/posts',
  method: 'GET',
  header: {
    'X-WX-SERVICE': 'naobridge-server',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
})
```

### Authentication Flow

**WeChat Users (Mini Program):**
1. Frontend calls `wx.login()` to get a temporary `code`
2. Frontend sends `code` to `POST /api/v1/wx-login`
3. Server calls WeChat `jscode2session` API to exchange `code` for `openid`
4. If `openid` exists in DB: return user + JWT token
5. If new user: return `{ isNewUser: true }`, frontend shows registration form
6. On registration: `POST /api/v1/wx-register` with `code`, `name`, `role`

**Admin Panel (Web):**
- Uses email/password login via `POST /api/v1/login` (kept for backwards compatibility)

### Route Summary (32 routes)

| Group | Method | Path | Auth | Description |
|-------|--------|------|------|-------------|
| Auth | POST | `/api/v1/register` | No | Register (email/password, for admin) |
| Auth | POST | `/api/v1/login` | No | Login (email/password, for admin) |
| Auth | POST | `/api/v1/wx-login` | No | WeChat login (code2Session) |
| Auth | POST | `/api/v1/wx-register` | No | WeChat register (openid + name + role) |
| User | GET | `/api/v1/user/me` | Yes | Get own profile with counts |
| User | PUT | `/api/v1/user/me` | Yes | Update own profile |
| User | GET | `/api/v1/users/:userId` | No | Get public profile |
| User | POST | `/api/v1/users/:userId/follow` | Yes | Toggle follow/unfollow |
| Posts | POST | `/api/v1/posts` | Yes+Status | Create post (+ sensitive filter + WeChat msgSecCheck) |
| Posts | GET | `/api/v1/posts` | No | List posts (paginated, filterable by category) |
| Posts | GET | `/api/v1/posts/feed` | Yes | Personalized feed |
| Posts | GET | `/api/v1/posts/:postId` | No | Show post with comments (2-level) |
| Posts | PUT | `/api/v1/posts/:postId` | Yes+Status | Update own post |
| Posts | DELETE | `/api/v1/posts/:postId` | Yes | Soft-delete own post |
| Posts | POST | `/api/v1/posts/:postId/like` | Yes | Toggle like |
| Posts | POST | `/api/v1/posts/:postId/report` | Yes | Report post |
| Posts | POST | `/api/v1/posts/:postId/favorite` | Yes | Toggle favorite |
| Comments | POST | `/api/v1/posts/:postId/comments` | Yes+Status | Create comment (+ security checks) |
| Comments | POST | `.../comments/:commentId/reply` | Yes+Status | Reply (2-level max) |
| Comments | POST | `.../comments/:commentId/like` | Yes | Toggle comment like |
| Comments | DELETE | `.../comments/:commentId` | Yes | Delete own comment (or post owner) |
| Notifications | GET | `/api/v1/notifications` | Yes | List notifications (paginated) |
| Notifications | PUT | `/api/v1/notifications/read-all` | Yes | Mark all as read |
| Notifications | GET | `/api/v1/notifications/unread-count` | Yes | Unread count |
| Notifications | PUT | `.../notifications/:id/read` | Yes | Mark one as read |
| Admin | GET | `/api/v1/admin/stats` | Yes+Admin | Dashboard stats |
| Admin | GET | `/api/v1/admin/reports` | Yes+Admin | List reports (paginated) |
| Admin | GET | `/api/v1/admin/content` | Yes+Admin | List content for moderation |
| Admin | POST | `.../admin/reports/:id/review` | Yes+Admin | Review report (delete/dismiss) |
| Admin | POST | `.../admin/users/:id/mute` | Yes+Admin | Mute user (with duration) |
| Admin | POST | `.../admin/users/:id/ban` | Yes+Admin | Ban user |
| Admin | POST | `.../admin/users/:id/unmute` | Yes+Admin | Unmute user |
| Admin | POST | `/api/v1/admin/words` | Yes+Admin | Add sensitive word |
| Admin | DELETE | `/api/v1/admin/words/:id` | Yes+Admin | Remove sensitive word |
| Channels | GET | `/api/v1/channels` | No | List channels |
| Channels | GET | `/api/v1/channels/:channelId` | No | Show channel |

### API Response Format

```javascript
// Success
{ code: 0, msg: 'ok', data: { /* payload */ } }

// Error (mapped by error_handler middleware)
{ code: 1001, data: null, message: 'Human-readable error description' }
```

### Error Code Specification

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `0` | 200/201 | Success |
| `1001` | 400/409/422 | Parameter Error / Validation Failed / Conflict |
| `1002` | 401/403 | Permission Denied / Unauthorized |
| `1003` | 404 | Not Found |
| `1004` | 400 | Content Blocked (sensitive words or WeChat security) |
| `1005` | 429 | Rate Limited |
| `2001` | 500 | Server Error |

## Database Schema (MySQL + Sequelize)

### Tables (13 total)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `id`, `name`, `email`, `password` (bcrypt), `avatar`, `role` (patient/family/supporter), `status` (normal/muted/banned), `muteExpiry`, `agreedToRules`, `openid` (WeChat, unique, nullable) |
| `userprofiles` | Extended profile | `id`, `userId`, `about_me`, `city` |
| `user_follows` | Follow relationships | `id`, `followerId`, `followingId` (unique pair) |
| `posts` | Forum posts | `id`, `userId`, `channelId`, `title`, `content`, `category` (6 values), `is_valid` (soft delete), `commentEnabled`, `isPinned`, `isFeatured`, `num_views`, `num_likes`, `num_comments` |
| `post_images` | Post image URLs | `id`, `postId`, `userId`, `url` |
| `post_comments` | Comments (2-level) | `id`, `userId`, `postId`, `postCommentId` (parent, null=top-level), `content`, `num_likes` |
| `post_likes` | Likes | `id`, `userId`, `postId`, `postCommentId` |
| `post_feedbacks` | Reports | `id`, `userId`, `postId`, `reason` (5 types), `description`, `targetType`, `targetId`, `status` (PENDING/PROCESSED/REFUSED), `handlerId`, `result` |
| `favorites` | Saved posts | `id`, `userId`, `postId` (unique pair) |
| `notifications` | User notifications | `id`, `userId`, `type` (comment/reply/system/report-result), `title`, `content`, `relatedId`, `isRead` |
| `admins` | Admin records | `id`, `userId` (unique), `level` (super/normal) |
| `sensitive_words` | Filter word list | `id`, `word` (unique), `category` (ad/fraud/discrimination/medical-fraud/violence) |
| `channels` | Content channels | `id`, `name`, `description`, `avatar` |

### Post Categories

| Key | Chinese Label |
|-----|--------------|
| `recovery` | 康复日记 |
| `bci` | 脑机接口 |
| `knowledge` | 知识科普 |
| `qa` | 求助问答 |
| `free` | 自由话题 |

## Content Security (Dual-layer)

All user-generated text (posts, comments, nicknames) goes through two checks:

1. **Local Trie-based filter** (`app/extend/filter.js`) — instant, checks against `sensitive_words` table (27 seeded words across 5 categories)
2. **WeChat msgSecCheck API** (`app/service/wechat.js`) — calls WeChat's content security API with **graceful degradation**: if the API is unreachable or fails, the post/comment is still allowed (relying on the local filter only). This prevents WeChat API downtime from blocking all content creation.

The security check runs in `post.create()` and `comment.create()` service methods.

## Coding Standards

### Language Rules

- **All code comments:** English
- **All variable/function names:** English (camelCase for variables/functions, PascalCase for components)
- **All user-facing text:** Chinese (中文)
- **File names:** kebab-case (e.g., `post-detail`, `create-post`)

### CSS / WXSS Design Standards

```css
/* Based on egg-24time card-based forum style */
/* Primary color: #4A90D9 (light blue) */
/* Page background: #F2F1F6 */
/* Card separators: 5px #F2F1F6 solid */
/* Body text: 32rpx, color #444 */
/* Secondary text: 28rpx, color #888 */
/* Avatar: 72rpx circle with border-radius */
/* Layout: Flexbox utility classes */
```

## Security Principles

1. **Input Validation** — All user input validated via egg-validate on the server side. Never trust client-side data.
2. **Authentication** — Dual auth: JWT for email/password users, WeChat OpenID (via `code2Session`) for Mini Program users. Token payload: `{ id, name, role, status }`. Verified by `auth` middleware.
3. **Authorization** — Admin operations verified via `admins` table lookup. User status checked by `checkStatus` middleware (blocks banned/muted users).
4. **Password Security** — bcrypt with 10 salt rounds. Passwords never returned in API responses. WeChat OpenID users have auto-generated placeholder passwords.
5. **Image Upload** — Restrict file types (jpg, jpeg, png, gif only), max size 5MB per image, max 9 images per post.
6. **Sensitive Word Filtering** — Trie-based filter (`app/extend/filter.js`). All user-generated text (posts, comments, nicknames) checked before saving.
7. **WeChat Content Security** — `security.msgSecCheck` integrated in post and comment creation services. Graceful degradation on API failure (falls back to local filter only). Image security check pending.
8. **Rate Limiting** — Max 10 posts/day, 50 comments/day (configured in `config.naobridge`).
9. **Error Handler** — `error_handler` middleware catches all errors, maps to unified error codes, hides internal details from clients.
10. **No Hardcoded Secrets** — Production config (`config.prod.js`) reads all credentials from environment variables. Required: `MYSQL_USERNAME`, `MYSQL_PASSWORD`, `JWT_SECRET`. Optional: `WX_APPID`, `WX_APPSECRET`, `REDIS_ADDRESS`.

## Frontend Design

Based on [egg-24time](https://github.com/seasonstar/weapp-24time) forum framework with light blue theme.

**Design System:**
- **Style:** Card-based feed, Twitter/Weibo-inspired, clean and minimal
- **Primary color:** `#4A90D9` (light blue)
- **Page background:** `#F2F1F6`
- **Card background:** `#FFFFFF` with `5px #F2F1F6` separator borders
- **Text colors:** `#444` (primary), `#888` (secondary/time)
- **Layout:** Flexbox utility classes (`.flex`, `.flex-row`, `.flex-auto`, `.flex-vcenter`)
- **Icons:** Image-based (not icon fonts)
- **FAB button:** Fixed bottom-right, light blue circle, for creating posts

**Accessibility (Phase 2):**
- Large font adaptation, high contrast mode, large touch targets — planned for post-MVP

## MVP Feature Scope (Phase 1)

- WeChat one-click login with profile setup (nickname, role tag)
- User agreement and community guidelines acceptance flow
- Post creation with text + images (up to 9), category selection required
- Post list with category tab filtering
- Post detail view with full content and comments
- Comments with nested replies (2-level)
- Post owner can disable comments
- Like and favorite posts
- Report system (post/comment/user) with preset reason categories
- Sensitive word filtering + WeChat content security on all user content
- Notification center (comment alerts, report results, system announcements)
- Admin dashboard: content review, user management (mute/ban), basic stats, sensitive word management
- Privacy policy page with medical disclaimer

## Phase 2 Features (Post-MVP)

- Search (keyword, tag, user)
- Personal page (my posts, my comments, my favorites)
- Pin/feature posts (admin)
- User activity levels and badges
- WeChat image security check (`imgSecCheck`)
- Account linking (existing email users → WeChat OpenID)

## WeChat Review Compliance

- Category: "Social > Community/Forum" (avoid medical category to reduce qualification requirements)
- WeChat Content Security API (`security.msgSecCheck`) integrated for text content
- Privacy policy page at `pages/privacy/privacy` with data collection disclosure
- Medical disclaimer: "本平台不提供医疗建议，内容仅供交流参考"
- Community guidelines acceptance flow before registration
- Report mechanism accessible on all posts and comments
- Admin review system for reported content

## Testing

- **Framework:** egg-bin (Mocha-based) + egg-mock + supertest
- **Test DB:** SQLite in-memory (via `config.unittest.js`)
- **Coverage:** 90.86% lines, 90.75% statements, 96.32% functions
- **Test count:** 154 tests across 14 test files
- **Run tests:** `cd server && npm test`
- **Run coverage:** `cd server && npm run cov`

### Test File Summary

| File | Tests | Scope |
|------|-------|-------|
| `extend/filter.test.js` | 26 | Trie-based sensitive word filter |
| `middleware/auth.test.js` | 7 | JWT authentication |
| `middleware/check_status.test.js` | 7 | Muted/banned user blocking |
| `middleware/error_handler.test.js` | 11 | Error code mapping |
| `controller/user.test.js` | 19 | Register, login, profile, follow |
| `controller/wx-auth.test.js` | 10 | WeChat login, register, edge cases |
| `controller/post.test.js` | 23 | CRUD, like, favorite, report |
| `controller/comment.test.js` | 11 | Create, reply, 2-level nesting, delete |
| `controller/notification.test.js` | 9 | List, read, unread-count, pagination |
| `controller/admin.test.js` | 17 | Stats, mute, ban, unmute, words, reports |
| `controller/channel.test.js` | 4 | List, show |
| `service/wechat.test.js` | 6 | code2Session, content security, degradation |
| `service/content-security.test.js` | 5 | Post/comment creation with WeChat check |

## Cloud Hosting Deployment

### Environment Variables (Required)

Set these in the Cloud Hosting service configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_ADDRESS` | Cloud Hosting MySQL `host:port` | `10.0.0.1:3306` |
| `MYSQL_USERNAME` | Database username | `root` |
| `MYSQL_PASSWORD` | Database password | *(secret)* |
| `MYSQL_DBNAME` | Database name | `naobridge` |
| `JWT_SECRET` | JWT signing secret (rotate from dev) | *(secret, min 32 chars)* |
| `WX_APPID` | Mini Program AppID | `wx7c18fe75931e9951` |
| `WX_APPSECRET` | Mini Program AppSecret | *(from WeChat admin console)* |
| `REDIS_ADDRESS` | Cloud Hosting Redis `host:port` (optional) | `10.0.0.2:6379` |
| `REDIS_PASSWORD` | Redis password (optional) | *(secret)* |

### Deployment Steps

1. **Open Cloud Hosting** in WeChat Mini Program admin panel (mp.weixin.qq.com)
2. **Create service** named `naobridge-server`, set container port to `7001`
3. **Enable managed MySQL** — create database `naobridge`
4. **Run schema** — execute `server/db-cloud-hosting.sql` on the managed MySQL
5. **Set environment variables** — configure all required env vars above
6. **Build & push Docker image** via WeChat DevTools CLI or admin console
7. **(Optional) Migrate data** from Alibaba Cloud:
   - Run `server/db-migration-openid.sql` on old MySQL (adds `openid` column)
   - Run `server/scripts/export-data.sh` to export data
   - Import exported SQL files into Cloud Hosting MySQL
8. **Update `miniprogram/app.js`** — set `globalData.cloudEnv` to actual Cloud Hosting environment ID
9. **Upload Mini Program** via WeChat DevTools
10. **Test in preview mode** — verify WeChat login, post creation, comments, notifications
11. **Submit for WeChat review**

### Docker Configuration

- **Base image:** `node:18-alpine`
- **Start command:** `npm run docker-start` (foreground mode, no `--daemon`)
- **Port:** 7001
- **Production deps only:** `npm ci --production` (excludes `sqlite3` devDependency)

### Previous Interim Server (to be decommissioned)

The backend was deployed at 8.141.95.103 (Alibaba Cloud) during development. This server will be decommissioned after Cloud Hosting deployment is confirmed stable.
