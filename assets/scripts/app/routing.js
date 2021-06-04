import { AUTH0_SIGN_IN_CALLBACK_PATH } from './config'
import { URL_NEW_STREET, URL_EXAMPLE_STREET } from './constants'
import Authenticate from './auth0'
import store from '../store'

const AUTH0_SIGN_IN_CALLBACK_URL = new URL(
  AUTH0_SIGN_IN_CALLBACK_PATH,
  window.location.origin
).href

export function goReload () {
  window.location.reload()
}

export function goHome () {
  window.location.href = '/'
}

export function goNewStreet (sameWindow) {
  if (sameWindow) {
    window.location.replace(URL_NEW_STREET)
  } else {
    window.location.href = URL_NEW_STREET
  }
}

export function goExampleStreet () {
  window.location.href = URL_EXAMPLE_STREET
}

export function goTwitterSignIn () {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'twitter',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL
  })
}

export function goFacebookSignIn () {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'facebook',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL
  })
}

export function goGoogleSignIn () {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'google-oauth2',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL
  })
}

export function goUniversalSignIn (loginHint, screenHint) {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
    loginHint,
    screenHint,
    uiLocales: store.getState().locale.locale
  })
}

// DEPRECATED: We are disabling magic link login, and will remove it as soon as the dust settles.
//             See https://github.com/streetmix/streetmix/issues/2023
// export function goEmailSignIn (email, callback) {
//   const auth0 = Authenticate()
//   auth0.passwordlessStart(
//     {
//       send: 'link',
//       email: email,
//       connection: 'email',
//       authParams: {
//         redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
//         responseType: 'code'
//       }
//     },
//     (err, res) => {
//       callback(err, res)
//     }
//   )
// }
