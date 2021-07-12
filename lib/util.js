const IMPERIAL_METRIC_MULTIPLIER = 30 / 100
const METRIC_PRECISION = 3
const IMPERIAL_PRECISION = 5

function convertImperialMeasurementToMetric (value) {
  return Number.parseFloat(
    (value * IMPERIAL_METRIC_MULTIPLIER).toFixed(METRIC_PRECISION)
  )
}

function convertMetricMeasurementToImperial (value) {
  const resolution = 1 / 6 // this is the metric resolution
  const new1 = value / IMPERIAL_METRIC_MULTIPLIER
  const new2 = Math.round(new1 / resolution) * resolution
  return Number.parseFloat(new2.toFixed(IMPERIAL_PRECISION))
}

exports.asStreetJson = function (street) {
  const json = {
    id: street.id,
    namespacedId: street.namespacedId,
    name: street.name,
    clientUpdatedAt: street.clientUpdatedAt,
    data: street.data,
    createdAt: street.createdAt,
    updatedAt: street.updatedAt,
    originalStreetId: street.originalStreetId
  }

  if (street.creatorId) {
    json.creator = { id: street.creatorId }
  }

  // A temporary thing where we return width values pre-calculated as metric!
  // Doing the conversion at this means the API will always have metric values,
  // while we don't edit the database yet.
  // The original width is stored as `widthImperial` for reference
  // Change street width to metric
  street.data.street.widthImperial = street.data.street.width
  street.data.street.width = convertImperialMeasurementToMetric(
    street.data.street.width
  )
  // Change all street segments to metric
  if (street.data.street.segments) {
    json.data.street.segments = street.data.street.segments.map((segment) => ({
      ...segment,
      widthImperial: segment.width,
      width: convertImperialMeasurementToMetric(segment.width)
    }))
  }

  return json
}

exports.convertMetricBackToImperialUnits = function (street) {
  street.width = convertMetricMeasurementToImperial(street.width)
  street.segments = street.segments.map((segment) => {
    segment.width = convertMetricMeasurementToImperial(segment.width)
    return segment
  })

  return street
}

exports.asUserJson = function (user) {
  const userJson = {
    id: user.id,
    profileImageUrl: user.profileImageUrl,
    flags: user.flags || {},
    roles: user.roles || [],
    data: user.data || {}
  }

  userJson.roles = userJson.roles || []
  if (!userJson.roles.includes('USER')) {
    // Also, make USER appear first in the list consistently
    userJson.roles.unshift('USER')
  }

  return userJson
}

exports.ERRORS = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  STREET_NOT_FOUND: 'STREET_NOT_FOUND',
  STREET_DELETED: 'STREET_DELETED',
  UNAUTHORISED_ACCESS: 'UNAUTHORISED_ACCESS',
  FORBIDDEN_REQUEST: 'FORBIDDEN_REQUEST',
  CANNOT_CREATE_STREET: 'CANNOT_CREATE_STREET',
  CANNOT_UPDATE_STREET: 'CANNOT_UPDATE_STREET',
  CANNOT_GET_STREET: 'CANNOT_GET_STREET',
  CANNOT_GET_USER: 'CANNOT_GET_USER',
  CANNOT_CREATE_USER: 'CANNOT_CREATE_USER'
}

exports.SAVE_THUMBNAIL_EVENTS = {
  INITIAL: 'INITIAL',
  SHARE: 'SHARE',
  TIMER: 'TIMER',
  BEFOREUNLOAD: 'BEFOREUNLOAD',
  PREVIOUS_STREET: 'PREVIOUS_STREET',
  TEST: 'TEST'
}

exports.requestIp = function (req) {
  if (req.headers['x-forwarded-for'] !== undefined) {
    return req.headers['x-forwarded-for'].split(', ')[0]
  } else {
    return req.connection.remoteAddress
  }
}
