var KEYS = {
  LEFT_ARROW: 37,
  RIGHT_ARROW: 39,
  ENTER: 13,
  ESC: 27,
  Y: 89,
  Z: 90,
  EQUAL: 187, // = or +
  EQUAL_ALT: 61, // Firefox
  PLUS_KEYPAD: 107,
  MINUS: 189,
  MINUS_ALT: 173, // Firefox
  MINUS_KEYPAD: 109
}

function _onGlobalKeyDown (event) {
  if (_isFocusOnBody()) {
    _onBodyKeyDown(event)
  }

  switch (event.keyCode) {
    case KEYS.ESC:
      if (draggingType == DRAGGING_TYPE_RESIZE) {
        _handleSegmentResizeCancel()
      } else if (draggingType == DRAGGING_TYPE_MOVE) {
        _handleSegmentMoveCancel()
      } else if (document.body.classList.contains('gallery-visible')) {
        _hideGallery(false)
      } else if (signedIn) {
        _showGallery(signInData.userId, false)
      } else {
        return
      }

      event.preventDefault()
      break
  }
}

function _onBodyKeyDown (event) {
  switch (event.keyCode) {
    case KEYS.EQUAL:
    case KEYS.EQUAL_ALT:
    case KEYS.PLUS_KEYPAD:
    case KEYS.MINUS:
    case KEYS.MINUS_ALT:
    case KEYS.MINUS_KEYPAD:
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      var negative = (event.keyCode == KEYS.MINUS) ||
        (event.keyCode == KEYS.MINUS_ALT) ||
        (event.keyCode == KEYS.MINUS_KEYPAD)

      var hoveredEl = _getHoveredEl()
      if (hoveredEl) {
        if (hoveredEl.classList.contains('segment')) {
          _incrementSegmentWidth(hoveredEl, !negative, event.shiftKey)
        } else if (hoveredEl.id == 'street-section-left-building') {
          _changeBuildingHeight(true, !negative)
        } else if (hoveredEl.id == 'street-section-right-building') {
          _changeBuildingHeight(false, !negative)
        }
        event.preventDefault()

        trackEvent('INTERACTION', 'CHANGE_WIDTH', 'KEYBOARD', null, true)
      }
      break
    case KEYS.LEFT_ARROW:
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      _scrollStreet(true, event.shiftKey)
      event.preventDefault()
      break
    case KEYS.RIGHT_ARROW:
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      _scrollStreet(false, event.shiftKey)
      event.preventDefault()
      break
    case KEYS.Z:
      if (!event.shiftKey && (event.metaKey || event.ctrlKey)) {
        _undo()
        event.preventDefault()
      } else if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
        _redo()
        event.preventDefault()
      }
      break
    case KEYS.Y:
      if (event.metaKey || event.ctrlKey) {
        _redo()
        event.preventDefault()
      }
      break
  }
}

function _getHoveredEl () {
  var el = document.querySelector('.hover')
  return el
}
