import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
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
  // Check for redirect result on initialization (for mobile & redirect auth)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem('synapse_gtoken', cachedAccessToken);
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect auth result warning:', err);
    });

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
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      console.warn('signInWithPopup failed or blocked, trying redirect:', popupErr);
      if (
        popupErr.code === 'auth/popup-blocked' || 
        popupErr.code === 'auth/popup-closed-by-user' ||
        popupErr.code === 'auth/cancelled-popup-request' ||
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupErr;
    }

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
    return { success: false, error: 'Not authenticated with Google. Please click Sign In with Google.' };
  }

  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    let body: any;

    if (eventDetails.dueDate && !eventDetails.dueTime) {
      // All-day event
      body = {
        summary: eventDetails.summary,
        description: eventDetails.description || 'Created via Academix Aletheon Planner',
        start: {
          date: eventDetails.dueDate,
        },
        end: {
          date: eventDetails.dueDate,
        }
      };
    } else {
      let start: Date;
      if (eventDetails.dueDate && eventDetails.dueTime) {
        start = new Date(`${eventDetails.dueDate}T${eventDetails.dueTime}:00`);
      } else if (eventDetails.dueDate) {
        start = new Date(`${eventDetails.dueDate}T09:00:00`);
      } else {
        start = new Date();
      }

      if (isNaN(start.getTime())) {
        start = new Date();
      }

      const end = new Date(start.getTime() + 3600000); // 1 hour duration default

      // Format ISO with local timezone offset
      const formatWithOffset = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const tzo = -d.getTimezoneOffset();
        const dif = tzo >= 0 ? '+' : '-';
        const offHours = pad(Math.floor(Math.abs(tzo) / 60));
        const offMins = pad(Math.abs(tzo) % 60);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${dif}${offHours}:${offMins}`;
      };

      body = {
        summary: eventDetails.summary,
        description: eventDetails.description || 'Created via Academix Aletheon Planner',
        start: {
          dateTime: formatWithOffset(start),
          timeZone: userTimeZone
        },
        end: {
          dateTime: formatWithOffset(end),
          timeZone: userTimeZone
        }
      };
    }

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
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        localStorage.removeItem('synapse_gtoken');
      }
      return { success: false, error: data.error?.message || `Google API Error (${res.status}): ${data.error?.status || 'Failed to sync'}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error syncing calendar' };
  }
};

export const createGoogleTask = async (taskDetails: {
  title: string;
  notes?: string;
  dueDate?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated with Google. Please sign in.' };
  }

  try {
    const body: any = {
      title: taskDetails.title,
      notes: taskDetails.notes || 'Created via Academix Aletheon Planner',
    };

    if (taskDetails.dueDate) {
      body.due = new Date(taskDetails.dueDate).toISOString();
    }

    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (res.ok && data.id) {
      return { success: true };
    } else {
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        localStorage.removeItem('synapse_gtoken');
      }
      return { success: false, error: data.error?.message || `Google Tasks Error (${res.status})` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error syncing task' };
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('synapse_gtoken');
};

