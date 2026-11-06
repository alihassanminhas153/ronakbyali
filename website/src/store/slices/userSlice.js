import {
    createAsyncThunk,
    createEntityAdapter,
    createSelector,
    createSlice,
} from '@reduxjs/toolkit';

import userService, { isStaffRole } from '../../lib/appwrite/user';

/*
 * users slice
 * -----------------------------------------------------------------------------
 * One slice, two modes (state.users.scope):
 *
 *   'team' -> the signed-in user has a staff role (admin / support / manager).
 *             `fetchUsers` loads EVERY profile row, so the admin Users page can
 *             list, search, block and change roles.
 *   'self' -> the signed-in user is new / customer / loyal. The slice only ever
 *             holds that user's own profile (one entity), so the rest of the app
 *             (profile page, blocked gate, checkout prefill) reads from one place.
 *   'none' -> nobody loaded yet (or logged out).
 *
 * `meId` always points at the signed-in user's entity, in both modes.
 */

const adapter = createEntityAdapter({
    selectId: (profile) => profile.$id,
    // newest accounts first, same as userService.getProfilesPage
    sortComparer: (a, b) => new Date(b.$createdAt || 0) - new Date(a.$createdAt || 0),
});

export const DEFAULT_USER_FILTERS = {
    query: '',
    role: 'all', // 'all' | admin | support | manager | customer | loyal | new
    blocked: 'all', // 'all' | 'blocked' | 'active'
};

const initialState = adapter.getInitialState({
    meId: null,
    scope: 'none', // 'none' | 'self' | 'team'
    meStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'failed'
    listStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'failed'
    error: null,
    pendingIds: [], // rows with an in-flight block / role change
    filters: { ...DEFAULT_USER_FILTERS },
});

// ---------- Thunks ----------

// Run right after login (email or Google) with the object from
// authService.getCurrentUser(). Creates the profile on first login.
export const loadMyProfile = createAsyncThunk(
    'users/loadMyProfile',
    async ({ user }, { rejectWithValue }) => {
        const profile = await userService.ensureProfile({ user });
        if (!profile) return rejectWithValue('Could not load your profile.');
        return profile;
    }
);

// Cheap re-read of the signed-in user's own row. The blocked gate calls this
// on route changes / window focus so a new block is noticed without a re-login.
export const refreshMyProfile = createAsyncThunk(
    'users/refreshMyProfile',
    async (_, { getState, rejectWithValue }) => {
        const { meId } = getState().users;
        if (!meId) return rejectWithValue('Not signed in.');
        const profile = await userService.getProfile({ userId: meId });
        // `false` can also mean a network error, so never treat it as "blocked".
        if (!profile) return rejectWithValue('Could not refresh your profile.');
        return profile;
    }
);

// Team: loads all users. Everyone else: resolves to just their own profile.
export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    async (_, { getState, rejectWithValue }) => {
        const me = selectMe(getState());
        if (!me) return rejectWithValue('Not signed in.');

        if (!isStaffRole(me.role)) return { scope: 'self', rows: [me] };

        const rows = await userService.getProfiles();
        if (!rows) {
            // The users table is readable only with the Appwrite "admin" label,
            // so support/manager accounts without it end up here.
            return rejectWithValue(
                'Could not load users. Your account needs the "admin" label in Appwrite Auth to read all profiles.'
            );
        }
        return { scope: 'team', rows };
    }
);

// Own profile edits. Goes through updateOwnProfile, which strips role,
// isBlocked, ordersCount, totalSpent etc.
export const updateMyProfile = createAsyncThunk(
    'users/updateMyProfile',
    async (data, { getState, rejectWithValue }) => {
        const { meId } = getState().users;
        if (!meId) return rejectWithValue('Not signed in.');
        const profile = await userService.updateOwnProfile({ userId: meId, data });
        if (!profile) return rejectWithValue('Could not save your profile.');
        return profile;
    }
);

// Team only. Optimistic: the row flips immediately and is rolled back on error.
export const setUserBlocked = createAsyncThunk(
    'users/setUserBlocked',
    async ({ userId, isBlocked }, { getState, rejectWithValue }) => {
        const state = getState();
        if (state.users.scope !== 'team') return rejectWithValue('Only the team can block users.');
        if (userId === state.users.meId) return rejectWithValue('You cannot block yourself.');

        const profile = await userService.setBlocked({ userId, isBlocked });
        if (!profile) return rejectWithValue('Could not update the blocked status.');
        return profile;
    }
);

// Team only (admin label in practice).
export const setUserRole = createAsyncThunk(
    'users/setUserRole',
    async ({ userId, role }, { getState, rejectWithValue }) => {
        const state = getState();
        if (state.users.scope !== 'team') return rejectWithValue('Only the team can change roles.');
        if (userId === state.users.meId) return rejectWithValue('You cannot change your own role.');

        const profile = await userService.setRole({ userId, role });
        if (!profile) return rejectWithValue('Could not change the role.');
        return profile;
    }
);

// ---------- Slice ----------

