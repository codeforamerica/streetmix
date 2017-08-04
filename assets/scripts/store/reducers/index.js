import { combineReducers } from 'redux'
import app from './app'
import debug from './debug'
import dialogs from './dialogs'
import map from './map'
import menus from './menus'
import system from './system'
import settings from './settings'
import user from './user'

const reducers = combineReducers({
  app,
  debug,
  dialogs,
  map,
  menus,
  settings,
  system,
  user
})

export default reducers
