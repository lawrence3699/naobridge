# 脑桥 (NaoBridge) — Deployment Guide

## Prerequisites

1. **WeChat Mini Program Account** — Register at https://mp.weixin.qq.com
2. **WeChat Developer Tools** — Download from https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
3. **Cloud Development Activation** — Enable cloud development in DevTools
4. **Node.js** — v14+ for local development and testing

---

## Step 1: Register Mini Program

1. Go to https://mp.weixin.qq.com and register a new Mini Program account
2. Complete real-name verification (required for publishing)
3. Note your **AppID** from 开发 → 开发管理 → 开发设置
4. Category selection: **社交 → 社区/论坛** (avoid medical category)

---

## Step 2: Configure Project

1. Open `project.config.json` and replace `appid`:
   ```json
   "appid": "your-actual-appid"
   ```

2. Import project in WeChat Developer Tools:
   - Open DevTools → Import Project
   - Select the `/wechatapp` directory
   - Enter your AppID
   - Click Import

---

## Step 3: Enable Cloud Development

1. In DevTools, click the **Cloud Development** button (云开发) in the toolbar
2. Create a cloud environment:
   - Environment name: `naobridge-prod` (or your preferred name)
   - Choose the free tier or paid plan based on your needs
3. Note the **Environment ID** — you'll need it for configuration

### Configure Environment ID

The project uses `cloud.DYNAMIC_CURRENT_ENV` which auto-detects the environment. If you need to specify an environment explicitly, update `miniprogram/app.js`:

```javascript
wx.cloud.init({
  env: 'your-env-id',  // Replace with your environment ID
  traceUser: true
});
```

---

## Step 4: Deploy Cloud Functions

### Via DevTools (recommended)

For each cloud function directory under `cloudfunctions/`:

1. Right-click the function folder in DevTools file tree
2. Select **Upload and Deploy: Cloud Install Dependencies**
3. Wait for deployment confirmation

Deploy in this order:
1. `sensitive-filter` (no dependencies)
2. `user` (no dependencies)
3. `post` (depends on sensitive-filter logic, but self-contained)
4. `comment` (depends on post data)
5. `report` (depends on post/comment data)
6. `notification` (no dependencies)
7. `admin` (depends on all collections)

### Via CLI (alternative)

```bash
# Install wxcloud CLI
npm install -g @cloudbase/cli

# Login
tcb login

# Deploy each function
tcb functions:deploy --name sensitive-filter --env your-env-id
tcb functions:deploy --name user --env your-env-id
tcb functions:deploy --name post --env your-env-id
tcb functions:deploy --name comment --env your-env-id
tcb functions:deploy --name report --env your-env-id
tcb functions:deploy --name notification --env your-env-id
tcb functions:deploy --name admin --env your-env-id
```

---

## Step 5: Initialize Database

### Create Collections

In Cloud Development Console → Database, create these collections:

1. `users`
2. `posts`
3. `comments`
4. `reports`
5. `notifications`
6. `admins`
7. `sensitive_words`
8. `likes`
9. `favorites`

### Set Database Permissions

For each collection, set the permission to **Only cloud functions can read/write** (仅云函数可读写). Since all data access goes through cloud functions, this is the safest option.

### Seed Sensitive Words

Option A — Via Cloud Console:
1. Open `cloudfunctions/sensitive-filter/seed-words.json`
2. Add each word as a document in the `sensitive_words` collection

Option B — Via cloud function:
Create a one-time initialization script and call it from DevTools console:

```javascript
// Run in DevTools console
wx.cloud.callFunction({
  name: 'sensitive-filter',
  data: { action: 'seed' }
}).then(console.log);
```

> Note: You may need to add a `seed` action handler to the sensitive-filter cloud function.

### Create First Admin

Insert a document into the `admins` collection via Cloud Console:

```json
{
  "_openid": "your-admin-openid",
  "level": "super",
  "permissions": ["all"],
  "createdAt": "2026-03-12T00:00:00.000Z"
}
```

