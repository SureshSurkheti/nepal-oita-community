/* The English strings. This file is the SOURCE — ne.ts mirrors its shape, and
 * its type is derived from this object, so adding a key here without adding it
 * to the Nepali file is a TypeScript error rather than a word that silently
 * stays English on the Nepali site.
 *
 * First pass covers the chrome: navigation, buttons, form labels, the sign-in
 * flow. Body prose on the deeper pages is still English in both languages and is
 * the next pass — the committee chose that order so the site becomes navigable
 * in Nepali before it becomes fully readable in it.
 */
export const en = {
  nav: {
    about: 'About',
    programmes: 'Programmes',
    events: 'Events',
    gallery: 'Gallery',
    stories: 'Stories',
    decisions: 'Decisions',
    members: 'Members',
    contact: 'Contact',
    home: 'Home',
    committee: 'Committee',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    profile: 'Profile',
    myProfile: 'My profile',
    enterCode: 'Enter your code',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
    skipToContent: 'Skip to content',
    homeAria: 'Nepal–Oita Community, home',
    joinCommunity: 'Join the community',
    signedInAs: 'Signed in as',
    backToTop: 'Back to top',
    back: 'Back',
  },
  lang: {
    label: 'Language',
    switchTo: 'Switch to',
  },
  common: {
    seeAll: 'See all',
    showAll: 'Show all',
    showFewer: 'Show fewer',
    readMore: 'Read more',
    loading: 'Loading…',
    saving: 'Saving…',
    sending: 'Sending…',
    uploading: 'Uploading…',
    deleting: 'Deleting…',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    del: 'Delete',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    membersOnly: 'Members only',
    optional: 'optional',
    required: 'required',
  },
  auth: {
    memberSignIn: 'Member sign in',
    email: 'Email address',
    password: 'Password',
    makeAccount: 'Make an account',
    signInInstead: 'Sign in instead',
    firstTime: 'First time here?',
    haveAccount: 'Already have an account?',
    membershipCode: 'Your membership code',
    linkMembership: 'Link my membership',
    checking: 'Checking…',
    working: 'Working…',
    youAreSignedIn: 'You are signed in',
    wrongAccount: 'Signed in as the wrong account?',
    signOutStartAgain: 'Sign out and start again',
  },
} as const

/* `as const` above is what makes the keys exact, and it also makes every VALUE a
   literal type — so a naive `typeof en` would demand that the Nepali file
   contain the English word "About". Widen the leaves back to string while
   keeping the shape, so ne.ts still fails the build if a key is missing or
   misspelled but is free to contain Nepali. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

export type Dictionary = Widen<typeof en>
