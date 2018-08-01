import { trackEvent } from '../app/event_tracking'
import { loseAnyFocus } from '../util/focus'
import { INFO_BUBBLE_TYPE_SEGMENT } from '../info_bubble/constants'
import { infoBubble } from '../info_bubble/info_bubble'
import { app } from '../preinit/app_settings'
import { setIgnoreStreetChanges } from '../streets/data_model'
import { getElAbsolutePos } from '../util/helpers'
import { generateRandSeed } from '../util/random'
import {
  SegmentTypes,
  getSegmentInfo,
  getSegmentVariantInfo
} from './info'
import {
  RESIZE_TYPE_INITIAL,
  RESIZE_TYPE_DRAGGING,
  RESIZE_TYPE_PRECISE_DRAGGING,
  MIN_SEGMENT_WIDTH,
  resizeSegment,
  normalizeSegmentWidth,
  scheduleControlsFadeout,
  cancelFadeoutControls,
  hideControls,
  cancelSegmentResizeTransitions
} from './resizing'
import { getVariantArray, getVariantString } from './variant_utils'
import { TILE_SIZE, DRAGGING_MOVE_HOLE_WIDTH, DragTypes } from './constants'
import { segmentsChanged, getSegmentEl } from './view'
import store from '../store'
import { addSegment, removeSegment } from '../store/actions/street'
import { clearMenus } from '../store/actions/menus'
import { updateDraggingState, clearDraggingState, setActiveSegment } from '../store/actions/ui'

export const DRAGGING_TYPE_NONE = 0
const DRAGGING_TYPE_CLICK_OR_MOVE = 1
const DRAGGING_TYPE_MOVE = 2
const DRAGGING_TYPE_RESIZE = 3

var _draggingType = DRAGGING_TYPE_NONE

export function draggingType () {
  return _draggingType
}

export var draggingResize = {
  segmentEl: null,
  floatingEl: null,
  mouseX: null,
  mouseY: null,
  elX: null,
  elY: null,
  width: null,
  originalX: null,
  originalWidth: null,
  right: false
}

export function changeDraggingType (newDraggingType) {
  _draggingType = newDraggingType

  document.body.classList.remove('segment-move-dragging')
  document.body.classList.remove('segment-resize-dragging')

  switch (_draggingType) {
    case DRAGGING_TYPE_RESIZE:
      document.body.classList.add('segment-resize-dragging')
      break
    case DRAGGING_TYPE_MOVE:
      document.body.classList.add('segment-move-dragging')
      break
  }
}

export function handleSegmentResizeStart (event) {
  let x, y

  if (event.touches && event.touches[0]) {
    x = event.touches[0].pageX
    y = event.touches[0].pageY
  } else {
    x = event.pageX
    y = event.pageY
  }

  setIgnoreStreetChanges(true)

  var el = event.target

  changeDraggingType(DRAGGING_TYPE_RESIZE)

  var pos = getElAbsolutePos(el)

  draggingResize.right = el.classList.contains('drag-handle-right')

  draggingResize.floatingEl = document.createElement('div')
  draggingResize.floatingEl.classList.add('drag-handle')
  draggingResize.floatingEl.classList.add('floating')

  if (el.classList.contains('drag-handle-left')) {
    draggingResize.floatingEl.classList.add('drag-handle-left')
  } else {
    draggingResize.floatingEl.classList.add('drag-handle-right')
  }

  draggingResize.floatingEl.style.left = (pos[0] - document.querySelector('#street-section-outer').scrollLeft) + 'px'
  draggingResize.floatingEl.style.top = pos[1] + 'px'
  document.body.appendChild(draggingResize.floatingEl)

  draggingResize.mouseX = x
  draggingResize.mouseY = y

  draggingResize.elX = pos[0]
  draggingResize.elY = pos[1]

  draggingResize.originalX = draggingResize.elX
  draggingResize.originalWidth = parseFloat(el.parentNode.getAttribute('data-width'))

  // Read the active segment element by looking at redux state, rather than event target
  const activeSegment = store.getState().ui.activeSegment
  if (typeof activeSegment !== 'number') return
  const activeSegmentEl = getSegmentEl(activeSegment)

  draggingResize.segmentEl = activeSegmentEl

  draggingResize.segmentEl.classList.add('hover')

  // todo: refactor
  window.dispatchEvent(new window.CustomEvent('stmx:show_segment_guides', { detail: { dataNo: window.parseInt(draggingResize.segmentEl.dataNo, 10) } }))

  infoBubble.hide()
  infoBubble.hideSegment(true)
  cancelFadeoutControls()
  hideControls()

  window.setTimeout(function () {
    draggingResize.segmentEl.classList.add('hover')
  }, 0)
}

