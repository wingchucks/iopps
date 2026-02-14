import { redirect } from 'next/navigation';

// Redirect to the main job creation page
// TODO: Move job creation form to this location
export default function NewJobRedirect() {
  redirect('/organization/jobs/new');
}
