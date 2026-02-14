import { redirect } from 'next/navigation';

// Redirect legacy route to new modular structure
export default function LegacyJobsRedirect() {
  redirect('/organization/hire/jobs');
}
