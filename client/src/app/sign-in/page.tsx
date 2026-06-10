import { redirect } from 'next/navigation';

// The sign-in experience is now unified on /sign-up with full mode toggling.
// Redirect legacy /sign-in links to the unified auth page.
export default function SignInPage() {
  redirect('/sign-up');
}
