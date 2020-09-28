import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { isExternalUrl } from '../util/helpers'
const { ERRORS } = require('../../../lib/util')

ExternalLink.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]).isRequired,
  href: PropTypes.string.isRequired
}

function ExternalLink ({ children, href }) {
  const noInternet = useSelector((state) => state.system.noInternet)

  if (!isExternalUrl(href)) {
    throw new Error(ERRORS.INVALID_EXTERNAL_LINK)
  }

  if (noInternet) {
    return children
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default ExternalLink