function handleSegmentResizeMove (event) {
  let x, y, resizeType
  if (event.touches && event.touches[0]) {
    x = event.touches[0].pageX
    y = event.touches[0].pageY
  } else {
    x = event.pageX
    y = event.pageY
  }

  var deltaX = x - draggingResize.mouseX

  var deltaFromOriginal = draggingResize.elX - draggingResize.originalX
  if (!draggingResize.right) {
    deltaFromOriginal = -deltaFromOriginal
  }

  draggingResize.elX += deltaX
  draggingResize.floatingEl.style.left = (draggingResize.elX - document.querySelector('#street-section-outer').scrollLeft) + 'px'

  draggingResize.width = draggingResize.originalWidth + (deltaFromOriginal / TILE_SIZE * 2)
  var precise = event.shiftKey

  if (precise) {
    resizeType = RESIZE_TYPE_PRECISE_DRAGGING
  } else {
    resizeType = RESIZE_TYPE_DRAGGING
  }

  resizeSegment(draggingResize.segmentEl.dataNo, resizeType, draggingResize.width)

  draggingResize.mouseX = x
  draggingResize.mouseY = y
}

// TODO: This is no longer used anywhere (the keydown button that used to call this is no longer
// set), but we should consider making it possible to cancel resizing again.
export function handleSegmentResizeCancel () {
  // resizeSegment(draggingResize.segmentEl, RESIZE_TYPE_INITIAL, draggingResize.originalWidth, true, false)

  // handleSegmentResizeEnd()
}

// TODO: use suppressMouseEnter on <StreetEditable /> state
let _suppressMouseEnter = false

export function suppressMouseEnter () {
  return _suppressMouseEnter
}

export function handleSegmentResizeEnd (event) {
  setIgnoreStreetChanges(false)

  segmentsChanged(false)

  changeDraggingType(DRAGGING_TYPE_NONE)

  var el = draggingResize.floatingEl
  el.remove()

  // todo: refactor
  window.dispatchEvent(new window.CustomEvent('stmx:hide_segment_guides'))

  infoBubble.considerSegmentEl = draggingResize.segmentEl
  infoBubble.show(false)

  scheduleControlsFadeout(draggingResize.segmentEl)

  _suppressMouseEnter = true
  infoBubble.considerShowing(event, draggingResize.segmentEl, INFO_BUBBLE_TYPE_SEGMENT)
  window.setTimeout(function () {
    _suppressMouseEnter = false
  }, 50)

  if (draggingResize.width && (draggingResize.originalWidth !== draggingResize.width)) {
    trackEvent('INTERACTION', 'CHANGE_WIDTH', 'DRAGGING', null, true)
  }
}

