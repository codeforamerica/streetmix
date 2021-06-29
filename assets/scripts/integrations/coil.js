import Cookies from 'js-cookie'

if (document.monetization) {
  document.addEventListener(
    'load',
    document.coilMonetizationPolyfill.init({ btpToken: passToken() })
  )
}

function passToken () {
  const cookies = Cookies.get()
  if (cookies.btpToken !== undefined) {
    const btpToken = cookies.btpToken
    return btpToken
  } else {
    return null
  }
}
