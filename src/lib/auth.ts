import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
// Request Workspace scopes
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('synapse_gtoken') || null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('synapse_gtoken');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('synapse_gtoken', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('synapse_gtoken');
  }
  return cachedAccessToken;
};

export const createGoogleCalendarEvent = async (eventDetails: {
  summary: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
}): Promise<{ success: boolean; htmlLink?: string; error?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated with Google' };
  }

  try {
    let start: Date;
    if (eventDetails.dueDate) {
      if (eventDetails.dueTime) {
        start = new Date(`${eventDetails.dueDate}T${eventDetails.dueTime}:00`);
      } else {
        start = new Date(eventDetails.dueDate);
      }
    } else {
      start = new Date();
    }

    if (isNaN(start.getTime())) {
      start = new Date();
    }

    const end = new Date(start.getTime() + 3600000); // 1 hour duration default

    const body = {
      summary: eventDetails.summary,
      description: eventDetails.description || 'Created via Academix Aletheon Planner',
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (res.ok && data.id) {
      return { success: true, htmlLink: data.htmlLink };
    } else {
      return { success: false, error: data.error?.message || 'Failed to create calendar event' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error syncing calendar' };
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('synapse_gtoken');
};

