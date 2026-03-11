# 脑桥 (NaoBridge) — Database Schema Documentation

## Overview

All data is stored in WeChat Cloud Database (NoSQL, MongoDB-like). Each collection is documented below with field definitions, indexes, and access patterns.

---

## Collections

### 1. `users`

User profiles created on registration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `_openid` | string | auto | WeChat OpenID (never exposed to frontend) |
| `nickName` | string | yes | Display name, 1–20 characters |
| `avatarUrl` | string | no | Avatar image URL |
| `role` | string | yes | `patient` / `family` / `supporter` |
| `status` | string | yes | `normal` / `muted` / `banned` |
| `muteExpiry` | date | no | Mute expiration timestamp (null if not muted) |
| `agreedToRules` | boolean | yes | Community rules acceptance |
| `createdAt` | date | yes | Registration timestamp |
| `updatedAt` | date | yes | Last profile update |

**Indexes:**
- `_openid` (unique) — login lookup
- `status` — admin filtering

**Access rules:**
- Users can read/write only their own record
- Admin can read/write all records

---

### 2. `posts`

Forum posts created by users.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `authorId` | string | yes | Author's `_openid` |
| `authorName` | string | yes | Denormalized author nickname |
| `authorAvatar` | string | no | Denormalized author avatar |
| `title` | string | yes | Post title |
| `content` | string | yes | Post body, 10–5000 characters |
| `images` | array | no | Image URLs, max 9 |
| `category` | string | yes | See category table below |
| `status` | string | yes | `normal` / `hidden` / `deleted` |
| `commentEnabled` | boolean | yes | Whether comments are allowed (default: true) |
| `isPinned` | boolean | yes | Admin-pinned post (default: false) |
| `isFeatured` | boolean | yes | Admin-featured post (default: false) |
| `viewCount` | number | yes | View counter (default: 0) |
| `likeCount` | number | yes | Like counter (default: 0) |
| `commentCount` | number | yes | Comment counter (default: 0) |
| `createdAt` | date | yes | Creation timestamp |
| `updatedAt` | date | yes | Last update timestamp |

**Categories:**

| Key | Label | Emoji |
|-----|-------|-------|
| `recovery` | 康复日记 | 💬 |
| `bci` | 脑机接口讨论 | 🔬 |
| `emotional` | 情感互助 | ❤️ |
| `knowledge` | 知识科普 | 📚 |
| `qa` | 求助问答 | ❓ |
| `free` | 自由话题 | 🗣️ |

**Indexes:**
- `category` + `createdAt` (compound) — category listing
- `authorId` — user's posts
- `status` + `createdAt` — admin content list

**Access rules:**
- Anyone can read `status: 'normal'` posts
- Author can update/soft-delete own posts
- Admin can update any post status

---

### 3. `comments`

Comments on posts, supporting 2-level nesting.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `postId` | string | yes | Parent post ID |
| `authorId` | string | yes | Commenter's `_openid` |
| `authorName` | string | yes | Denormalized author nickname |
| `authorAvatar` | string | no | Denormalized author avatar |
| `content` | string | yes | Comment text, 1–500 characters |
| `parentId` | string | no | Parent comment ID (for replies, null for top-level) |
| `replyToName` | string | no | Name of user being replied to |
| `status` | string | yes | `normal` / `hidden` / `deleted` |
| `createdAt` | date | yes | Creation timestamp |

**Nesting model:**
- Top-level comments: `parentId` is null/undefined
- Replies: `parentId` points to a top-level comment
- Max depth: 2 levels (no nested replies to replies)

**Indexes:**
- `postId` + `createdAt` — comment listing
- `authorId` — user's comments
- `parentId` — reply lookup

**Access rules:**
- Anyone can read `status: 'normal'` comments
- Comment author can delete own comments
- Post author can delete any comment on their post

---

### 4. `reports`

