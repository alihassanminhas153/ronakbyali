// USAGE
//   dispatch(openLoginModal());                      // guests clicking add-to-cart do this for you
//   const open = useAppSelector(selectCartDrawerOpen);
//   dispatch(addToast({ type: 'success', message: 'Saved' }));
//   dispatch(toggleTheme());
//   // any thunk dispatched with { toast: true } shows an error toast when it fails
import { createSlice, isAnyOf, isRejected, nanoid } from '@reduxjs/toolkit';
import { isSessionEnded, signIn, signUp, continueWithEmail } from './authSlice';

const initialState = {
  loginModalOpen: false,
  cartDrawerOpen: false,
  mobileMenuOpen: false,
  searchOpen: false,
  theme: 'light', // 'light' | 'dark'
  toasts: [], // [{ id, type, message }]
};

const MAX_TOASTS = 5;

const uiSlice = createSlice({
  name: 'ui', // action type 'ui/openLoginModal' is relied on by nothing else, but keep the name
  initialState,
  reducers: {
    openLoginModal: (s) => { s.loginModalOpen = true; },
    closeLoginModal: (s) => { s.loginModalOpen = false; },
    openCartDrawer: (s) => { s.cartDrawerOpen = true; },
    closeCartDrawer: (s) => { s.cartDrawerOpen = false; },
    toggleCartDrawer: (s) => { s.cartDrawerOpen = !s.cartDrawerOpen; },
    openMobileMenu: (s) => { s.mobileMenuOpen = true; },
    closeMobileMenu: (s) => { s.mobileMenuOpen = false; },
    openSearch: (s) => { s.searchOpen = true; },
    closeSearch: (s) => { s.searchOpen = false; },
    setTheme: (s, a) => { s.theme = a.payload === 'dark' ? 'dark' : 'light'; },
    toggleTheme: (s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; },
    addToast: {
      reducer: (s, a) => {
        s.toasts.push(a.payload);
        if (s.toasts.length > MAX_TOASTS) s.toasts.shift();
      },
      prepare: ({ type = 'info', message }) => ({ payload: { id: nanoid(), type, message } }),
    },
    removeToast: (s, a) => {
      s.toasts = s.toasts.filter((t) => t.id !== a.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(isSessionEnded, (s) => {
        s.loginModalOpen = false;
        s.cartDrawerOpen = false;
        s.mobileMenuOpen = false;
      })
      // Close the login modal after a successful login.
      .addMatcher(isAnyOf(signIn.fulfilled, signUp.fulfilled, continueWithEmail.fulfilled), (s) => {
        s.loginModalOpen = false;
      })
      // Any rejected thunk whose meta says toast: true becomes an error toast.
      .addMatcher(
        (a) => isRejected(a) && a.meta?.toast === true,
        (s, a) => {
          s.toasts.push({
            id: a.meta.requestId,
            type: 'error',
            message: typeof a.payload === 'string' ? a.payload : a.error?.message || 'Something went wrong.',
          });
          if (s.toasts.length > MAX_TOASTS) s.toasts.shift();
        }
      );
  },
});

export const {
  openLoginModal, closeLoginModal, openCartDrawer, closeCartDrawer, toggleCartDrawer,
  openMobileMenu, closeMobileMenu, openSearch, closeSearch, setTheme, toggleTheme,
  addToast, removeToast,
} = uiSlice.actions;
export default uiSlice.reducer;

export const selectLoginModalOpen = (s) => s.ui.loginModalOpen;
export const selectCartDrawerOpen = (s) => s.ui.cartDrawerOpen;
export const selectMobileMenuOpen = (s) => s.ui.mobileMenuOpen;
export const selectSearchOpen = (s) => s.ui.searchOpen;
export const selectTheme = (s) => s.ui.theme;
export const selectToasts = (s) => s.ui.toasts;