const addPending = (state, id) => {
    if (!state.pendingIds.includes(id)) state.pendingIds.push(id);
};
const removePending = (state, id) => {
    state.pendingIds = state.pendingIds.filter((x) => x !== id);
};

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        setUserQuery(state, { payload }) {
            state.filters.query = payload;
        },
        setUserRoleFilter(state, { payload }) {
            state.filters.role = payload;
        },
        setUserBlockedFilter(state, { payload }) {
            state.filters.blocked = payload;
        },
        resetUserFilters(state) {
            state.filters = { ...DEFAULT_USER_FILTERS };
        },
        clearUserError(state) {
            state.error = null;
        },
        // Dispatch on logout so one account's data never leaks into the next.
        clearUsers() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            // --- my profile ---
            .addCase(loadMyProfile.pending, (state) => {
                state.meStatus = 'loading';
                state.error = null;
            })
            .addCase(loadMyProfile.fulfilled, (state, { payload }) => {
                // Different account than before? Start clean.
                if (state.meId && state.meId !== payload.$id) {
                    adapter.removeAll(state);
                    state.listStatus = 'idle';
                }
                adapter.upsertOne(state, payload);
                state.meId = payload.$id;
                state.scope = isStaffRole(payload.role) ? 'team' : 'self';
                state.meStatus = 'ready';
            })
            .addCase(loadMyProfile.rejected, (state, { payload, error }) => {
                state.meStatus = 'failed';
                state.error = payload || error.message;
            })

            .addCase(refreshMyProfile.fulfilled, (state, { payload }) => {
                adapter.upsertOne(state, payload);
                state.scope = isStaffRole(payload.role) ? 'team' : 'self';
                // A demoted staff member must lose the team list immediately.
                if (state.scope === 'self') {
                    const keep = state.entities[payload.$id];
                    adapter.removeAll(state);
                    if (keep) adapter.addOne(state, keep);
                }
            })
            // refresh failures are deliberately silent: keep the last known state.

            .addCase(updateMyProfile.fulfilled, (state, { payload }) => {
                adapter.upsertOne(state, payload);
            })
            .addCase(updateMyProfile.rejected, (state, { payload, error }) => {
                state.error = payload || error.message;
            })

            // --- list ---
            .addCase(fetchUsers.pending, (state) => {
                state.listStatus = 'loading';
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, { payload }) => {
                const me = state.meId ? state.entities[state.meId] : null;
                adapter.setAll(state, payload.rows);
                // keep my own row even if the list did not include it
                if (me && !state.entities[me.$id]) adapter.addOne(state, me);
                state.scope = payload.scope;
                state.listStatus = 'ready';
            })
            .addCase(fetchUsers.rejected, (state, { payload, error }) => {
                state.listStatus = 'failed';
                state.error = payload || error.message;
            })

            // --- block (optimistic) ---
            .addCase(setUserBlocked.pending, (state, { meta }) => {
                const { userId, isBlocked } = meta.arg;
                addPending(state, userId);
                adapter.updateOne(state, { id: userId, changes: { isBlocked: !!isBlocked } });
            })
            .addCase(setUserBlocked.fulfilled, (state, { payload }) => {
                adapter.upsertOne(state, payload);
                removePending(state, payload.$id);
            })
            .addCase(setUserBlocked.rejected, (state, { meta, payload, error }) => {
                const { userId, isBlocked } = meta.arg;
                removePending(state, userId);
                // roll back to the previous value
                adapter.updateOne(state, { id: userId, changes: { isBlocked: !isBlocked } });
                state.error = payload || error.message;
            })

            // --- role ---
            .addCase(setUserRole.pending, (state, { meta }) => {
                addPending(state, meta.arg.userId);
            })
            .addCase(setUserRole.fulfilled, (state, { payload }) => {
                adapter.upsertOne(state, payload);
                removePending(state, payload.$id);
            })
            .addCase(setUserRole.rejected, (state, { meta, payload, error }) => {
                removePending(state, meta.arg.userId);
                state.error = payload || error.message;
            });
    },
});

export const {
    setUserQuery,
    setUserRoleFilter,
    setUserBlockedFilter,
    resetUserFilters,
    clearUserError,
    clearUsers,
} = usersSlice.actions;

export default usersSlice.reducer;

// ---------- Selectors ----------

const selectUsersState = (state) => state.users;

const entitySelectors = adapter.getSelectors(selectUsersState);
export const selectAllUsers = entitySelectors.selectAll;
export const selectUserById = entitySelectors.selectById;

export const selectUsersScope = (state) => state.users.scope;
export const selectUsersError = (state) => state.users.error;
export const selectUsersListStatus = (state) => state.users.listStatus;
export const selectMeStatus = (state) => state.users.meStatus;
export const selectUserFilters = (state) => state.users.filters;
export const selectPendingUserIds = (state) => state.users.pendingIds;

export const selectMe = (state) =>
    state.users.meId ? state.users.entities[state.users.meId] || null : null;

export const selectIsTeam = (state) => isStaffRole(selectMe(state)?.role);

// True only when the signed-in user's own row says so. The router uses this
// to show the blocked page on every URL.
export const selectIsBlocked = (state) => selectMe(state)?.isBlocked === true;

// Search (name, email, username, phone, city, role) + role filter + blocked filter.
export const selectVisibleUsers = createSelector(
    [selectAllUsers, selectUserFilters],
    (users, { query, role, blocked }) => {
        const term = query.trim().toLowerCase();
        return users.filter((u) => {
            if (role !== 'all' && u.role !== role) return false;
            if (blocked === 'blocked' && !u.isBlocked) return false;
            if (blocked === 'active' && u.isBlocked) return false;
            if (!term) return true;
            return [u.name, u.email, u.username, u.phone, u.lastCity, u.role].some((v) =>
                String(v || '').toLowerCase().includes(term)
            );
        });
    }
);

// Numbers for the header strip above the table (team scope).
export const selectUserStats = createSelector([selectAllUsers], (users) => {
    const byRole = {};
    let blocked = 0;
    let totalSpent = 0;
    let orders = 0;
    for (const u of users) {
        byRole[u.role || 'new'] = (byRole[u.role || 'new'] || 0) + 1;
        if (u.isBlocked) blocked += 1;
        totalSpent += Number(u.totalSpent) || 0;
        orders += Number(u.ordersCount) || 0;
    }
    return { total: users.length, blocked, active: users.length - blocked, byRole, totalSpent, orders };
});