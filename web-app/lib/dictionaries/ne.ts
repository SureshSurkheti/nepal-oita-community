import type { Dictionary } from './en'

/* The Nepali strings.
 *
 * READ THIS BEFORE PUBLISHING — the committee should check these words.
 * They were written to be plain and spoken, the way the community actually
 * talks, rather than the formal register a dictionary gives you. A few choices
 * are deliberate and worth confirming with somebody who uses the site:
 *
 *   - "साइन इन" over "प्रवेश गर्नुहोस्". Everyone types the English word into
 *     every other app they use; the Sanskritised form reads as officialdom.
 *   - "सदस्य" for member throughout, never "मेम्बर".
 *   - "समिति" for the committee, matching what the minutes already call it.
 *   - Buttons are imperative ("बचत गर्नुहोस्"), labels are nouns. Mixing the two
 *     is the usual way a translated interface starts sounding machine-made.
 *
 * Typed as Dictionary, so a key added to en.ts and forgotten here fails the
 * build rather than silently showing English on the Nepali site.
 */
export const ne: Dictionary = {
  nav: {
    about: 'हाम्रो बारेमा',
    programmes: 'कार्यक्रमहरू',
    events: 'कार्यक्रम तालिका',
    gallery: 'ग्यालरी',
    stories: 'अनुभवहरू',
    decisions: 'निर्णयहरू',
    members: 'सदस्यहरू',
    contact: 'सम्पर्क',
    home: 'गृहपृष्ठ',
    committee: 'समिति',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    signingOut: 'साइन आउट हुँदै…',
    profile: 'प्रोफाइल',
    myProfile: 'मेरो प्रोफाइल',
    enterCode: 'आफ्नो कोड हाल्नुहोस्',
    openMenu: 'मेनु खोल्नुहोस्',
    closeMenu: 'मेनु बन्द गर्नुहोस्',
    menu: 'मेनु',
    skipToContent: 'मुख्य सामग्रीमा जानुहोस्',
    homeAria: 'नेपाल–ओइता समुदाय, गृहपृष्ठ',
    joinCommunity: 'समुदायमा सहभागी हुनुहोस्',
    signedInAs: 'साइन इन हुनुभएको',
    backToTop: 'माथि फर्कनुहोस्',
    back: 'पछाडि',
  },
  lang: {
    label: 'भाषा',
    switchTo: 'भाषा बदल्नुहोस्',
  },
  common: {
    seeAll: 'सबै हेर्नुहोस्',
    showAll: 'सबै देखाउनुहोस्',
    showFewer: 'कम देखाउनुहोस्',
    readMore: 'थप पढ्नुहोस्',
    loading: 'लोड हुँदै…',
    saving: 'बचत हुँदै…',
    sending: 'पठाउँदै…',
    uploading: 'अपलोड हुँदै…',
    deleting: 'हटाउँदै…',
    save: 'बचत गर्नुहोस्',
    cancel: 'रद्द गर्नुहोस्',
    edit: 'सम्पादन',
    del: 'हटाउनुहोस्',
    close: 'बन्द गर्नुहोस्',
    yes: 'हो',
    no: 'होइन',
    membersOnly: 'सदस्यहरूका लागि मात्र',
    optional: 'ऐच्छिक',
    required: 'अनिवार्य',
  },
  auth: {
    memberSignIn: 'सदस्य साइन इन',
    email: 'इमेल ठेगाना',
    password: 'पासवर्ड',
    makeAccount: 'खाता बनाउनुहोस्',
    signInInstead: 'बरु साइन इन गर्नुहोस्',
    firstTime: 'पहिलो पटक हो?',
    haveAccount: 'पहिल्यै खाता छ?',
    membershipCode: 'तपाईंको सदस्यता कोड',
    linkMembership: 'मेरो सदस्यता जोड्नुहोस्',
    checking: 'जाँच हुँदै…',
    working: 'काम हुँदै…',
    youAreSignedIn: 'तपाईं साइन इन हुनुभयो',
    wrongAccount: 'गलत खाताबाट साइन इन हुनुभयो?',
    signOutStartAgain: 'साइन आउट गरेर फेरि सुरु गर्नुहोस्',
  },
}
