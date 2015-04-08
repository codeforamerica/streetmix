/*
 * Streetmix
 *
 * Front-end (mostly) by Marcin Wichary, Code for America fellow in 2013.
 *
 */

//= require modernizr
//= require moment
//= require jquery
//= require jquery.cookie

//= require_self
//= require_tree ./util
//= require_tree ./app

//= require ./menus/menus
//= require_tree ./menus

//= require ./dialogs/dialogs
//= require_tree ./dialogs

//= require_tree ./segments
//= require_tree ./streets
//= require_tree ./gallery
//= require_tree ./users

// TODO: Gradually migrate everything from global onto the Stmx namespace
var Stmx = {
  app: {},
  ui: {}
};
