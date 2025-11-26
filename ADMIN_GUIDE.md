# 📚 IOPPS Admin Features - Quick Reference

##  Admin Dashboard (`/admin`)

**Access Level**: Admin, Moderator

### Overview Statistics
- Total users, jobs, conferences, scholarships
- Active employers and applications
- Platform engagement metrics
- Quick action links

---

## 👥 User Management (`/admin/users`)

**Access Level**: Admin, Moderator

### Features:
- View all registered users
- Filter by role (Community, Employers, Moderators)
- Search users by name/email
- Update user roles (member, employer, moderator, admin)
- Enable/disable user accounts
- **Login As** (nathan.arias@iopps.ca only): Impersonate users for support

### User Roles:
- **Member**: Regular community user (default)
- **Employer**: Can post jobs, conferences, scholarships
- **Moderator**: Can manage content, approve employers
- **Admin**: Full platform access

---

## 🏢 Employer Management (`/admin/employers`)

**Access Level**: Admin, Moderator

### Features:
- View all employer profiles
- Filter by status (Pending, Approved, Rejected)
- Approve/reject new employer registrations
- View employer details and verification documents
- **Login As** (nathan.arias@iopps.ca only): Impersonate employers

### Approval Workflow:
1. Employer submits profile
2. Status = "pending"
3. Admin reviews and approves/rejects
4. Approved employers can post jobs

---

## 💼 Job Management (`/admin/jobs`)

**Access Level**: Admin, Moderator

### Features:
- View all job postings
- Filter by status (Active, Expired, Draft)
- Edit job details
- Archive/delete jobs
- Monitor applications per job

---

## 🎓 Scholarship Management (`/admin/scholarships`)

**Access Level**: Admin, Moderator

### Features:
- View all scholarships
- Approve/reject scholarship postings
- Edit scholarship details
- Monitor applications

---

## 🏛️ Conference Management (`/admin/conferences`)

**Access Level**: Admin, Moderator

### Features:
- View all conferences
- Feature/unfeature conferences
- Edit conference details
- Monitor registrations

---

## 🎪 Pow Wow Management (`/admin/powwows`)

**Access Level**: Admin, Moderator

### Features:
- View all pow wow events
- Add/edit/delete events
- Manage event details and dates

---

## 💬 Content Moderation (`/admin/content`)

**Access Level**: Admin, Moderator

### Features:
- View contact form submissions
- Filter by status (New, Read, Responded)
- Mark messages as read/responded
- Reply to messages via email link

### Status Flow:
- **New**: Unread message
- **Read**: Admin has viewed
- **Responded**: Reply sent to user

---

## ⚙️ Platform Settings (`/admin/settings`)

**Access Level**: Admin only

### Maintenance Mode
- Toggle to disable site for non-admins
- Useful during updates or emergencies
- Displays maintenance message to users

### Announcement Banner
- Enable/disable global banner
- Set message text
- Add optional link
- Choose type (info, warning, error, success)
- Banner displays at top of all pages

### Feature Flags
- **Stripe Payments**: Enable/disable payment processing
- **Job Posting**: Allow/prevent new job postings
- **Scholarships**: Enable/disable scholarship features

---

## 📡 RSS Job Feeds (`/admin/feeds`)

**Access Level**: Admin, Moderator

### Features:
- Add external RSS/XML job feeds
- Configure feed URL and employer association
- Manual sync trigger
- View sync statistics
- Activate/deactivate feeds
- Error tracking for failed syncs

### Workflow:
1. Click "+ Add Feed"
2. Enter:
   - Feed Name (e.g., "SIGA Jobs")
   - Feed URL (XML endpoint)
   - Employer ID (Firebase UID)
   - Employer Name (optional)
3. Click "Sync Now" to import jobs
4. Jobs automatically imported with duplicate detection

### Feed Management:
- **Sync Now**: Manually trigger import
- **Activate/Deactivate**: Enable/disable feed
- **Delete**: Remove feed configuration
- View last sync time and import count

---

## 📊 Analytics (`/admin/analytics`)

**Access Level**: Admin, Moderator

### Metrics:
- User growth over time
- Job posting trends
- Application conversion rates
- Popular job categories
- Geographic distribution
- Employer activity

---

## 🔐 Security Best Practices

### For Admins:
1. **Never share admin credentials**
2. **Use strong passwords** (12+ characters)
3. **Enable 2FA** on Firebase account
4. **Log out when done** (especially on shared computers)
5. **Monitor audit logs** for suspicious activity

### Impersonation Feature:
- **Restricted to**: nathan.arias@iopps.ca only
- **Use case**: Customer support, debugging user issues
- **Warning**: You're fully logged in as the user
- **Best practice**: Always inform user before/after

### Role Management:
- **Use least privilege**: Don't grant admin to everyone
- **Moderators** can handle most content tasks
- **Employers** should never have admin access
- **Review roles** quarterly

---

## 🆘 Common Admin Tasks

### Approve a New Employer
1. Go to `/admin/employers`
2. Click on pending employer
3. Review company details
4. Click "Approve" or "Reject"

### Handle Contact Form Inquiry
1. Go to `/admin/content`
2. Click on message
3. Read content
4. Click "Reply via Email" to respond
5. Mark as "Responded"

### Import Jobs from RSS Feed
1. Go to `/admin/feeds`
2. Find the feed
3. Click "Sync Now"
4. Review import results

### Disable Problematic User
1. Go to `/admin/users`
2. Find user
3. Toggle "Enabled" to disable
4. User cannot log in until re-enabled

### Enable Maintenance Mode
1. Go to `/admin/settings`
2. Toggle "Maintenance Mode"
3. Site becomes admin-only
4. Remember to disable when done!

---

## 📱 Quick Links

- **Admin Dashboard**: http://localhost:3000/admin
- **User Management**: http://localhost:3000/admin/users
- **Employer Management**: http://localhost:3000/admin/employers
- **Content Moderation**: http://localhost:3000/admin/content
- **Platform Settings**: http://localhost:3000/admin/settings
- **RSS Feeds**: http://localhost:3000/admin/feeds
- **Analytics**: http://localhost:3000/admin/analytics

---

## 🐛 Troubleshooting

**Can't access admin pages?**
- Verify you're logged in
- Check your user role in `/admin/users`
- Clear browser cache and cookies

**Impersonation not working?**
- Verify you're logged in as nathan.arias@iopps.ca
- Check API route logs for errors
- Ensure target user exists

**RSS feed sync failing?**
- Check feed URL is accessible
- Verify XML format is correct
- Review error messages in feed details
- Check Firebase/Firestore quotas

**Changes not saving?**
- Check browser console for errors
- Verify Firestore rules allow the operation
- Check network tab for failed requests

---

## 📞 Support

For technical issues or questions:
- **Developer**: (Your contact info)
- **Firebase Console**: https://console.firebase.google.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

*Last Updated: 2025-11-24*
