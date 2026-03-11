# 脑桥 (NaoBridge) — API Documentation

## Overview

All backend APIs are implemented as WeChat Cloud Functions. The frontend calls them via `wx.cloud.callFunction()`. Each cloud function receives an `action` parameter to route to the appropriate handler.

## Unified Response Format

All endpoints return:

```javascript
// Success
{ code: 0, data: { /* payload */ }, message: '' }

// Error
{ code: 1001, data: null, message: '错误描述' }
```

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Operation completed |
| `1001` | Parameter Error | Missing or invalid parameters |
| `1002` | Permission Denied | Unauthorized (banned/muted/not admin) |
| `1003` | Not Found | Resource does not exist |
| `1004` | Content Blocked | Sensitive word filter triggered |
| `1005` | Rate Limited | Too many requests (reserved) |
| `2001` | Server Error | Internal error |

---

## 1. User API

**Cloud Function:** `user`

### 1.1 Login

| Field | Value |
|-------|-------|
| Action | `login` |
| Auth | OPENID (auto-injected) |

**Parameters:** None

**Response:**
```javascript
{
  isNewUser: true,  // false if already registered
  user: null        // user object if registered
}
```

**Errors:** `1002` if user is banned.

---

### 1.2 Register

| Field | Value |
|-------|-------|
| Action | `register` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `nickName` | string | yes | 1–20 characters |
| `role` | string | yes | `patient` / `family` / `supporter` |
| `avatarUrl` | string | no | URL string |

**Response:**
```javascript
{
  user: {
    _id, nickName, role, avatarUrl, status,
    agreedToRules, createdAt, updatedAt
  }
}
```

**Errors:** `1001` if invalid params or already registered.

---

### 1.3 Get Profile

| Field | Value |
|-------|-------|
| Action | `getProfile` |
| Auth | OPENID |

**Parameters:** None

**Response:** Sanitized user object (no `_openid`).

**Errors:** `1003` if user not found.

---

### 1.4 Update Profile

| Field | Value |
|-------|-------|
| Action | `updateProfile` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `nickName` | string | no | 1–20 characters |
| `avatarUrl` | string | no | URL string |

**Errors:** `1001` if nickname empty/too long. `1002` if banned/muted.

---

## 2. Post API

**Cloud Function:** `post`

### 2.1 Create Post

| Field | Value |
|-------|-------|
| Action | `create` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | yes | Non-empty |
| `content` | string | yes | 10–5000 characters |
| `category` | string | yes | `recovery` / `bci` / `emotional` / `knowledge` / `qa` / `free` |
| `images` | array | no | Max 9 items |

**Response:**
```javascript
{ postId: "xxx" }
```

**Errors:** `1001` invalid params. `1002` banned/muted. `1004` sensitive content.

**Side effects:** Title and content are filtered through sensitive word Trie.

---

### 2.2 Get Post List

| Field | Value |
|-------|-------|
| Action | `list` |
| Auth | none required |

**Parameters:**

| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `category` | string | no | all | Valid category |
| `page` | number | no | 1 | >= 1 |
| `pageSize` | number | no | 20 | Max 50 |

**Response:**
```javascript
{
  posts: [ /* post objects */ ],
  pagination: { page, pageSize, total }
}
```

Only returns posts with `status: 'normal'`, ordered by `createdAt` descending.

---

### 2.3 Get Post Detail

| Field | Value |
|-------|-------|
| Action | `detail` |
| Auth | none required |

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `postId` | string | yes |

**Response:** Full post object + sanitized author info (no `_openid`).

**Side effects:** Increments `viewCount` by 1.

**Errors:** `1001` missing postId. `1003` not found or deleted.

---

### 2.4 Update Post

| Field | Value |
|-------|-------|
| Action | `update` |
| Auth | OPENID (owner only) |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `postId` | string | yes | |
| `title` | string | no | Non-empty |
| `content` | string | no | 10–5000 characters |
| `category` | string | no | Valid category |

**Errors:** `1002` if not owner. `1003` not found.

---

### 2.5 Delete Post

| Field | Value |
|-------|-------|
| Action | `delete` |
| Auth | OPENID (owner only) |

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `postId` | string | yes |

**Behavior:** Soft delete — sets `status` to `'deleted'`.

**Errors:** `1002` if not owner. `1003` not found.

---

## 3. Comment API

**Cloud Function:** `comment`

### 3.1 Create Comment

| Field | Value |
|-------|-------|
| Action | `create` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `postId` | string | yes | |
| `content` | string | yes | 1–500 characters |
| `parentId` | string | no | Must be top-level comment in same post |

**Response:**
```javascript
{ commentId: "xxx" }
```

**Side effects:** Increments post `commentCount`. Only 2-level nesting supported.

**Errors:** `1001` invalid params. `1002` banned/muted. `1003` post not found. `1004` sensitive content. `1002` if comments disabled on post.

---

### 3.2 Get Comment List

| Field | Value |
|-------|-------|
| Action | `list` |
| Auth | none required |

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `postId` | string | yes |

**Response:**
```javascript
{
  comments: [
    {
      _id, postId, authorId, authorName, content, createdAt,
      replies: [ /* nested reply objects */ ]
    }
  ]
}
```

Returns only `status: 'normal'` comments, ordered by `createdAt` ascending. Max 500.

---

### 3.3 Delete Comment

| Field | Value |
|-------|-------|
| Action | `delete` |
| Auth | OPENID (comment author or post author) |

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `commentId` | string | yes |