export function onBodyMouseDown (event) {
  let topEl, withinMenu

  if (app.readOnly || (event.touches && event.touches.length !== 1)) {
    return
  }

  topEl = event.target

  // For street width editing on Firefox

  while (topEl && (topEl.id !== 'street-width')) {
    topEl = topEl.parentNode
  }

  withinMenu = !!topEl

  if (withinMenu) {
    return
  }

  loseAnyFocus()

  topEl = event.target

  while (topEl && (topEl.id !== 'info-bubble') && (topEl.id !== 'street-width') &&
    ((!topEl.classList) ||
    ((!topEl.classList.contains('menu-attached')) &&
    (!topEl.classList.contains('menu'))))) {
    topEl = topEl.parentNode
  }

  withinMenu = !!topEl

  if (withinMenu) {
    return
  }

  store.dispatch(clearMenus())
}

export function onBodyMouseMove (event) {
  if (_draggingType === DRAGGING_TYPE_NONE) {
    return
  }

  switch (_draggingType) {
    case DRAGGING_TYPE_RESIZE:
      handleSegmentResizeMove(event)
      break
  }

  event.preventDefault()
}

function doDropHeuristics (draggedItem, draggedItemType) {
  // Automatically figure out width
  const street = store.getState().street
  const { variantString, type, actualWidth } = draggedItem

  if (draggedItemType === DragTypes.PALETTE_SEGMENT) {
    if ((street.remainingWidth > 0) &&
      (actualWidth > street.remainingWidth)) {
      var segmentMinWidth = getSegmentVariantInfo(type, variantString).minWidth || 0

      if ((street.remainingWidth >= MIN_SEGMENT_WIDTH) &&
        (street.remainingWidth >= segmentMinWidth)) {
        draggedItem.actualWidth = normalizeSegmentWidth(street.remainingWidth, RESIZE_TYPE_INITIAL)
      }
    }
  }

  // Automatically figure out variants
  const { segmentBeforeEl, segmentAfterEl } = store.getState().ui.draggingState

  var left = (segmentAfterEl !== undefined) ? street.segments[segmentAfterEl] : null
  var right = (segmentBeforeEl !== undefined) ? street.segments[segmentBeforeEl] : null

  var leftOwner = left && SegmentTypes[getSegmentInfo(left.type).owner]
  var rightOwner = right && SegmentTypes[getSegmentInfo(right.type).owner]

  var leftOwnerAsphalt = (leftOwner === SegmentTypes.CAR) ||
    (leftOwner === SegmentTypes.BIKE) ||
    (leftOwner === SegmentTypes.TRANSIT)
  var rightOwnerAsphalt = (rightOwner === SegmentTypes.CAR) ||
    (rightOwner === SegmentTypes.BIKE) ||
    (rightOwner === SegmentTypes.TRANSIT)

  var leftVariant = left && getVariantArray(left.type, left.variantString)
  var rightVariant = right && getVariantArray(right.type, right.variantString)

  var variant = getVariantArray(type, variantString)
  const segmentInfo = getSegmentInfo(type)

  // Direction

  if (segmentInfo.variants.indexOf('direction') !== -1) {
    if (leftVariant && leftVariant['direction']) {
      variant['direction'] = leftVariant['direction']
    } else if (rightVariant && rightVariant['direction']) {
      variant['direction'] = rightVariant['direction']
    }
  }

  // Parking lane orientation

  if (segmentInfo.variants.indexOf('parking-lane-orientation') !== -1) {
    if (!right || !rightOwnerAsphalt) {
      variant['parking-lane-orientation'] = 'right'
    } else if (!left || !leftOwnerAsphalt) {
      variant['parking-lane-orientation'] = 'left'
    }
  }

  // Parklet orientation

  if (type === 'parklet') {
    if (left && leftOwnerAsphalt) {
      variant['orientation'] = 'right'
    } else if (right && rightOwnerAsphalt) {
      variant['orientation'] = 'left'
    }
  }

  // Turn lane orientation

  if (segmentInfo.variants.indexOf('turn-lane-orientation') !== -1) {
    if (!right || !rightOwnerAsphalt) {
      variant['turn-lane-orientation'] = 'right'
    } else if (!left || !leftOwnerAsphalt) {
      variant['turn-lane-orientation'] = 'left'
    }
  }

  // Transit shelter orientation and elevation

  if (type === 'transit-shelter') {
    if (left && (leftOwner === SegmentTypes.TRANSIT)) {
      variant['orientation'] = 'right'
    } else if (right && (rightOwner === SegmentTypes.TRANSIT)) {
      variant['orientation'] = 'left'
    }
  }

  if (segmentInfo.variants.indexOf('transit-shelter-elevation') !== -1) {
    if (variant['orientation'] === 'right' && left && left.type === 'light-rail') {
      variant['transit-shelter-elevation'] = 'light-rail'
    } else if (variant['orientation'] === 'left' && right && right.type === 'light-rail') {
      variant['transit-shelter-elevation'] = 'light-rail'
    }
  }

  // Bike rack orientation

  if (type === 'sidewalk-bike-rack') {
    if (left && (leftOwner !== SegmentTypes.PEDESTRIAN)) {
      variant['orientation'] = 'left'
    } else if (right && (rightOwner !== SegmentTypes.PEDESTRIAN)) {
      variant['orientation'] = 'right'
    }
  }

  // Lamp orientation

  if (segmentInfo.variants.indexOf('lamp-orientation') !== -1) {
    if (left && right && leftOwnerAsphalt && rightOwnerAsphalt) {
      variant['lamp-orientation'] = 'both'
    } else if (left && leftOwnerAsphalt) {
      variant['lamp-orientation'] = 'left'
    } else if (right && rightOwnerAsphalt) {
      variant['lamp-orientation'] = 'right'
    } else if (left && right) {
      variant['lamp-orientation'] = 'both'
    } else if (left) {
      variant['lamp-orientation'] = 'left'
    } else if (right) {
      variant['lamp-orientation'] = 'right'
    } else {
      variant['lamp-orientation'] = 'both'
    }
  }

  draggedItem.variantString = getVariantString(variant)
}

