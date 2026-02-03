import { redirect } from 'next/navigation';

// Redirect legacy route to new modular structure
export default function LegacyConferencesRedirect() {
  redirect('/organization/host/conferences');
}
