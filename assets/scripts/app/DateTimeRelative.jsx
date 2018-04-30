import React from 'react'
import PropTypes from 'prop-types'
import { FormattedMessage, FormattedDate, FormattedTime } from 'react-intl'
import moment from 'moment'

const MINUTES_AGO = 1000 * 60 * 10
const SECONDS_AGO = 1000 * 60

export default function DateTimeRelative (props) {
  const now = moment()
  const date = moment(props.value)
  const diff = now - date

  if (diff >= 0) {
    if (diff < SECONDS_AGO) {
      return <FormattedMessage id="datetime.seconds-ago" defaultMessage="A few seconds ago" />
    }

    if (diff < MINUTES_AGO) {
      return <FormattedMessage id="datetime.minutes-ago" defaultMessage="A few minutes ago" />
    }
  }

  if (now.isSame(date, 'day')) {
    return (
      <FormattedMessage
        id="datetime.today"
        defaultMessage="Today at {time}"
        values={{
          time: <FormattedTime
            timeZone={props.timezone}
            value={props.value}
            hour="numeric"
            minute="numeric"
          />
        }}
      />
    )
  }

  if (now.clone().subtract(1, 'day').isSame(date, 'day')) {
    return (
      <FormattedMessage
        id="datetime.yesterday"
        defaultMessage="Yesterday at {time}"
        values={{
          time: <FormattedTime
            timeZone={props.timezone}
            value={props.value}
            hour="numeric"
            minute="numeric"
          />
        }}
      />
    )
  }

  if (now.isSame(date, 'year')) {
    return (
      <FormattedDate
        value={props.value}
        month="long"
        day="numeric"
      />
    )
  }

  return (
    <FormattedDate
      value={props.value}
      year="numeric"
      month="long"
      day="numeric"
    />
  )
}

DateTimeRelative.propTypes = {
  // prop should match an ISO date string, e.g. "2018-04-24T23:37:55.21Z"
  value: (props, propName, componentName) => {
    if (!/^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z$/.test(props[propName]) &&
      typeof props[propName] !== 'undefined') {
      return new Error(
        'Invalid prop `' + propName + '` supplied to' +
        ' `' + componentName + '`. It should be an ISO date string.' +
        ' Validation failed. Value: `' + props[propName] + '`'
      )
    }
  },
  timezone: PropTypes.string
}
