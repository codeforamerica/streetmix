import { debug } from '../preinit/debug_settings'
import { setMode, MODES } from './mode'
import {
  URL_NEW_STREET,
  URL_NEW_STREET_COPY_LAST,
  JUST_SIGNED_IN_PATH,
  URL_ERROR,
  URL_GLOBAL_GALLERY,
  URL_RESERVED_PREFIX,
  URL_SURVEY_FINISHED,
  URL_RETURNED_FROM_PAYMENT,
  URL_EXTERNAL_UPGRADE_PATH,
  RESERVED_URLS
} from './constants'
import { normalizeSlug } from '../util/helpers'
import store from '../store'
import { setGalleryUserId } from '../store/slices/gallery'
import { saveCreatorId, saveStreetId } from '../store/slices/street'

// Used as a placeholder in URLs when the street is by an anonymous user
export const ANONYMOUS_USER_ID_FRAGMENT = '-'

let errorUrl = ''

export function getErrorUrl () {
  return errorUrl
}

export function processUrl () {
  // Get current pathname. The pathname will contain an initial `/` followed
  // by the path of the URL. The root pathname should always be `/`. It may
  // be possible for the URL to contain a trailing slash, but we don't want
  // that, so remove it, if present. This will cause the root pathname to be
  // an empty string.
  const pathname = window.location.pathname.replace(/\/+$/, '')

  // parts being split, although we really don't need to
  // filter out empty string parts
  const urlParts = pathname.split(/\//).filter((x) => x !== '')

  const queryString = new URLSearchParams(window.location.search)

  // Continue where we left off… or start with a default (demo) street
  if (pathname === '/' || pathname === '') {
    setMode(MODES.CONTINUE)

    // New street
  } else if (pathname === URL_NEW_STREET) {
    setMode(MODES.NEW_STREET)

    // New street (but start with copying last street)
  } else if (pathname === URL_NEW_STREET_COPY_LAST) {
    setMode(MODES.NEW_STREET_COPY_LAST)

    // Coming back from a successful sign in
  } else if (pathname === JUST_SIGNED_IN_PATH) {
    setMode(MODES.JUST_SIGNED_IN)

    // When we try to pay with Patreon, we want to display the
    // upgrade dialogue again for the user, so we need to know
    // that they have returned in the frontend
  } else if (pathname === URL_RETURNED_FROM_PAYMENT) {
    setMode(MODES.JUST_RETURNED_FROM_PAYMENT)

    // There may have been a Patreon error
    if (queryString.get('error')) {
      setMode(MODES.JUST_RETURNED_FROM_PAYMENT_ERROR)
    }

    // Prompt user to upgrade if they have come from the
    // website to upgrade
  } else if (pathname === URL_EXTERNAL_UPGRADE_PATH) {
    setMode(MODES.PROMPT_UPGRADE)

    // Error
  } else if (pathname.startsWith(URL_ERROR)) {
    setMode(MODES.ERROR)
    errorUrl = urlParts[1]

    // Global gallery
  } else if (pathname === URL_GLOBAL_GALLERY) {
    setMode(MODES.GLOBAL_GALLERY)

    // Survey finished
  } else if (pathname === URL_SURVEY_FINISHED) {
    setMode(MODES.SURVEY_FINISHED)

    // User gallery
  } else if (urlParts.length === 1 && urlParts[0]) {
    store.dispatch(setGalleryUserId(urlParts[0]))
    setMode(MODES.USER_GALLERY)

    // TODO add is integer urlParts[1]
    // Existing street by an anonymous person
  } else if (
    urlParts.length === 2 &&
    urlParts[0] === ANONYMOUS_USER_ID_FRAGMENT &&
    urlParts[1]
  ) {
    store.dispatch(saveCreatorId(null))
    store.dispatch(saveStreetId(null, urlParts[1]))
    setMode(MODES.EXISTING_STREET)

    // Existing street by a user person
  } else if (urlParts.length >= 2 && urlParts[0] && urlParts[1]) {
    let creatorId = urlParts[0]

    if (creatorId.charAt(0) === URL_RESERVED_PREFIX) {
      creatorId = creatorId.substr(1)
    }

    store.dispatch(saveCreatorId(creatorId))

    // if `urlParts[1]` is not an integer, redirect to user's gallery
    if (Number.isInteger(window.parseInt(urlParts[1])) === false) {
      store.dispatch(setGalleryUserId(urlParts[0]))
      setMode(MODES.USER_GALLERY)
    } else {
      store.dispatch(saveStreetId(null, urlParts[1]))
      setMode(MODES.EXISTING_STREET)
    }

    // 404: Catch-all
  } else {
    setMode(MODES.NOT_FOUND)
  }
}

export function getStreetUrl (street) {
  let url = '/'
  if (street.creatorId) {
    // Add a initial slash to the creator check to match reserved paths
    if (RESERVED_URLS.indexOf('/' + street.creatorId) !== -1) {
      url += URL_RESERVED_PREFIX
    }

    url += street.creatorId
  } else {
    url += ANONYMOUS_USER_ID_FRAGMENT
  }

  url += '/'

  url += street.namespacedId

  if (street.creatorId) {
    const slug = normalizeSlug(street.name)
    if (slug) {
      url += '/' + window.encodeURIComponent(slug)
    }
  }

  return url
}

export function updatePageUrl (forceGalleryUrl, userId = null) {
  let url
  if (forceGalleryUrl) {
    const slug = userId || 'gallery/'
    url = '/' + slug
  } else {
    url = getStreetUrl(store.getState().street)
  }

  if (debug.forceLeftHandTraffic) {
    url += '&debug-force-left-hand-traffic'
  }
  if (debug.forceUnsupportedBrowser) {
    url += '&debug-force-unsupported-browser'
  }
  if (debug.forceNonRetina) {
    url += '&debug-force-non-retina'
  }
  if (debug.forceReadOnly) {
    url += '&debug-force-read-only'
  }
  if (debug.forceLiveUpdate) {
    url += '&debug-force-live-update'
  }
  if (debug.forceOfflineMode) {
    url += '&debug-force-offline'
  }

  url = url.replace(/&/, '?')

  window.history.replaceState(null, null, url)
}
