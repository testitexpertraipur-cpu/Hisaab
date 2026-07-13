import firebaseConfig from '../../firebase-applet-config.json';

export interface GoogleUser {
  displayName: string;
  email: string;
  photoURL?: string;
}

let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const token = localStorage.getItem('hisaab_oauth_token');
  const expiresStr = localStorage.getItem('hisaab_oauth_expires');
  const userStr = localStorage.getItem('hisaab_google_user');

  if (token && expiresStr && userStr) {
    const expiresAt = parseInt(expiresStr, 10);
    if (Date.now() < expiresAt) {
      cachedAccessToken = token;
      try {
        const user = JSON.parse(userStr) as GoogleUser;
        if (onAuthSuccess) {
          onAuthSuccess(user, token);
        }
        return;
      } catch (e) {
        console.error('Error parsing stored google user', e);
      }
    }
  }

  // If we reach here, we are not logged in or token is expired
  logout();
  if (onAuthFailure) {
    onAuthFailure();
  }
};

// Must be called from a button click or user interaction
export const googleSignIn = (): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    const clientId = firebaseConfig.oAuthClientId;
    
    // Redirect URI must be registered in the GCP console.
    // For localhost/development/preview, window.location.origin is perfect.
    // Since Google OAuth redirect URIs are strictly matched, we use the base path origin
    const redirectUri = window.location.origin + window.location.pathname;
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ].join(' ');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scopes,
      include_granted_scopes: 'true',
      prompt: 'select_account'
    }).toString();

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site to connect Google Drive.'));
      return;
    }

    // Set up message event listener
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { accessToken, expiresAt } = event.data;
        
        try {
          // Fetch Google user info directly via Google UserInfo API
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (!profileRes.ok) {
            throw new Error('Failed to fetch Google profile info.');
          }
          
          const profile = await profileRes.json();
          const user: GoogleUser = {
            displayName: profile.name || profile.given_name || 'Google User',
            email: profile.email,
            photoURL: profile.picture
          };

          // Save to memory cache & localStorage
          cachedAccessToken = accessToken;
          localStorage.setItem('hisaab_google_user', JSON.stringify(user));
          localStorage.setItem('hisaab_oauth_token', accessToken);
          localStorage.setItem('hisaab_oauth_expires', expiresAt.toString());

          // Clean up listener & timer
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosedInterval);
          
          resolve({ user, accessToken });
        } catch (err: any) {
          reject(new Error(err.message || 'Failed to authenticate Google account.'));
        }
      } else if (event.data?.type === 'GOOGLE_OAUTH_FAILURE') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosedInterval);
        reject(new Error(event.data.error || 'Google Authentication cancelled.'));
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll to check if popup was closed by user without authenticating
    const checkClosedInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosedInterval);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Sign-In window closed before authentication.'));
      }
    }, 1000);
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = cachedAccessToken || localStorage.getItem('hisaab_oauth_token');
  const expiresStr = localStorage.getItem('hisaab_oauth_expires');
  if (token && expiresStr) {
    const expiresAt = parseInt(expiresStr, 10);
    if (Date.now() < expiresAt) {
      return token;
    }
  }
  return null;
};

export const logout = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('hisaab_google_user');
  localStorage.removeItem('hisaab_oauth_token');
  localStorage.removeItem('hisaab_oauth_expires');
  localStorage.removeItem('hisaab_spreadsheet_id');
  localStorage.removeItem('hisaab_spreadsheet_url');
  localStorage.removeItem('hisaab_last_synced');
};
