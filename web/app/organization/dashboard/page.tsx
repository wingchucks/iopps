import { redirect } from 'next/navigation';

// Redirect old dashboard URL to new dashboard
export default function OldDashboardRedirect() {
  redirect('/organization');
}