export function onBodyMouseUp (event) {
  switch (_draggingType) {
    case DRAGGING_TYPE_NONE:
      return
    case DRAGGING_TYPE_CLICK_OR_MOVE:
      changeDraggingType(DRAGGING_TYPE_NONE)
      setIgnoreStreetChanges(false)
      break
    case DRAGGING_TYPE_RESIZE:
      handleSegmentResizeEnd(event)
      break
  }

  event.preventDefault()
}

function handleSegmentDragStart () {
  document.body.classList.add('segment-move-dragging')
  infoBubble.hide()
  cancelFadeoutControls()
  hideControls()
}

// TODO: This is no longer used anywhere (the keydown button that used to call this is no longer
// set), but we should consider making it possible to cancel segment moving again.
export function handleSegmentMoveCancel () {
  // draggingMove.originalEl.classList.remove('dragged-out')

  // draggingMove.segmentBeforeEl = null
  // draggingMove.segmentAfterEl = null

  // repositionSegments()
  // updateWithinCanvas(true)

  // draggingMove.floatingEl.remove()
  // document.querySelector('.palette-trashcan').classList.remove('visible')

  // changeDraggingType(DRAGGING_TYPE_NONE)
}

export const segmentSource = {
  canDrag (props) {
    return !store.getState().app.readOnly
  },

  isDragging (props, monitor) {
    return monitor.getItem().dataNo === props.dataNo
  },

  beginDrag (props, monitor, component) {
    handleSegmentDragStart()

    return {
      dataNo: props.dataNo,
      variantString: props.segment.variantString,
      type: props.segment.type,
      randSeed: props.segment.randSeed,
      actualWidth: props.segment.width
    }
  },

  endDrag (props, monitor, component) {
    store.dispatch(clearDraggingState())
    oldDraggingState = null

    if (!monitor.didDrop()) {
      // if no object returned by a drop handler, it is not within the canvas
      if (monitor.getItemType() === DragTypes.SEGMENT) {
        // if existing segment is dropped outside canvas, delete it
        store.dispatch(removeSegment(props.dataNo))
        trackEvent('INTERACTION', 'REMOVE_SEGMENT', 'DRAGGING', null, true)
      }
    }

    cancelSegmentResizeTransitions()
    segmentsChanged(false)
    document.body.classList.remove('segment-move-dragging')
    document.body.classList.remove('not-within-canvas')
  }
}

