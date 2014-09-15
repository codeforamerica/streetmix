function _createNewStreetOnServer() {
  if (settings.newStreetPreference == NEW_STREET_EMPTY) {
    _prepareEmptyStreet();
  } else {
    _prepareDefaultStreet();
  }

  var transmission = _packServerStreetData();

  $.ajax({
    // TODO const
    url: API_URL + 'v1/streets',
    data: transmission,
    type: 'POST',
    dataType: 'json',
    headers: { 'Authorization': _getAuthHeader() }
  }).done(_receiveNewStreet)
  .fail(_errorReceiveNewStreet);
}

function _receiveNewStreet(data) {
  _setStreetId(data.id, data.namespacedId);

  _saveStreetToServer(true);
}

function _errorReceiveNewStreet(data) {
  _showError(ERRORS.NEW_STREET_SERVER_FAILURE, true);
}

function _getFetchStreetUrl() {
  // TODO const
  if (street.creatorId) {
    var url = API_URL + 'v1/streets?namespacedId=' +
        encodeURIComponent(street.namespacedId) + '&creatorId=' +
        encodeURIComponent(street.creatorId);
  } else {
    var url = API_URL + 'v1/streets?namespacedId=' +
        encodeURIComponent(street.namespacedId);
  }

  return url;
}

function _fetchStreetFromServer() {
  var url = _getFetchStreetUrl();

  $.ajax({
    url: url,
    dataType: 'json',
    type: 'GET'
  }).done(_receiveStreet).fail(_errorReceiveStreet);
}

function _errorReceiveStreet(data) {
  if ((mode == MODES.CONTINUE) || (mode == MODES.USER_GALLERY) ||
      (mode == MODES.ABOUT) || (mode == MODES.GLOBAL_GALLERY)) {
    _goNewStreet();
  } else {
    if ((data.status == 404) || (data.status == 410)) {
      if (street.creatorId) {
        if (data.status == 410) {
          mode = MODES.STREET_410_BUT_LINK_TO_USER;
        } else {
          mode = MODES.STREET_404_BUT_LINK_TO_USER;
        }
      } else {
        mode = MODES.STREET_404;
      }
      // TODO swap for showError (here and elsewhere)
      _processMode();
    } else {
      _showError(ERRORS.NEW_STREET_SERVER_FAILURE, true);
    }
  }
}

function _saveStreetToServer(initial) {
  if (readOnly) {
    return;
  }

  var transmission = _packServerStreetData();

  if (initial) {
    // blocking

    $.ajax({
      // TODO const
      url: API_URL + 'v1/streets/' + street.id,
      data: transmission,
      dataType: 'json',
      type: 'PUT',
      contentType: 'application/json',
      headers: { 'Authorization': _getAuthHeader() }
    }).done(_confirmSaveStreetToServerInitial);
  } else {
    _newNonblockingAjaxRequest({
      // TODO const
      url: API_URL + 'v1/streets/' + street.id,
      data: transmission,
      dataType: 'json',
      type: 'PUT',
      contentType: 'application/json',
      headers: { 'Authorization': _getAuthHeader() }
    }, false);
  }
}

function _clearScheduledSavingStreetToServer() {
  window.clearTimeout(saveStreetTimerId);
}

function _fetchStreetForVerification() {
  // Don’t do it with any network services pending
  if (_getNonblockingAjaxRequestCount() || blockingAjaxRequestInProgress ||
      saveStreetIncomplete || abortEverything || remixOnFirstEdit) {
    return;
  }

  var url = _getFetchStreetUrl();

  latestRequestId = _getUniqueRequestHeader();
  latestVerificationStreet = _trimStreetData(street);

  $.ajax({
    url: url,
    dataType: 'json',
    type: 'GET',
    // TODO const
    headers: { 'X-Streetmix-Request-Id': latestRequestId }
  }).done(_receiveStreetForVerification).fail(_errorReceiveStreetForVerification);
}

