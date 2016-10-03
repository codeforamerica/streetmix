import React from 'react'
import MenuBar from './MenuBar'
import HelpMenu from './HelpMenu'
import ContactMenu from './ContactMenu'
import IdentityMenu from './IdentityMenu'
import SettingsMenu from './SettingsMenu'
import ShareMenu from './ShareMenu'
import { registerKeypress } from '../app/keypress'

export default class MenusContainer extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      activeMenu: null,
      activeMenuPos: [0, 0]
    }

    this.onMenuDropdownClick = this.onMenuDropdownClick.bind(this)
    this.hideAllMenus = this.hideAllMenus.bind(this)
  }

  componentDidMount () {
    // Hide menus if page loses visibility.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden === true) {
        this.hideAllMenus()
      }
    }, false)

    // Set up keypress listener to hide menus if visible
    registerKeypress('esc', this.hideAllMenus)

    // Set up a generic event listener to hide menus if visible.
    // This is triggered by the exported function `hideAllMenus` from
    // menu_controller.js, which contain legacy functions from pre-React
    window.addEventListener('stmx:hide_menus', this.hideAllMenus)
  }

  /**
   * Callback function passed to the MenuBar component.
   * Clicked buttons that have a menu component will report back to this component
   * what was clicked and where it should be placed, which is then passed to
   * individual menus.
   */
  onMenuDropdownClick (clickedItem) {
    // If the clicked menu is already active, it's toggled off.
    const activeMenu = this.state.activeMenu === clickedItem.name ? null : clickedItem.name
    this.setState({
      activeMenu: activeMenu,
      activeMenuPos: activeMenu ? clickedItem.position : [0, 0]
    })
  }

  hideAllMenus () {
    // Only act if there is currently an active menu.
    if (this.state.activeMenu) {
      this.setState({
        activeMenu: null,
        activeMenuPos: [0, 0]
      })

      // Force document.body to become the active element. Do not re-focus on
      // document.body if there were no menus to hide. This is sometimes
      // triggered by actions that do not check if a menu has closed, so we don't
      // want it to refocus needlessly.
      document.body.focus()
    }
  }

  render () {
    const { activeMenu, activeMenuPos } = this.state

    return (
      <div>
        <MenuBar onMenuDropdownClick={this.onMenuDropdownClick} />
        <HelpMenu isActive={activeMenu === 'help'} position={activeMenuPos} />
        <ContactMenu isActive={activeMenu === 'contact'} position={activeMenuPos} />
        <IdentityMenu isActive={activeMenu === 'identity'} position={activeMenuPos} />
        <SettingsMenu isActive={activeMenu === 'settings'} position={activeMenuPos} />
        <ShareMenu isActive={activeMenu === 'share'} position={activeMenuPos} />
      </div>
    )
  }
}