export const paletteSegmentSource = {
  canDrag (props) {
    return !store.getState().app.readOnly
  },

  beginDrag (props, monitor, component) {
    handleSegmentDragStart()

    const segmentInfo = getSegmentInfo(props.type)

    return {
      variantString: Object.keys(segmentInfo.details).shift(),
      type: props.type,
      randSeed: segmentInfo.needRandSeed && generateRandSeed(),
      actualWidth: segmentInfo.defaultWidth
    }
  },

  endDrag (props, monitor, component) {
    store.dispatch(clearDraggingState())
    oldDraggingState = null

    cancelSegmentResizeTransitions()
    segmentsChanged(false)
    document.body.classList.remove('segment-move-dragging')
    document.body.classList.remove('not-within-canvas')
  }
}

export function collectDragSource (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  }
}

/**
 * Calculates the additional space needed before/after a segment during dragging
 *
 * @param {Number} dataNo - position of the current segment whose segment position
 *    is being calculated
 * @param {Object} draggingState - includes the positions of the segment the dragged
 *    segment is after (segmentAfterEl) and the segment the dragged segment is before
 *    (segmentBeforeEl), and undefined if it does not have one
 *
 */
export function makeSpaceBetweenSegments (dataNo, draggingState) {
  const { segmentBeforeEl, segmentAfterEl } = draggingState

  let spaceBetweenSegments = 0

  if (dataNo >= segmentBeforeEl) {
    spaceBetweenSegments += DRAGGING_MOVE_HOLE_WIDTH

    if (segmentAfterEl === undefined) {
      spaceBetweenSegments += DRAGGING_MOVE_HOLE_WIDTH
    }
  }

  if (dataNo > segmentAfterEl) {
    spaceBetweenSegments += DRAGGING_MOVE_HOLE_WIDTH

    if (segmentBeforeEl === undefined) {
      spaceBetweenSegments += DRAGGING_MOVE_HOLE_WIDTH
    }
  }

  return spaceBetweenSegments
}

let oldDraggingState = store.getState().ui.draggingState

// Checks to see if Redux dragging state needs to be updated, and if so, dispatches action.
// This prevents a constant dispatch of the updateDraggingState action which causes the
// dragging of the segment to be laggy and choppy.

function updateIfDraggingStateChanged (segmentBeforeEl, segmentAfterEl, draggedItem, draggedItemType) {
  let changed = false

  if (oldDraggingState) {
    changed = (segmentBeforeEl !== oldDraggingState.segmentBeforeEl ||
      segmentAfterEl !== oldDraggingState.segmentAfterEl ||
      draggedItem.dataNo !== oldDraggingState.draggedSegment)
  } else {
    changed = true
  }

  if (changed) {
    oldDraggingState = {
      segmentBeforeEl,
      segmentAfterEl,
      draggedSegment: draggedItem.dataNo
    }

    store.dispatch(updateDraggingState(segmentBeforeEl, segmentAfterEl, draggedItem.dataNo))
    doDropHeuristics(draggedItem, draggedItemType)
  }

  return changed
}