User-submitted reports against content or users.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `reporterId` | string | yes | Reporter's `_openid` (kept confidential) |
| `targetType` | string | yes | `post` / `comment` / `user` |
| `targetId` | string | yes | ID of reported resource |
| `reason` | string | yes | `medical-fraud` / `ad-spam` / `harassment` / `violence` / `other` |
| `description` | string | conditional | Required if reason is `other` |
| `status` | string | yes | `pending` / `resolved` / `dismissed` |
| `handlerId` | string | no | Admin who handled the report |
| `result` | string | no | Admin's decision note |
| `resolvedAt` | date | no | Resolution timestamp |
| `createdAt` | date | yes | Creation timestamp |

**Indexes:**
- `status` + `createdAt` — admin report queue
- `reporterId` — user's own reports
- `targetType` + `targetId` + `reporterId` — duplicate prevention

**Privacy:**
- Reporter identity (`reporterId`) is never returned to the frontend
- Only admin can see reporter information

---

### 5. `notifications`

Push notifications for users.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `userId` | string | yes | Recipient's `_openid` |
| `type` | string | yes | `comment` / `reply` / `system` / `report-result` |
| `title` | string | yes | Notification title |
| `content` | string | yes | Notification body |
| `relatedId` | string | no | ID of related post/comment/report |
| `isRead` | boolean | yes | Read status (default: false) |
| `createdAt` | date | yes | Creation timestamp |

**Indexes:**
- `userId` + `createdAt` — user's notification list
- `userId` + `isRead` — unread count

**Access rules:**
- Users can only read/update their own notifications

---

### 6. `admins`

Admin account records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `_openid` | string | yes | Admin's WeChat OpenID |
| `level` | string | yes | `super` / `normal` |
| `permissions` | array | no | Specific permission list |
| `createdAt` | date | yes | Creation timestamp |

**Access rules:**
- Only readable by cloud functions (server-side verification)
- Super admin can manage normal admin records

---

### 7. `sensitive_words`

Sensitive word dictionary for content filtering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `word` | string | yes | The sensitive word/phrase |
| `category` | string | yes | `ad` / `fraud` / `discrimination` / `medical-fraud` / `violence` |
| `createdAt` | date | yes | Creation timestamp |

**Indexes:**
- `word` (unique) — duplicate prevention
- `category` — category filtering

**Seed data:** 27 default words across 5 categories (see `cloudfunctions/sensitive-filter/seed-words.json`).

---

### 8. `likes`

Post like records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `userId` | string | yes | User's `_openid` |
| `postId` | string | yes | Liked post ID |
| `createdAt` | date | yes | Timestamp |

**Indexes:**
- `userId` + `postId` (unique compound) — prevent double-likes

---

### 9. `favorites`

Saved/bookmarked posts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string | auto | Document ID |
| `userId` | string | yes | User's `_openid` |
| `postId` | string | yes | Favorited post ID |
| `createdAt` | date | yes | Timestamp |

**Indexes:**
- `userId` + `postId` (unique compound) — prevent duplicates
- `userId` + `createdAt` — user's favorites list

---

## Database Security Rules

Configure in WeChat Cloud Console for each collection:

| Collection | Read | Write |
|------------|------|-------|
| `users` | Own data only | Own data only |
| `posts` | All (normal status) | Own data only |
| `comments` | All (normal status) | Own data only |
| `reports` | Own data only | Creator only |
| `notifications` | Own data only | Cloud function only |
| `admins` | Cloud function only | Cloud function only |
| `sensitive_words` | Cloud function only | Cloud function only |
| `likes` | Own data only | Own data only |
| `favorites` | Own data only | Own data only |

> Note: Cloud functions run with admin privileges and bypass these rules. The security rules above apply to direct client-side database access, which this project avoids — all data access goes through cloud functions.

---

## Data Relationships

```
users ─┬─< posts ──< comments
       │              │
       ├─< likes ─────┘ (via postId)
       ├─< favorites ─┘
       ├─< reports
       ├─< notifications
       └─< admins

sensitive_words (standalone, used by filter engine)
```

## Data Privacy Notes

1. `_openid` is never returned to the frontend — `sanitizeUser()` strips it
2. Reporter identity (`reporterId`) is kept confidential from reported users
3. Admin operations are logged with `handlerId` for audit trail
4. Soft delete is used everywhere — no data is permanently removed through the API
