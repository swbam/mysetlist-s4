// Following feature removed from MySetlist
// This page has been disabled as the app no longer supports following artists
// MySetlist is focused on setlist voting, not social following features

import { redirect } from "next/navigation"

export const metadata = {
  title: "Feature Removed - MySetlist",
  description: "Following feature has been removed",
}

export default async function FollowingPage() {
  // Redirect to artist discovery page instead
  redirect("/artists")
}
