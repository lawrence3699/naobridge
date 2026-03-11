# NaoBridge (脑桥) — WeChat Mini Program Forum for Brain Injury Patients

## Project Overview

A WeChat Mini Program community forum ("脑桥") designed for brain injury patients (TBI, stroke, cerebral palsy, etc.) and their families. Built on principles of **humanitarianism** and **rationalism**, providing a safe, warm, and accessible online space for mutual support, recovery sharing, and science-based discussion.

**Core Principles (Non-negotiable):**

1. **Humanitarianism First** — User dignity and safety are the top priority. Zero tolerance for discrimination, mockery, or false medical information.
2. **Accessibility by Default** — The default UI must be simple, clear, large-font, and high-contrast. Accessibility is not an add-on mode.
3. **Rationalism as Guardian** — Encourage scientific discussion, flag unverified information, prevent pseudoscience and quack remedies.

**Product Name:** 脑桥 (NaoBridge)
**Platform:** WeChat Mini Program
**Target Users:** Brain injury patients, their families, and supporters

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | WeChat Mini Program native framework (WXML + WXSS + JS) |
| Backend | WeChat Cloud Development (微信云开发) |
| Cloud Functions | Node.js |
| Database | Cloud Database (NoSQL, MongoDB-like) |
| Storage | Cloud Storage (images, files) |
| Admin Panel | Web-based admin dashboard |

## Directory Structure

```
/wechatapp
├── CLAUDE.md              # This file — global project context
├── plan.md                # Full project plan (read-only reference)
├── project.config.json    # WeChat DevTools project config
├── miniprogram/           # Mini Program frontend code
│   ├── app.js             # App entry point
│   ├── app.json           # App global config (pages, tabBar, window)
│   ├── app.wxss           # Global styles
│   ├── pages/             # Page components
│   │   ├── index/         # Home page (post list + category tabs)
│   │   ├── post-detail/   # Post detail page (content + comments)
│   │   ├── create-post/   # Create post page (editor + image upload)
│   │   ├── profile/       # User profile / personal center
│   │   ├── messages/      # Notification center
│   │   ├── report/        # Report page
│   │   ├── community-rules/ # Community guidelines page
│   │   └── about/         # About us page
│   ├── components/        # Reusable components
│   ├── utils/             # Utility functions
│   ├── styles/            # Shared style variables and mixins
│   └── images/            # Static image assets
├── cloudfunctions/        # Cloud functions (each in its own directory)
│   ├── user/              # User registration, login, profile
│   ├── post/              # Create, read, update, delete posts
│   ├── comment/           # Create, read, delete comments
│   ├── report/            # Submit and manage reports
│   ├── admin/             # Admin operations
│   ├── upload/            # Image upload and processing
│   ├── sensitive-filter/  # Sensitive word filtering
│   └── notification/      # Push notifications
├── docs/                  # Project documentation
│   ├── api.md             # API documentation
│   ├── database.md        # Database schema documentation
│   └── deployment.md      # Deployment guide
└── admin/                 # Admin dashboard (Web)
    ├── index.html
    ├── css/
    └── js/
```

## Coding Standards

### Language Rules

- **All code comments:** English
- **All variable/function names:** English (camelCase for variables/functions, PascalCase for components)
- **All user-facing text:** Chinese (中文)
- **File names:** kebab-case (e.g., `post-detail`, `create-post`)

### CSS / WXSS Accessibility Standards (Mandatory)

```css
/* Minimum standards — every page must comply */
font-size: >= 16px;          /* Body text minimum */
font-size: >= 20px;          /* Headings */
line-height: 1.8;            /* Line spacing */
min-width: 44px;             /* Touch target minimum */
min-height: 44px;            /* Touch target minimum */
/* Color contrast ratio >= 4.5:1 (WCAG AA) */
/* Never use color alone to convey information */
/* All interactive elements must have clear focus states */
```

### Cloud Function Response Format

All cloud functions MUST return responses in this unified format:

```javascript
// Success
{
  code: 0,
  data: { /* response payload */ },
  message: ''
}

// Error
{
  code: 1001,  // see error codes below
  data: null,
  message: 'Human-readable error description in Chinese'
}
```

### Error Code Specification

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Operation completed successfully |
| `1001` | Parameter Error | Missing or invalid request parameters |
| `1002` | Permission Denied | User lacks required permissions |
| `1003` | Not Found | Requested resource does not exist |
| `1004` | Content Blocked | Content rejected by sensitive word filter |
| `1005` | Rate Limited | Too many requests, try again later |
| `2001` | Server Error | Internal server error |

