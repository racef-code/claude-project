"""
One-time script to get a Dropbox refresh token (never expires).

Run this locally:
    python get_dropbox_token.py

You'll need your App Key and App Secret from:
    https://www.dropbox.com/developers/apps
    → Select your app → Settings tab

Then add the printed DROPBOX_REFRESH_TOKEN to your .env and Render environment variables.
"""

from dropbox import DropboxOAuth2FlowNoRedirect

app_key    = input("App Key:    ").strip()
app_secret = input("App Secret: ").strip()

auth_flow = DropboxOAuth2FlowNoRedirect(
    app_key,
    app_secret,
    token_access_type='offline'
)

print("\n1. Visit this URL and click 'Allow':")
print(auth_flow.start())
code = input("\n2. Paste the authorization code here: ").strip()

result = auth_flow.finish(code)

print("\n✓ Success! Raw result for debugging:")
print(f"  access_token:  {result.access_token}")
print(f"  refresh_token: {result.refresh_token}")
print(f"  token_type:    {result.token_type}")

if not result.refresh_token:
    print("\n⚠ WARNING: refresh_token is empty!")
    print("  Your Dropbox app may not have offline access enabled.")
    print("  Go to: https://www.dropbox.com/developers/apps → your app → Settings")
    print("  Check 'OAuth 2 → Access token expiration' — it must NOT be 'Short-lived only'.")
else:
    print("\nAdd these to your .env and Render environment variables:\n")
    print(f"DROPBOX_APP_KEY={app_key}")
    print(f"DROPBOX_APP_SECRET={app_secret}")
    print(f"DROPBOX_REFRESH_TOKEN={result.refresh_token}")
    print("\nYou can remove DROPBOX_TOKEN — it's no longer needed.")
