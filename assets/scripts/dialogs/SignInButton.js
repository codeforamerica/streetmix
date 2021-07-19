import React from 'react'
import { goPasswordSignIn } from '../app/routing'
import { useSelector } from 'react-redux'

function SignInButton () {
  const locale = useSelector((state) => state.locale.locale)
  const handleClick = () => goPasswordSignIn(locale)

  return <button onClick={handleClick}>Auth0 Sign-In</button>
}

export default SignInButton
