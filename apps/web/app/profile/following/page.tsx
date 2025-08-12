// Following feature removed from TheSet
// This page has been disabled as the app no longer supports following artists
// TheSet is focused on setlist voting, not social following features

import { redirect } from "next/navigation";

export const metadata = {
  title: "Feature Removed - TheSet",
  description: "Following feature has been removed",
};

export default async function FollowingPage() {
  // Redirect to artist discovery page instead
  redirect("/artists");
}
