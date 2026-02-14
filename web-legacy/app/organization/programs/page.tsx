import { redirect } from 'next/navigation';

// Redirect legacy route to new modular structure
export default function LegacyProgramsRedirect() {
  redirect('/organization/educate/programs');
}
