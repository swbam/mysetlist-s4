"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../src/hooks/use-auth"
import type {
  UpdatePreferencesData,
  UpdateProfileData,
} from "../src/types/auth"

export const ProfileSettings = () => {
  const {
    user,
    updateProfile,
    updatePreferences,
    linkSpotify,
    refreshSpotifyTokens,
  } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    "profile" | "preferences" | "spotify"
  >("profile")

  // Profile form state
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    displayName: "",
    bio: "",
    location: "",
    favoriteGenres: [],
    instagramUrl: "",
    twitterUrl: "",
    isPublic: true,
    showAttendedShows: true,
    showVotedSongs: true,
  })

  // Preferences form state
  const [preferencesData, setPreferencesData] = useState<UpdatePreferencesData>(
    {
      emailPreferences: {
        emailEnabled: true,
        showReminders: true,
        showReminderFrequency: "daily",
        newShowNotifications: true,
        newShowFrequency: "immediately",
        setlistUpdates: true,
        setlistUpdateFrequency: "immediately",
        weeklyDigest: true,
        marketingEmails: false,
      },
      privacySettings: {
        showProfile: true,
        showVotingHistory: true,
        showAttendanceHistory: true,
        allowFollowing: true,
        showOnlineStatus: false,
      },
      musicPreferences: {
        favoriteGenres: [],
        preferredVenues: [],
        notificationRadius: 50,
      },
    }
  )

  // Initialize form data when user data loads
  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        displayName: user.user_metadata?.["displayName"] || "",
        bio: user.profile.bio || "",
        location: user.profile.location || "",
        favoriteGenres: user.profile.favoriteGenres || [],
        instagramUrl: user.profile.instagramUrl || "",
        twitterUrl: user.profile.twitterUrl || "",
        isPublic: user.profile.isPublic,
        showAttendedShows: user.profile.showAttendedShows,
        showVotedSongs: user.profile.showVotedSongs,
      })
    }

    if (user?.preferences) {
      setPreferencesData({
        emailPreferences: user.preferences.emailPreferences,
        privacySettings: user.preferences.privacySettings,
        musicPreferences: user.preferences.musicPreferences,
      })
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      await updateProfile(profileData)
      setSuccess("Profile updated successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      await updatePreferences(preferencesData)
      setSuccess("Preferences updated successfully!")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update preferences"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSpotifyConnect = async () => {
    setError(null)
    setLoading(true)

    try {
      await linkSpotify()
      setSuccess("Spotify account connected successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Spotify")
    } finally {
      setLoading(false)
    }
  }

  const handleSpotifyRefresh = async () => {
    setError(null)
    setLoading(true)

    try {
      await refreshSpotifyTokens()
      setSuccess("Spotify tokens refreshed successfully!")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh Spotify tokens"
      )
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "preferences", name: "Preferences", icon: "⚙️" },
    { id: "spotify", name: "Spotify", icon: "🎵" },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your profile, preferences, and integrations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.23a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Profile Information
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={profileData.displayName || ""}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      displayName: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={profileData.location || ""}
                  onChange={(e) =>
                    setProfileData({ ...profileData, location: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700"
              >
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                value={profileData.bio || ""}
                onChange={(e) =>
                  setProfileData({ ...profileData, bio: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="instagramUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  Instagram URL
                </label>
                <input
                  type="url"
                  id="instagramUrl"
                  value={profileData.instagramUrl || ""}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      instagramUrl: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://instagram.com/username"
                />
              </div>

              <div>
                <label
                  htmlFor="twitterUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  Twitter URL
                </label>
                <input
                  type="url"
                  id="twitterUrl"
                  value={profileData.twitterUrl || ""}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      twitterUrl: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://twitter.com/username"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Privacy Settings
              </h3>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.isPublic}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        isPublic: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Make my profile public
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.showAttendedShows}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        showAttendedShows: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Show attended shows
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.showVotedSongs}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        showVotedSongs: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Show voting history
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <form onSubmit={handlePreferencesSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Email Preferences
            </h2>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.emailPreferences?.emailEnabled}
                  onChange={(e) =>
                    setPreferencesData({
                      ...preferencesData,
                      emailPreferences: {
                        ...preferencesData.emailPreferences!,
                        emailEnabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable email notifications
                </span>
              </label>

              <div className="ml-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferencesData.emailPreferences?.showReminders}
                      onChange={(e) =>
                        setPreferencesData({
                          ...preferencesData,
                          emailPreferences: {
                            ...preferencesData.emailPreferences!,
                            showReminders: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Show reminders
                    </span>
                  </label>
                  <select
                    value={
                      preferencesData.emailPreferences?.showReminderFrequency
                    }
                    onChange={(e) =>
                      setPreferencesData({
                        ...preferencesData,
                        emailPreferences: {
                          ...preferencesData.emailPreferences!,
                          showReminderFrequency: e.target.value as any,
                        },
                      })
                    }
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="immediately">Immediately</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        preferencesData.emailPreferences?.newShowNotifications
                      }
                      onChange={(e) =>
                        setPreferencesData({
                          ...preferencesData,
                          emailPreferences: {
                            ...preferencesData.emailPreferences!,
                            newShowNotifications: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      New show notifications
                    </span>
                  </label>
                  <select
                    value={preferencesData.emailPreferences?.newShowFrequency}
                    onChange={(e) =>
                      setPreferencesData({
                        ...preferencesData,
                        emailPreferences: {
                          ...preferencesData.emailPreferences!,
                          newShowFrequency: e.target.value as any,
                        },
                      })
                    }
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="immediately">Immediately</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferencesData.emailPreferences?.weeklyDigest}
                    onChange={(e) =>
                      setPreferencesData({
                        ...preferencesData,
                        emailPreferences: {
                          ...preferencesData.emailPreferences!,
                          weeklyDigest: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Weekly digest
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferencesData.emailPreferences?.marketingEmails}
                    onChange={(e) =>
                      setPreferencesData({
                        ...preferencesData,
                        emailPreferences: {
                          ...preferencesData.emailPreferences!,
                          marketingEmails: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Marketing emails
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      )}

      {/* Spotify Tab */}
      {activeTab === "spotify" && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            Spotify Integration
          </h2>

          {user?.spotifyConnected ? (
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Spotify Connected
                  </p>
                  <p className="text-sm text-green-600">
                    {user.spotifyProfile?.displayName ||
                      "Connected successfully"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Connected Features:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Personalized artist recommendations</li>
                  <li>• Music preference sync</li>
                  <li>• Enhanced setlist predictions</li>
                  <li>• Top artists and tracks integration</li>
                </ul>
              </div>

              <button
                onClick={handleSpotifyRefresh}
                disabled={loading}
                className="bg-[#1DB954] py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#1aa34a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DB954] disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh Connection"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Connect Spotify
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Connect your Spotify account to get personalized
                  recommendations and enhanced features.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Benefits of connecting:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Get personalized artist and show recommendations</li>
                  <li>• Sync your music preferences automatically</li>
                  <li>• See setlist predictions based on your taste</li>
                  <li>• Discover new artists similar to your favorites</li>
                </ul>
              </div>

              <div className="text-center">
                <button
                  onClick={handleSpotifyConnect}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1DB954] hover:bg-[#1aa34a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DB954] disabled:opacity-50"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  {loading ? "Connecting..." : "Connect Spotify"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
