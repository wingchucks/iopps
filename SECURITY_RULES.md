# Firebase Security Rules Documentation

This document explains the security rules implemented for the IOPPS (Indigenous Opportunities Platform) platform.

## Overview

Security rules are implemented for:
1. **Firestore Database** (`firebase.rules`) - Protects all data collections
2. **Firebase Storage** (`storage.rules`) - Protects uploaded files (vendor images, logos, etc.)

## Firestore Security Rules

### Role-Based Access Control

The platform implements role-based access control with three user types:
- **community**: Job seekers, scholarship applicants, community members
- **employer**: Organizations posting jobs, scholarships, conferences, and vendor profiles
- **moderator**: Platform administrators (future use)

### Helper Functions

```javascript
isSignedIn()        // Checks if user is authenticated
userRole()          // Gets the user's role from the users collection
isEmployer()        // Checks if user has employer role
isCommunityMember() // Checks if user has community role
isModerator()       // Checks if user has moderator role
isActiveDoc(data)   // Checks if document is active
```

### Collection Rules

#### 1. Users Collection (`/users/{userId}`)
- **Read/Write**: Only the user themselves
- **Purpose**: Store user profile data including role

#### 2. Employers Collection (`/employers/{userId}`)
- **Read**: Public (anyone can view employer profiles)
- **Write**: Only the employer user themselves
- **Purpose**: Public employer profile information

#### 3. Member Profiles Collection (`/memberProfiles/{userId}`)
- **Read/Write**: Only the member themselves
- **Purpose**: Private member profile data
- **Note**: Indigenous affiliation data protected (OCAP® principles)

#### 4. Jobs Collection (`/jobs/{jobId}`)
- **Read**: Public (anyone can browse jobs)
- **Create**: Employers only, must set employerId to their own uid
- **Update/Delete**: Only the employer who created the job

#### 5. Applications Collection (`/applications/{applicationId}`)
- **Create**: Community members only, must set memberId to their own uid
- **Read**: Members can see their own, employers can see applications to their jobs
- **Update**:
  - Employers can update status (submitted → in review → accepted/rejected)
  - Members can withdraw their own applications (status → "withdrawn")

#### 6. Saved Jobs Collection (`/savedJobs/{savedJobId}`)
- **Create**: Authenticated users for their own saved jobs
- **Read/Update/Delete**: Only the user who saved the job

#### 7. Conferences Collection (`/conferences/{conferenceId}`)
- **Read**: Public
- **Create**: Employers only, must set employerId to their own uid
- **Update/Delete**: Only the employer who created the conference

#### 8. Scholarships Collection (`/scholarships/{scholarshipId}`)
- **Read**: Public for active scholarships, employers can see their own inactive
- **Create**: Employers only
- **Update/Delete**: Only the employer who created it, or moderators

#### 9. Scholarship Applications Collection (`/scholarshipApplications/{applicationId}`)
- **Create**: Community members only, must set memberId to their own uid
- **Read**: Members can see their own, employers can see applications to their scholarships
- **Update**:
  - Employers can update status
  - Members can withdraw their own applications

#### 10. Vendor Profiles Collection (`/vendors/{vendorId}`)
- **Read**: Public for active vendor profiles, vendors can see their own inactive
- **Create/Update**: Employers only, vendorId must match their uid
- **Delete**: Only the vendor themselves

#### 11. Shop Listings Collection (`/shopListings/{listingId}`)
- **Read**: Public for active listings
- **Create**: Employers only, must set vendorId to their own uid
- **Update/Delete**: Only the vendor who created the listing, or moderators

#### 12. Product/Service Listings Collection (`/productServiceListings/{listingId}`)
- **Read**: Public for active listings
- **Create**: Employers only, must set vendorId to their own uid
- **Update/Delete**: Only the vendor who created the listing, or moderators

#### 13. Pow Wows Collection (`/powwows/{powwowId}`)
- **Read**: Public for active pow wows
- **Create**: Employers only
- **Update/Delete**: Only the employer who created it, or moderators

#### 14. Pow Wow Registrations Collection (`/powwowRegistrations/{registrationId}`)
- **Create**: Authenticated users, must set memberId to their own uid
- **Read**: Members can see their own, employers can see registrations to their pow wows
- **Update/Delete**: Only the member who registered

#### 15. Live Streams Collection (`/liveStreams/{streamId}`)
- **Read**: Public for active streams
- **Create**: Employers only
- **Update/Delete**: Only the employer who created it, or moderators

#### 16. Contact Submissions Collection (`/contactSubmissions/{submissionId}`)
- **Create**: Anyone (public contact form)
- **Read**: Moderators only

## Firebase Storage Security Rules

### Vendor Images (`/vendors/{vendorId}/...`)
- **Read**: Public (vendor logos and hero images are public)
- **Write**: Only authenticated employers for their own folder

### Product Images (`/products/{vendorId}/...`)
- **Read**: Public
- **Write**: Only authenticated employers for their own folder

### Profile Images (`/profiles/{userId}/...`)
- **Read**: Public
- **Write**: Only the user themselves

### Employer Logos (`/employers/{employerId}/...`)
- **Read**: Public
- **Write**: Only authenticated employers for their own folder

### Conference Images (`/conferences/{conferenceId}/...`)
- **Read**: Public
- **Write**: Only the employer who owns the conference

### Default Deny
All other storage paths are denied by default.

## Security Principles

### 1. Indigenous Data Sovereignty (OCAP®)
- Indigenous affiliation data stored in member profiles is strictly private
- Only accessible by the member themselves
- Never shared without explicit consent
- Honors Ownership, Control, Access, and Possession principles

### 2. Least Privilege
- Users can only access data they need
- Write permissions are more restrictive than read permissions
- Public data (jobs, vendors, conferences) is read-only for non-owners

### 3. Data Integrity
- Users cannot modify data created by others
- User IDs are validated against authenticated user
- Role checks prevent privilege escalation

### 4. Transparency
- Public data is truly public (jobs, active vendor profiles, conferences)
- Private data (applications, member profiles) is strictly protected
- Clear separation between community and employer capabilities

## Testing Security Rules

### Using Firebase Emulators
```bash
firebase emulators:start
```

Rules are automatically loaded from:
- `firebase.rules` for Firestore
- `storage.rules` for Storage

### Production Deployment
When deploying to production:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

Or deploy both at once:
```bash
firebase deploy --only firestore:rules,storage:rules
```

## Important Notes

1. **Role Assignment**: User roles must be set in the `/users/{userId}` collection during registration
2. **UID Validation**: All rules validate that the authenticated user's UID matches the document owner
3. **Active Status**: Public collections check the `active` field to hide inactive/draft content
4. **Moderator Role**: Reserved for future admin features (content moderation, user support)
5. **Application Withdrawal**: Members can only change their application status to "withdrawn", not other statuses

## Future Enhancements

Potential security rule improvements:
- Rate limiting for contact form submissions
- File size limits for Storage uploads
- File type validation for images
- Email verification requirement for certain actions
- Geographic restrictions for certain features
- IP-based rate limiting
- Spam detection for contact submissions