function _receiveStreetForVerification(transmission, textStatus, request) {
  var requestId = parseInt(request.getResponseHeader('X-Streetmix-Request-Id'));

  if (requestId != latestRequestId) {
    return;
  }

  var localStreetData = _trimStreetData(latestVerificationStreet);
  var serverStreetData = _trimStreetData(_unpackStreetDataFromServerTransmission(transmission));

  if (JSON.stringify(localStreetData) != JSON.stringify(serverStreetData)) {
    console.log('NOT EQUAL');
    console.log('-');
    console.log(JSON.stringify(localStreetData));
    console.log('-');
    console.log(JSON.stringify(serverStreetData));
    console.log('-');
    console.log(transmission);

    _statusMessage.show(msg('STATUS_RELOADED_FROM_SERVER'));

    _infoBubble.suppress();

    _unpackServerStreetData(transmission, null, null, false);
    _updateEverything(true);

    _eventTracking.track(TRACK_CATEGORY_EVENT,
        TRACK_ACTION_STREET_MODIFIED_ELSEWHERE, null, null, false);
  }
}

function _errorReceiveStreetForVerification(data) {
  // 404 should never happen here, since 410 designates streets that have
  // been deleted (but remain hidden on the server)

  if (signedIn && ((data.status == 404) || (data.status == 410))) {
    _showError(ERRORS.STREET_DELETED_ELSEWHERE, true);
  }
}

function _receiveStreet(transmission) {
  _unpackServerStreetData(transmission, null, null, true);

  _propagateUnits();

  // TODO this is stupid, only here to fill some structures
  _createDomFromData();
  _createDataFromDom();

  serverContacted = true;
  _checkIfEverythingIsLoaded();
}

function _unpackStreetDataFromServerTransmission(transmission) {
  var street = _clone(transmission.data.street);

  street.creatorId = (transmission.creator && transmission.creator.id) || null;
  street.originalStreetId = transmission.originalStreetId || null;
  street.updatedAt = transmission.updatedAt || null;
  street.name = transmission.name || DEFAULT_NAME;

  // FIXME just read it and do 0 otherwise
  if (typeof transmission.data.street.editCount == 'undefined') {
    //console.log('editCount read is empty');
    street.editCount = null;
  } else {
    street.editCount = transmission.data.street.editCount;
    //console.log('editCount read is', street.editCount);
  }

  return street;
}

function _unpackServerStreetData(transmission, id, namespacedId, checkIfNeedsToBeRemixed) {
  street = _unpackStreetDataFromServerTransmission(transmission);

  if (transmission.data.undoStack) {
    undoStack = _clone(transmission.data.undoStack);
    undoPosition = transmission.data.undoPosition;
  } else {
    undoStack = [];
    undoPosition = 0;
  }

  var updatedSchema = _updateToLatestSchemaVersion(street);
  for (var i = 0; i < undoStack.length; i++) {
    if (_updateToLatestSchemaVersion(undoStack[i])) {
      updatedSchema = true;
    }
  }

  if (id) {
    _setStreetId(id, namespacedId);
  } else {
    _setStreetId(transmission.id, transmission.namespacedId);
  }

  if (checkIfNeedsToBeRemixed) {
    if (!signedIn || (street.creatorId != signInData.userId)) {
      remixOnFirstEdit = true;
    } else {
      remixOnFirstEdit = false;
    }

    if (updatedSchema && !remixOnFirstEdit) {
      _saveStreetToServer();
    }
  }
}

function _packServerStreetData() {
  var data = {};

  data.street = _trimStreetData(street);

  // Those go above data in the structure, so they need to be cleared here
  delete data.street.name;
  delete data.street.originalStreetId;
  delete data.street.updatedAt;

  // This will be implied through authorization header
  delete data.street.creatorId;

  if (FLAG_SAVE_UNDO) {
    data.undoStack = _clone(undoStack);
    data.undoPosition = undoPosition;
  }

  var transmission = {
    name: street.name,
    originalStreetId: street.originalStreetId,
    data: data
  }

  return JSON.stringify(transmission);
}

function _setStreetId(newId, newNamespacedId) {
  street.id = newId;
  street.namespacedId = newNamespacedId;

  _unifyUndoStack();

  _updateLastStreetInfo();
}

function _updateLastStreetInfo() {
  settings.lastStreetId = street.id;
  settings.lastStreetNamespacedId = street.namespacedId;
  settings.lastStreetCreatorId = street.creatorId;

  _saveSettingsLocally();
}
