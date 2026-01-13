import { redirect } from 'next/navigation';

// Redirect old profile page to new onboarding flow
export default function ProfileRedirect() {
  redirect('/organization/onboarding');
}