## Database Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | `_openid`, `nickName`, `avatarUrl`, `role` (patient/family/supporter), `status` (normal/muted/banned), `muteExpiry`, `createdAt` |
| `posts` | Forum posts | `_id`, `authorId`, `title`, `content`, `images[]`, `category`, `status` (normal/hidden/deleted), `commentEnabled`, `isPinned`, `isFeatured`, `viewCount`, `likeCount`, `commentCount`, `createdAt` |
| `comments` | Comments on posts | `_id`, `postId`, `authorId`, `content`, `parentId` (for nested replies), `status`, `createdAt` |
| `reports` | User reports | `_id`, `reporterId`, `targetType` (post/comment/user), `targetId`, `reason`, `description`, `status` (pending/resolved/dismissed), `handlerId`, `result`, `createdAt` |
| `admins` | Admin accounts | `_openid`, `level` (super/normal), `permissions[]`, `createdAt` |
| `sensitive_words` | Sensitive word list | `_id`, `word`, `category` (ad/fraud/discrimination/medical-fraud/violence), `createdAt` |
| `likes` | Post likes | `_id`, `userId`, `postId`, `createdAt` |
| `favorites` | Saved posts | `_id`, `userId`, `postId`, `createdAt` |
| `notifications` | User notifications | `_id`, `userId`, `type` (comment/reply/system/report-result), `title`, `content`, `relatedId`, `isRead`, `createdAt` |

### Post Categories

| Key | Chinese Label | Emoji |
|-----|--------------|-------|
| `recovery` | 康复日记 | 💬 |
| `bci` | 脑机接口讨论 | 🔬 |
| `emotional` | 情感互助 | ❤️ |
| `knowledge` | 知识科普 | 📚 |
| `qa` | 求助问答 | ❓ |
| `free` | 自由话题 | 🗣️ |

## Security Principles

1. **Input Validation** — All user input must be validated and sanitized on the cloud function side. Never trust client-side data.
2. **Authentication** — Every cloud function must verify user identity via `wx.cloud.getWXContext()`. Reject unauthenticated requests.
3. **Authorization** — Admin operations must verify admin role before execution. Use middleware pattern for auth checks.
4. **Image Upload** — Restrict file types (jpg, jpeg, png, gif only), max size 5MB per image, max 9 images per post. Use cloud storage `tempFileURL`.
5. **Sensitive Word Filtering** — All user-generated text (posts, comments, nicknames) must pass through the sensitive word filter before saving.
6. **WeChat Content Security** — Integrate `security.msgSecCheck` API for text, `security.imgSecCheck` for images.
7. **Rate Limiting** — Implement rate limits on posting (max 10 posts/day), commenting (max 50 comments/day), and reporting.
8. **Data Privacy** — Minimize data collection. Never expose user `openid` to other users. Reporter identity must be kept confidential.
9. **Database Security Rules** — Configure cloud database permissions: users can only read/write their own data unless admin.

## Accessibility Design Principles

These are **default behaviors**, not optional features:

1. **Large Font Default** — Body text 16px minimum, headings 20px+, line-height 1.8
2. **High Contrast** — Color contrast ratio >= 4.5:1 (WCAG AA). Never rely on color alone for meaning.
3. **Large Touch Targets** — All clickable/tappable elements minimum 44x44px
4. **Minimal Steps** — Core flows (post, comment, report) complete in 3 steps or fewer
5. **Clear Feedback** — Every user action produces visible text feedback (success/failure toast or modal). Never use color-only feedback.
6. **No Auto-play** — No auto-playing media or animations that cannot be paused
7. **Semantic Markup** — Use appropriate ARIA roles and labels where supported by Mini Program framework
8. **Avoid Red/Green Distinction** — Do not use red vs green as the only way to differentiate states

## MVP Feature Scope (Phase 1)

- WeChat one-click login with profile setup (nickname, role tag, avatar)
- User agreement and community guidelines acceptance flow
- Post creation with text + images (up to 9), category selection required
- Post list with category tab filtering
- Post detail view with full content
- Comments with nested replies (2-level)
- Post owner can disable comments
- Report system (post/comment/user) with preset reason categories
- Sensitive word filtering on all user content
- Admin dashboard: content review, user management (mute/ban), basic stats, sensitive word management

## Phase 2 Features (Post-MVP)

- Search (keyword, tag, user)
- Like and favorite posts
- Notification center (comment alerts, report results, system announcements)
- Personal page (my posts, my comments, my favorites)
- Pin/feature posts (admin)
- User activity levels and badges

## WeChat Review Compliance

- Category: "Social > Community/Forum" (avoid medical category to reduce qualification requirements)
- Must integrate WeChat Content Security API (`security.msgSecCheck`, `security.imgSecCheck`)
- Must include complete privacy policy and user authorization flow
- Must demonstrate robust UGC management (report + review mechanism)
- Must include disclaimer: "本平台不提供医疗建议，内容仅供交流参考"

## Development Notes

- Use `wx.cloud` API for all backend calls — no external servers needed
- Each cloud function should be in its own directory under `/cloudfunctions`
- Use `db.command` for database query operators
- Prefer `async/await` over callbacks in cloud functions
- Use `db.collection().where().get()` pattern for queries
- Always handle errors with try/catch in cloud functions
- Use transactions for operations that modify multiple collections