**Side effects:** Decrements post `commentCount`. Soft delete.

**Errors:** `1002` if not comment author or post author. `1003` not found.

---

## 4. Report API

**Cloud Function:** `report`

### 4.1 Create Report

| Field | Value |
|-------|-------|
| Action | `create` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `targetType` | string | yes | `post` / `comment` / `user` |
| `targetId` | string | yes | |
| `reason` | string | yes | `medical-fraud` / `ad-spam` / `harassment` / `violence` / `other` |
| `description` | string | conditional | Required if reason is `other` |

**Response:**
```javascript
{ reportId: "xxx" }
```

**Duplicate prevention:** Cannot submit pending report for same target.

**Privacy:** Reporter identity never exposed in responses.

---

### 4.2 Get My Reports

| Field | Value |
|-------|-------|
| Action | `myReports` |
| Auth | OPENID |

**Parameters:** None

**Response:**
```javascript
{
  reports: [ /* report objects, max 50 */ ]
}
```

---

## 5. Notification API

**Cloud Function:** `notification`

### 5.1 Create Notification (internal use)

| Field | Value |
|-------|-------|
| Action | `create` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `userId` | string | yes | Target user |
| `type` | string | yes | `comment` / `reply` / `system` / `report-result` |
| `title` | string | yes | Non-empty |
| `content` | string | yes | Non-empty |
| `relatedId` | string | no | Link to related resource |

**Response:**
```javascript
{ notificationId: "xxx" }
```

---

### 5.2 Get Notification List

| Field | Value |
|-------|-------|
| Action | `list` |
| Auth | OPENID |

**Parameters:**

| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `page` | number | no | 1 | >= 1 |
| `pageSize` | number | no | 20 | Max 50 |

**Response:**
```javascript
{
  notifications: [ /* notification objects */ ],
  pagination: { page, pageSize, total }
}
```

---

### 5.3 Mark Read

| Field | Value |
|-------|-------|
| Action | `markRead` |
| Auth | OPENID (owner only) |

**Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `notificationId` | string | yes |

---

### 5.4 Mark All Read

| Field | Value |
|-------|-------|
| Action | `markAllRead` |
| Auth | OPENID |

**Parameters:** None

---

### 5.5 Get Unread Count

| Field | Value |
|-------|-------|
| Action | `unreadCount` |
| Auth | OPENID |

**Parameters:** None

**Response:**
```javascript
{ count: 5 }
```

---

## 6. Sensitive Filter API

**Cloud Function:** `sensitive-filter`

### 6.1 Check Text

**Parameters:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `text` | string | yes | Text to check |
| `scene` | string | yes | `post` / `comment` / `nickname` |

**Response (safe):**
```javascript
{ safe: true, keywords: [], filtered: "original text" }
```

**Response (blocked):**
```javascript
{ code: 1004, safe: false, keywords: ["word1"], filtered: "***ed text" }
```

Uses Trie-based algorithm for efficient matching. Loads words from `sensitive_words` collection.

---

## 7. Admin API

**Cloud Function:** `admin`

All admin endpoints verify the caller exists in the `admins` collection. Returns `1002` if not admin.

### 7.1 Get Stats — `stats`

Returns `{ totalUsers, totalPosts, totalComments, pendingReports }`.

### 7.2 Review Report — `reviewReport`

| Param | Type | Required |
|-------|------|----------|
| `reportId` | string | yes |
| `action` | string | yes (`delete` / `dismiss`) |
| `resultNote` | string | no |

`delete` hides target content + resolves report. `dismiss` marks report as dismissed.

### 7.3 Mute User — `muteUser`

| Param | Type | Required |
|-------|------|----------|
| `targetOpenid` | string | yes |
| `duration` | number | yes (`7` / `30` / `-1` permanent) |

### 7.4 Ban User — `banUser`

| Param | Type | Required |
|-------|------|----------|
| `targetOpenid` | string | yes |

### 7.5 Unmute User — `unmuteUser`

| Param | Type | Required |
|-------|------|----------|
| `targetOpenid` | string | yes |

### 7.6 Add Sensitive Word — `addWord`

| Param | Type | Required |
|-------|------|----------|
| `word` | string | yes |
| `category` | string | yes (`ad` / `fraud` / `discrimination` / `medical-fraud` / `violence`) |

### 7.7 Remove Sensitive Word — `removeWord`

| Param | Type | Required |
|-------|------|----------|
| `wordId` | string | yes |

### 7.8 Get Report List — `reportList`

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `status` | string | no | all |
| `page` | number | no | 1 |
| `pageSize` | number | no | 20 |

### 7.9 Get Content List — `contentList`

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `type` | string | no | `posts` |
| `page` | number | no | 1 |
| `pageSize` | number | no | 20 |

---

## Frontend API Layer

The mini program uses `miniprogram/utils/api.js` as a unified wrapper:

```javascript
const { userApi } = require('./utils/api');
const { postApi } = require('./utils/api');
const { commentApi } = require('./utils/api');
const { reportApi } = require('./utils/api');
const { contentApi } = require('./utils/api');

// Examples
await userApi.login();
await postApi.create(title, content, category, images);
await commentApi.getList(postId);
await reportApi.create('post', postId, 'harassment');
await contentApi.checkText(text, 'post');
```

All wrapper functions handle the `wx.cloud.callFunction` call and return the response data directly.
