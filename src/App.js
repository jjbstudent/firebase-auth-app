import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; // Keep this if you want to use Firebase Analytics
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail // Uncomment the next line if you want to use anonymous sign-in
  // signInAnonymously, // <-- You can uncomment this if you explicitly want anonymous sign-in on load
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null); // Firebase authenticated user object
  const [authError, setAuthError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    try {
      // Your ACTUAL Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyDd0k5-vCrlL-7NhN8YZlnLPmPxMtT6UZY",
        authDomain: "user-auth-firebase-1dd8b.firebaseapp.com",
        projectId: "user-auth-firebase-1dd8b",
        storageBucket: "user-auth-firebase-1dd8b.firebasestorage.app",
        messagingSenderId: "733472589440",
        appId: "1:733472589440:web:a5a7ef5c07f44d96740865",
        measurementId: "G-RZZZ7MNYYH"
      };

      // Initialize Firebase app and services ONCE
      const app = initializeApp(firebaseConfig);
      // If you are using analytics, initialize it here
      // const analytics = getAnalytics(app); // Uncomment if you intend to use analytics

      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance);

      // This block no longer needs the `signIn` async function wrapper
      // and the `__initial_auth_token` check.
      // If you want anonymous sign-in on load, simply uncomment the line below.
      // Otherwise, the app will naturally show AuthForms when no user is logged in.
      /*
      const signInInitialUser = async () => {
        try {
          await signInAnonymously(authInstance);
        } catch (error) {
          console.error("Firebase initial anonymous sign-in error:", error);
          setAuthError(`Initial sign-in failed: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      signInInitialUser();
      */
      setLoading(false); // Set loading to false directly if no initial sign-in attempt

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        setUser(currentUser);
        setIsAuthReady(true);
        // If a user logs in, ensure their profile exists in Firestore
        if (currentUser && dbInstance) {
          const userId = currentUser.uid;
          const appId = 'my-local-auth-app'; // Use a consistent ID for local dev
          const userProfileDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/userProfile`, userId);
          const userProfileSnap = await getDoc(userProfileDocRef);

          if (!userProfileSnap.exists()) {
            // Create a basic profile if it doesn't exist
            await setDoc(userProfileDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || 'N/A',
              displayName: currentUser.displayName || 'Anonymous User',
              createdAt: new Date(),
            }, { merge: true });
          }
        }
      });

      return () => unsubscribe(); // Cleanup auth listener on unmount
    } catch (error) {
      console.error("Firebase initialization error:", error);
      setAuthError(`Firebase initialization failed: ${error.message}`);
      setLoading(false); // Stop loading even if init fails
    }
  }, []);

  if (loading || !isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center p-6 bg-white rounded-lg shadow-xl">
          <p className="text-xl font-semibold text-gray-700">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-8">
          User Authentication App
        </h1>
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{authError}</span>
          </div>
        )}

        {user ? (
          <Dashboard user={user} auth={auth} db={db} setAuthError={setAuthError} />
        ) : (
          <AuthForms auth={auth} setAuthError={setAuthError} db={db} />
        )}
      </div>
    </div>
  );
}

// AuthForms Component: Handles Login and Registration forms
function AuthForms({ auth, setAuthError, db }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        // Register user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Store user details in Firestore
        const appId = 'my-local-auth-app'; // Consistent ID
        const userId = user.uid;
        await setDoc(doc(db, `artifacts/${appId}/users/${userId}/userProfile`, userId), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'New User',
          createdAt: new Date(),
        });
      } else {
        // Sign in user with email and password
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Auth action error:", error);
      setAuthError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Store or update user details in Firestore after Google sign-in
      const appId = 'my-local-auth-app'; // Consistent ID
      const userId = user.uid;
      await setDoc(doc(db, `artifacts/${appId}/users/${userId}/userProfile`, userId), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setAuthError(error.message);
    }
  };

  return (
    <div>
      <form onSubmit={handleAuthAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-200"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 transform hover:scale-105"
        >
          {isRegistering ? 'Register' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6">
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-indigo-600 hover:text-indigo-800 text-sm font-medium transition duration-200"
        >
          {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
        </button>
      </div>

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 transform hover:scale-105"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.000 4.8c-3.245 0-5.908 2.509-5.908 5.908s2.663 5.908 5.908 5.908c2.868 0 5.176-1.761 5.176-4.908V10.708H12.000V10.08h-4.662V8.58h4.662V8.04c0-2.486 1.706-4.46 4.093-4.46 1.157 0 2.221.32 3.123.874l-1.077 2.05c-.477-.282-1.054-.482-1.637-.482-1.666 0-2.825 1.137-2.825 2.871v.564H21V10.708h-1.503c.01-.157.013-.314.013-.472C19.51 7.217 16.037 4.8 12.000 4.8z" />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}

// Dashboard Component: Displays user info and logout button
function Dashboard({ user, auth, db, setAuthError }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const appId = 'my-local-auth-app'; // Consistent ID
  const userId = user?.uid;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (db && userId) {
        try {
          const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/userProfile`, userId);
          const userProfileSnap = await getDoc(userProfileDocRef);
          if (userProfileSnap.exists()) {
            setUserProfile(userProfileSnap.data());
          } else {
            console.warn("No user profile found in Firestore for UID:", userId);
            await setDoc(userProfileDocRef, {
              uid: user.uid,
              email: user.email || 'N/A',
              displayName: user.displayName || 'Anonymous User',
              createdAt: new Date(),
            }, { merge: true });
            setUserProfile({
              uid: user.uid,
              email: user.email || 'N/A',
              displayName: user.displayName || 'Anonymous User',
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setAuthError(`Error loading profile: ${error.message}`);
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    fetchUserProfile();
  }, [user, db, userId, appId, setAuthError]);


  const handleLogout = async () => {
    setAuthError('');
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError(error.message);
    }
  };

  if (loadingProfile) {
    return <p className="text-center text-gray-600">Loading user profile...</p>;
  }

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-indigo-700">Welcome!</h2>
      {userProfile?.photoURL && (
        <img
          src={userProfile.photoURL}
          alt="User Profile"
          className="w-24 h-24 rounded-full mx-auto shadow-md"
          onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/cccccc/333333?text=Profile"; }} // Fallback image
        />
      )}
      <p className="text-lg font-medium text-gray-700">
        Hello, {userProfile?.displayName || userProfile?.email || 'Guest User'}!
      </p>
      <p className="text-sm text-gray-500">Your User ID (UID): <span className="font-mono bg-gray-100 p-1 rounded break-all">{userProfile?.uid}</span></p>
      {userProfile?.email && <p className="text-sm text-gray-500">Email: <span className="font-mono bg-gray-100 p-1 rounded break-all">{userProfile?.email}</span></p>}
      {userProfile?.createdAt && <p className="text-sm text-gray-500">Account Created: {new Date(userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : userProfile.createdAt).toLocaleString()}</p>}


      <button
        onClick={handleLogout}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-200 transform hover:scale-105"
      >
        Sign Out
      </button>
    </div>
  );
}

export default App;