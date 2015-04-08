var TRACK_ACTION_SAVE_AS_IMAGE = 'Save as image';

var SAVE_AS_IMAGE_DPI = 2.0;
var SAVE_AS_IMAGE_MIN_HEIGHT = 400;
var SAVE_AS_IMAGE_MIN_HEIGHT_WITH_STREET_NAME = SAVE_AS_IMAGE_MIN_HEIGHT + 150;
var SAVE_AS_IMAGE_BOTTOM_PADDING = 60;
var SAVE_AS_IMAGE_NAMES_WIDTHS_PADDING = 65;

function _getStreetImage(transparentSky, segmentNamesAndWidths, streetName) {
  var width = TILE_SIZE * street.width + BUILDING_SPACE * 2;

  var leftBuildingAttr = _getBuildingAttributes(street, true);
  var rightBuildingAttr = _getBuildingAttributes(street, false);

  var leftHeight = leftBuildingAttr.height;
  var rightHeight = rightBuildingAttr.height;

  var height = Math.max(leftHeight, rightHeight);
  if (height < SAVE_AS_IMAGE_MIN_HEIGHT) {
    height = SAVE_AS_IMAGE_MIN_HEIGHT;
  }

  if (streetName && (height < SAVE_AS_IMAGE_MIN_HEIGHT_WITH_STREET_NAME)) {
    height = SAVE_AS_IMAGE_MIN_HEIGHT_WITH_STREET_NAME;
  }

  height += SAVE_AS_IMAGE_BOTTOM_PADDING;

  if (segmentNamesAndWidths) {
    height += SAVE_AS_IMAGE_NAMES_WIDTHS_PADDING;
  }

  var el = document.createElement('canvas');
  el.width = width * SAVE_AS_IMAGE_DPI;
  el.height = height * SAVE_AS_IMAGE_DPI;

  var ctx = el.getContext('2d');

  // TODO hack
  var oldDpi = system.hiDpi;
  system.hiDpi = SAVE_AS_IMAGE_DPI;
  _drawStreetThumbnail(ctx, street, width, height, 1.0, false, true, transparentSky, segmentNamesAndWidths, streetName);
  system.hiDpi = oldDpi;

  return el;
}

function _saveAsImagePreviewReady() {
  document.querySelector('#save-as-image-preview-loading').classList.remove('visible');
  document.querySelector('#save-as-image-preview-preview').classList.add('visible');
}


function _updateSaveAsImageOptions() {
  settings.saveAsImageTransparentSky =
      document.querySelector('#save-as-image-transparent-sky').checked;
  settings.saveAsImageSegmentNamesAndWidths =
      document.querySelector('#save-as-image-segment-names').checked;
  settings.saveAsImageStreetName =
      document.querySelector('#save-as-image-street-name').checked;

  _saveSettingsLocally();

  window.setTimeout(function() { _updateSaveAsImageDialogBox(); }, 0);
}