To find your OpenID:
1. Login to the mini program in DevTools
2. Check the cloud function logs or user collection for your `_openid`

---

## Step 6: WeChat Content Security

The project integrates WeChat's content security APIs. These work automatically once the mini program is published, but for testing:

1. Ensure `security.msgSecCheck` and `security.imgSecCheck` permissions are enabled
2. In DevTools, content security checks may return mock results
3. Real checks only work in production environment

---

## Step 7: Test in DevTools

1. Click **Compile** (编译) in DevTools toolbar
2. Test the full flow:
   - [ ] User login and registration
   - [ ] Create a post with text and images
   - [ ] View post list and detail
   - [ ] Add comments and replies
   - [ ] Submit a report
   - [ ] Check notifications
   - [ ] Test admin dashboard at `admin/index.html`

### Run Unit Tests

```bash
cd /path/to/wechatapp
npm install
npm test
```

Expected: 198 tests passing, 80%+ coverage.

---

## Step 8: Submit for Review

### Pre-submission Checklist

- [ ] All cloud functions deployed successfully
- [ ] Database collections created with correct permissions
- [ ] At least one admin account configured
- [ ] Sensitive word list seeded
- [ ] Privacy policy page accessible (about page)
- [ ] Community rules page accessible
- [ ] Disclaimer visible: "本平台不提供医疗建议，内容仅供交流参考"
- [ ] Content security APIs integrated
- [ ] Report mechanism functional
- [ ] User agreement acceptance flow works

### Submit

1. In DevTools, click **Upload** (上传) in the toolbar
2. Fill in version number (e.g., `1.0.0`) and description
3. Go to https://mp.weixin.qq.com → 管理 → 版本管理
4. Find your uploaded version and click **Submit for Review** (提交审核)
5. Fill in the review form:
   - Category: 社交 → 社区/论坛
   - Describe the UGC management mechanism (report + review)
   - Provide test account if needed

### Review Timeline

- First review: typically 1–7 business days
- Common rejection reasons:
  - Missing content moderation mechanism
  - Incomplete privacy policy
  - Category mismatch
  - Missing user agreement

---

## Step 9: Post-Launch

### Monitor

- Check Cloud Development Console for function call logs and errors
- Monitor database storage usage
- Review pending reports regularly via admin dashboard

### Admin Dashboard

The admin web dashboard is at `admin/index.html`. To use it in production:

1. Host it on a web server or WeChat Cloud Static Hosting
2. Connect the admin API calls to your cloud environment
3. Implement proper admin authentication (WeChat admin login)

### Backup

- Set up regular database exports via Cloud Console
- Cloud Development provides automatic backups, but verify your plan includes this

---

## Environment Variables and Configuration

| Config | Location | Description |
|--------|----------|-------------|
| AppID | `project.config.json` | WeChat Mini Program AppID |
| Cloud Env | `miniprogram/app.js` | Cloud environment ID |
| Categories | `CLAUDE.md` | Post category definitions |
| Sensitive Words | `seed-words.json` | Default word list |

---

## Troubleshooting

### Cloud function deployment fails
- Ensure `wx-server-sdk` version matches your cloud environment
- Check that `package.json` exists in each function directory
- Try "Upload and Deploy: All Files" instead of "Cloud Install Dependencies"

### Database permission errors
- Verify collection permissions are set to cloud-function-only
- Check that the calling user has a valid `_openid`
- Verify admin records exist in `admins` collection

### Content security API returns errors
- These APIs only work fully in production, not in DevTools simulator
- Ensure your mini program has the required API permissions
- Check API call quotas in the WeChat admin console

### Mini program rejected during review
- Ensure disclaimer text is visible on the home page or about page
- Add clear reporting mechanism (report button on posts/comments)
- Include complete user agreement and privacy policy
- Demonstrate content moderation workflow in review notes