export const segmentTarget = {
  canDrop (props, monitor) {
    const type = monitor.getItemType()
    return (type === DragTypes.SEGMENT) || (type === DragTypes.PALETTE_SEGMENT)
  },

  hover (props, monitor, component) {
    if (!monitor.canDrop()) return

    const dragIndex = monitor.getItem().dataNo
    const hoverIndex = props.dataNo

    const hoveredSegment = component.getDecoratedComponentInstance().streetSegment
    const { left } = hoveredSegment.getBoundingClientRect()
    const hoverMiddleX = Math.round(left + (props.actualWidth * TILE_SIZE) / 2)
    const { x } = monitor.getClientOffset()

    // Ignore hovering over the dragged segment after dragging state is already set.
    // This prevents react-dnd's hover method from being confused on what to update
    // draggingState as when the dragged segment is behind another segment.
    if (dragIndex === hoverIndex && oldDraggingState) return

    if (dragIndex === hoverIndex) {
      updateIfDraggingStateChanged(dragIndex, undefined, monitor.getItem(), monitor.getItemType())
    } else {
      const { segments } = store.getState().street

      const segmentBeforeEl = (x > hoverMiddleX && hoverIndex !== segments.length - 1) ? hoverIndex + 1
        : (hoverIndex === segments.length - 1) ? undefined
          : hoverIndex

      const segmentAfterEl = (x > hoverMiddleX && hoverIndex !== 0) ? hoverIndex
        : (hoverIndex === 0) ? undefined
          : hoverIndex - 1

      updateIfDraggingStateChanged(segmentBeforeEl, segmentAfterEl, monitor.getItem(), monitor.getItemType())
    }
  }
}

function handleSegmentCanvasDrop (draggedItem, type) {
  const { segmentBeforeEl, segmentAfterEl, draggedSegment } = store.getState().ui.draggingState

  store.dispatch(clearDraggingState())
  // If dropped in same position as dragged segment was before, return
  if (segmentBeforeEl === draggedSegment && segmentAfterEl === undefined) {
    store.dispatch(setActiveSegment(draggedSegment))
    return
  }

  const newSegment = {
    variantString: draggedItem.variantString,
    width: draggedItem.actualWidth,
    type: draggedItem.type,
    randSeed: draggedItem.randSeed
  }

  let newIndex = (segmentAfterEl !== undefined) ? (segmentAfterEl + 1) : segmentBeforeEl

  if (type === DragTypes.SEGMENT) {
    store.dispatch(removeSegment(draggedSegment))
    newIndex = (newIndex <= draggedSegment) ? newIndex : newIndex - 1
  }

  store.dispatch(addSegment(newIndex, newSegment))
  store.dispatch(setActiveSegment(newIndex))
}

/**
 * Determines if segment was dropped/hovered on left or right side of street
 *
 * @param {Node} segment - reference to StreetEditable
 * @param {Number} droppedPosition - x position of dropped segment in reference
 *    to StreetEditable
 * @returns {string} - left, right, or null if dropped/hovered over a segment
 */
function isOverLeftOrRightCanvas (segment, droppedPosition) {
  const { remainingWidth } = store.getState().street
  const { left, right } = segment.getBoundingClientRect()

  const emptySegmentWidth = (remainingWidth * TILE_SIZE) / 2

  return (droppedPosition < left + emptySegmentWidth) ? 'left'
    : (droppedPosition > right - emptySegmentWidth) ? 'right'
      : null
}

export const canvasTarget = {
  hover (props, monitor, component) {
    if (!monitor.canDrop()) return

    if (monitor.isOver({shallow: true})) {
      const position = isOverLeftOrRightCanvas(component.streetSectionEditable, monitor.getClientOffset().x)

      if (!position) return

      const { segments } = store.getState().street
      const segmentBeforeEl = (position === 'left') ? 0 : undefined
      const segmentAfterEl = (position === 'left') ? undefined : segments.length - 1

      updateIfDraggingStateChanged(segmentBeforeEl, segmentAfterEl, monitor.getItem(), monitor.getItemType())
    }
  },

  drop (props, monitor, component) {
    const draggedItem = monitor.getItem()
    const draggedItemType = monitor.getItemType()
    handleSegmentCanvasDrop(draggedItem, draggedItemType)

    return { withinCanvas: true }
  }
}

export function collectDropTarget (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({ shallow: true })
  }
}
