import { useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { syncCurrentUser } from '../api/authApi';

/** While signed in, upserts the user's record in our DB from their Clerk profile. */
function SyncUserOnSignIn() {
    const { user, isSignedIn } = useUser();
    const { getToken } = useAuth();

    useEffect(() => {
        if (!isSignedIn || !user) return;

        async function sync() {
            try {
                const firstName = user.fullName || user.username || user.primaryEmailAddress?.emailAddress;
                const token = await getToken();
                await syncCurrentUser(token, firstName);
            } catch (error) {
                console.error('Failed to sync user:', error);
            }
        }

        sync();
    }, [isSignedIn, user, getToken]);

    return null;
}

export default SyncUserOnSignIn;
