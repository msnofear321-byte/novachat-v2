import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  deleteUser,
  fetchSignInMethodsForEmail,
  type UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { setUserOffline } from './presence';

function getLoginErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Login failed. Please check your credentials.';
  }
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  const trimmedEmail = email.trim();
  let result: UserCredential;
  try {
    result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code || '';
    if (code === 'auth/invalid-credential') {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
        if (methods.length === 0) throw new Error('NO_ACCOUNT');
        if (methods.some((m) => m !== 'password')) throw new Error('WRONG_PROVIDER');
        throw new Error('WRONG_PASSWORD');
      } catch (inner: unknown) {
        const precise: Record<string, string> = {
          NO_ACCOUNT: 'No account found with this email. Please sign up first.',
          WRONG_PROVIDER: 'This email is linked to Google sign-in. Please use the Google button instead.',
          WRONG_PASSWORD: 'Incorrect password. Please try again or reset your password.',
        };
        const marker = inner instanceof Error ? inner.message : '';
        if (precise[marker]) {
          throw new Error(precise[marker]);
        }
        throw new Error(getLoginErrorMessage(code));
      }
    }
    throw new Error(getLoginErrorMessage(code));
  }

  // Ensure a Firestore profile exists for this account (legacy accounts
  // created before the profile write may be missing one). Presence fields are
  // intentionally NOT set here — the presence system marks the user online only
  // once the app is actually open and visible (see AuthContext.initPresence).
  try {
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        email: result.user.email,
        photoURL: result.user.photoURL || '',
        createdAt: Date.now(),
      });
    }
  } catch {
    // Non-critical: login still succeeds even if profile sync fails.
  }

  return result;
}

export async function loginWithGoogle(): Promise<UserCredential> {
  let result: UserCredential;
  try {
    result = await signInWithPopup(auth, googleProvider);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code || '';
    const popupMessages: Record<string, string> = {
      'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/popup-blocked': 'The popup was blocked by your browser. Allow popups for this site and try again.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/operation-not-allowed': 'Google sign-in is not enabled. Please contact support.',
    };
    throw new Error(popupMessages[code] || getLoginErrorMessage(code));
  }
  const user = result.user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: user.displayName || 'User',
      email: user.email,
      photoURL: user.photoURL || '',
      createdAt: Date.now(),
    });
  }

  return result;
}

function getFirebaseAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters with a mix of letters and numbers.';
    case 'auth/operation-not-allowed':
      return 'Email/password registration is not enabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Registration failed. Please try again.';
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  let result: UserCredential;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code || '';
    throw new Error(getFirebaseAuthErrorMessage(code));
  }

  try {
    await updateProfile(result.user, { displayName });
  } catch {
    // Non-critical: profile update failed but user exists
  }

  try {
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      displayName,
      email,
      photoURL: '',
      createdAt: Date.now(),
    });
  } catch {
    // Firestore write failed — try to clean up the Auth user
    try {
      await deleteUser(result.user);
    } catch {
      // Cannot delete user (requires recent login). User is stuck in Auth
      // without a Firestore profile. They can re-register or contact support.
    }
    throw new Error('Failed to create your profile. Please try again.');
  }

  return result;
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function logout(): Promise<void> {
  if (auth.currentUser) {
    setUserOffline(auth.currentUser.uid);
  }
  return signOut(auth);
}
