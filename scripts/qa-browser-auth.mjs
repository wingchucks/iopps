// Shared completion boundary for the feed's asynchronous sign-out action.
export async function signOutFromFeed(page) {
  // The click returns before session DELETE and Firebase persistence settle.
  // The feed handler navigates home only after both have completed.
  await Promise.all([
    page.waitForURL(url => url.pathname === '/'),
    page.getByRole('button', { name: 'Sign out', exact: true }).click(),
  ]);
}
