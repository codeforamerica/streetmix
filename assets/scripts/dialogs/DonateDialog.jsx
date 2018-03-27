/**
 * Donate (dialog box)
 *
 * Handles the "Donate" dialog box.
 *
 */
import React from 'react'
import PropTypes from 'prop-types'
import { trackEvent } from '../app/event_tracking'

const LOCALSTORAGE_DONATE_DISMISSED = 'settings-donate-dismissed'
const LOCALSTORAGE_DONATE_DELAYED_TIMESTAMP = 'settings-donate-delayed-timestamp'

export default class DonateDialog extends React.PureComponent {
  static propTypes = {
    closeDialog: PropTypes.func.isRequired
  }

  componentDidMount () {
    trackEvent('Interaction', 'Display donate dialog box', null, null, false)
  }

  onClickDonateButton = (event) => {
    trackEvent('Interaction', 'Clicked donate button', null, null, false)
    this.setSettingsDonateDismissed(true)
    this.props.closeDialog()
  }

  onClickClose = (event) => {
    trackEvent('Interaction', 'Clicked close donate dialog link', null, null, false)
    this.setSettingsDonateDelayed(true)
    this.props.closeDialog()
  }

  setSettingsDonateDismissed (value = true) {
    window.localStorage[LOCALSTORAGE_DONATE_DISMISSED] = JSON.stringify(value)
  }

  setSettingsDonateDelayed (value = true) {
    window.localStorage[LOCALSTORAGE_DONATE_DELAYED_TIMESTAMP] = Date.now().toString()
  }

  render () {
    return (
      <div className="donate-dialog">
        <h1>Streetmix needs your help!</h1>
        <div className="donate-dialog-text">
          <p className="donate-dialog-lede">
            Streetmix is a community-supported project. Unlike other “free” services on the Internet, we do not show ads or inject trackers that abuse your privacy. Instead, we depend on your support to keep Streetmix up and running.
          </p>
          <p>
            Please consider supporting us with a one-time or recurring contribution. Your donation will pay for our servers and cloud infrastructure, supporting other non-profits, advocacy groups, and students working to improve our streets. Additional revenue will be invested into further development of new features. Our expenses are completely transparent, so you can see exactly how your contributions are used by the Streetmix team.
          </p>
        </div>
        <p>
          <a
            className="button-like donate-dialog-button"
            href="https://opencollective.com/streetmix"
            target="_blank"
            rel="noopener"
            onClick={this.onClickDonateButton}
          >
            Donate to Streetmix
          </a>
        </p>
        <p>
          <a href="#" onClick={this.onClickClose}>No thanks</a>
        </p>
      </div>
    )
  }
}
