/**
 * Streetmix
 *
 */
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/browser'

// Stylesheets
import '../../node_modules/leaflet/dist/leaflet.css'
import '../styles/styles.scss'

// Polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'
import 'whatwg-fetch' // fetch API
import 'handjs' // microsoft's pointer events / touch-action spec
import './vendor/canvas-toBlob.js'
import './vendor/Blob.js'
import './vendor/polyfills/customevent' // customEvent in IE
import './vendor/polyfills/Element.closest'
import './vendor/polyfills/Element.remove'

// Redux
import store from './store'

// Main object
import { initialize } from './app/initialization'
import App from './app/App'

// third party integrations
import './integrations/coil'

// Error tracking
// Load this before all other modules. Only load when run in production.
if (
  window.location.hostname === 'streetmix.net' ||
  window.location.hostname === 'www.streetmix.net'
) {
  Sentry.init({
    dsn: 'https://fac2c23600414d2fb78c128cdbdeaf6f@sentry.io/82756',
    whitelistUrls: [/streetmix\.net/, /www\.streetmix\.net/]
  })
}

// A "not loading" troubleshooting popup to provide a "way out" of totally
// frozen UIs. This uses very backwards-compatible JavaScript on purpose.
// Display this after 10 seconds, but if the #loading container has already
// been hidden, this will have no effect.
window.setTimeout(function () {
  const el = document.getElementById('loading-stuck-notice')
  if (!el) return
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  el.setAttribute('aria-hidden', 'false')
}, 10000)

// Accept HMR in Parcel
if (module && module.hot) {
  module.hot.accept()
}

// Mount React components
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('react-app')
)

initialize()
