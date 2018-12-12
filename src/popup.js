// TODO: define globals somewhere scoped better…maybe.
let ACTIVE_NOTE = 0;
let NOTES_SORTED = [];
let NOTES_DATA;

let userPhoto;
let notesArea;
let notesTitle;
let notesTitleLink;
let offlineUI;
let notesTitleContainer;
let titleInput;

let buttonSignout;
let buttonTimeStamp;
let buttonDeleteNote;
let buttonNotesMenuMore;
let buttonNewNote;
let buttonEditTitle;
let buttonEditTitleConfirm;

let isYouTube = false;
let activeTab;
let notesList;
const YTShortLink = 'https://youtu.be/';


const port = chrome.extension.connect({
  name: 'YTNotes',
});

// Init, Dom ready, start firing off all the things.
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loaded...');
  offlineUI = document.querySelector('.offline');

  if (navigator.onLine == false) {
    console.log('Offline handler');
    setOffline();
    return;
  }
  // Get Chrome Tab/window data
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const url = tabs[0].url;
    activeTab = tabs[0].id;

    isYouTube = url.includes('youtube.com/watch');

    if (isYouTube) {
      document.querySelector('.on-yt-indicator').style.display = 'block';
    }
  });


  editorToolbar = document.querySelector('.editor-toolbar');
  notesArea = document.querySelector('.note-area');
  notesTitle = document.querySelector('.note-title__plain-text');
  notesTitleLink = document.querySelector('.note-title__link');
  notesTitleContainer = document.querySelector('.note-title');
  buttonNewNote = document.querySelector('.new-note-button');
  buttonTimeStamp = document.querySelector('.add-marker__button');
  buttonDeleteNote = document.querySelector('.delete-note__button');
  notesList = document.querySelector('.notes-sidebar__notes');
  buttonNotesMenuMore = document.querySelector('.editor-toolbar__more-button');
  notesMenuMore = document.querySelector('.editor-toolbar__more');
  userPhoto = document.querySelector('.user-context__image');
  buttonSignout = document.querySelector('.editor-toolbar__sign-out-button');
  buttonEditTitle = document.querySelector('.note-title__edit-button');
  buttonEditTitleConfirm =
    document.querySelector('.note-title__confirm-edit-button');

  port.postMessage('YTNotes-loaded');
});

/**
 * Event listener for the browser extension. Successful message callback
 *  kicks off the loading of all notes and data to the frontent.
 */
port.onMessage.addListener(function(msg) {
  // if the backend successfully fetches and returns notesData…
  if (msg === 'noUser') {
    // No user is logged in, hide the notes view and show the Login View
    console.warn('No User');
    showLoginView();
    return;
  }

  if (msg === 'UserLoggedIn') {
    port.postMessage('getNotes');
  }

  if (msg.notesData) {
    console.log('NOTES DATA RECEIVED');
    loadNotes(msg.notesData.notes);
  }

  // Add the user photo to the aside menu if needed.
  if (msg.userPhoto && userPhoto.src != msg.userPhoto) {
    userPhoto.src = msg.userPhoto;
  }

  if (msg == 'saved') {
    // TODO: Creating a new date here makes the actual date slightly off
    const timeStamp = new Date().toDateString();
    setSaveIndicator(`Last Saved: ${timeStamp}`);
  }
});


/**
 * add Items for each note in the sidebar
 * @param {Object} notes array of notes from background.js/Firebase
 */
function loadNotes(notes) {
  NOTES_DATA = notes;
  console.log('Notes Sorted', NOTES_SORTED);
  updateSidebar();
  setCurrentNoteView(ACTIVE_NOTE);
  setSidebarActiveNote();
  bindEvents();
}

/**
 * Re-orderes NOTES_SORTED based on lastSaved date
 */
function sortByLastSavedNote() {
  // re-orders NOTES_
  ACTIVE_NOTE = 0;
  NOTES_SORTED = Object.values(NOTES_DATA);

  NOTES_SORTED.sort(function(a, b) {
    const dateA = new Date(a.lastSaved);
    const dateB = new Date(b.lastSaved);
    return dateB - dateA;
  });
}

/**
 * Populates the sidebar with the available notes
 *
 */
function updateSidebar() {
  sortByLastSavedNote();
  // REMOVE ALL OLD Entries
  while (notesList.firstChild) {
    notesList.removeChild(notesList.firstChild);
  }

  /** Populates the sidebar with DOM nodes for each note title
   *  The first time notes are sorted through and when we first set
   *  ACTIVE_NOTE to match the order of the sidebar
   */
  NOTES_SORTED.forEach((note, index) => {
    const noteItem = document.createElement('li');

    noteItem.classList.add('notes-sidebar__note');
    noteItem.innerHTML = `${note.videoTitle}`;
    noteItem.dataset.noteId = `${index}`;
    notesList.appendChild(noteItem);
  });

  bindSidebarNoteEvents();
  setSidebarActiveNote();
};

/**
 * Handles the class toggling for active state on sidebar items.
 *
 */
function setSidebarActiveNote() {
  const active = notesList.querySelector(`[data-note-id="${ACTIVE_NOTE}"]`);
  if (!active) return;
  // Remove the class on the current active item
  const previous = notesList.querySelector('.notes-sidebar__note--active');
  if (previous) {
    previous.classList.remove('notes-sidebar__note--active');
  }
  active.classList.add('notes-sidebar__note--active');
}

// TODO: function sort section
// Sort the entire sidebar, or s given collection by last-edit date.

/**
 * binds event listeners to interactive elements.
 * - Sidebar items
 * - Note area
 *
 */
function bindEvents() {
  bindSidebarNoteEvents();

  notesArea.addEventListener('input', debounce(inputHandler, 700, false));

  notesTitleLink.addEventListener('click', (e) => {
    e.preventDefault();

    chrome.tabs.create({url: e.target.href, selected: false});
  }, false);

  buttonNewNote.addEventListener('click', newNote);
  if (isYouTube) {
    buttonTimeStamp.addEventListener('click', addTimeMarkerToNote);
    buttonTimeStamp.classList.remove('add-marker__button--disabled');
  }

  buttonDeleteNote.addEventListener('click', deleteNote);

  buttonNotesMenuMore.addEventListener('click', (e) => {
    notesMenuMore.classList.toggle('editor-toolbar__more--open');
  });

  buttonEditTitle.addEventListener('click', editNoteTitleHandler);

  buttonSignout.addEventListener('click', (e) => {
    // send msg to backend to signout
    e.preventDefault();
    port.postMessage('signout');
    NOTES_DATA = {};
    NOTES_SORTED = {};
    updateSidebar();
    signInButton.removeEventListener('click', postLoginMessage);
    showLoginView();
  });
}

/**
 * Binds events to each item in the sidebar.
 */
function bindSidebarNoteEvents() {
  const notes = document.querySelectorAll('.notes-sidebar__note');


  // Click events for sidebar items
  notes.forEach((note) => {
    note.addEventListener('click', (e) => {
      ACTIVE_NOTE = e.target.dataset.noteId;
      setCurrentNoteView();
      setSidebarActiveNote();
    });
  });
}

/**
 *Note Area input handler
 *
 * @param {*} event
 */
function inputHandler(event) {
  console.log('debounced input event');
  saveCurrentNote();
  setSaveIndicator('Saving');
}

/**
 *Set's offline UI elements on
 *
 */
function setOffline() {
  offlineUI.style.display = 'flex';
}

/**
 *Set's the note data from the active note to the note view pane

 */
function setCurrentNoteView() {
  if (NOTES_SORTED.length == 0) return; TODO:// Set Blank state
  setCurrentNoteTitle();
  notesArea.innerHTML = NOTES_SORTED[ACTIVE_NOTE].note;

  // bind timestamp links
  const noteLinks = notesArea.querySelectorAll('.note_area__timestamp-wrapper');
  console.log('COLLECTING LINKS', noteLinks);
  noteLinks.forEach((current, index, link) => {
    console.log('Handline link', {current, index, link});
    timestampClickHandler(current);
  });
  setSaveIndicator({date: NOTES_SORTED[ACTIVE_NOTE].lastSaved});
}

/**
 *Handles setting the title in either a span, or a link.
 *
 */
function setCurrentNoteTitle() {
  if (NOTES_SORTED[ACTIVE_NOTE].YTVideo) {
    notesTitleLink.innerText = NOTES_SORTED[ACTIVE_NOTE].videoTitle;
    notesTitle.innerHTML = '';
  } else {
    notesTitle.innerText = NOTES_SORTED[ACTIVE_NOTE].videoTitle;
    notesTitleLink.innerHTML = '';
  }
  if (NOTES_SORTED[ACTIVE_NOTE].videoShareUrl) {
    notesTitleLink.href = NOTES_SORTED[ACTIVE_NOTE].videoShareUrl;
  }
}

/**
 * Shows the login view and hides other elements if there is no logged in
 *  user.
 *
 */
function showLoginView() {
  const view = document.querySelector('.logged-out-view');
  view.style.display = 'flex';

  // This view controls adding an event listener;
  const signInButton = view.querySelector('.login-w-Google');
  signInButton.addEventListener('click', postLoginMessage);
}

/**
 *Sends login message to backend.
 * Split to its own function to be 'unbindable'
 * @param {Event} e Click event
 */
function postLoginMessage(e) {
  e.preventDefault();
  port.postMessage('login');
}

/**
 *Handler for editing the note title.
 * TODO: Consider a cleaner approach to editing the title links
 * @param {Event} e click event from edit button.
 */
function editNoteTitleHandler(e) {
  // Add an input
  titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.classList.add('note-title__edit-input');
  titleInput.value = NOTES_SORTED[ACTIVE_NOTE].videoTitle;

  // Hide the readable/clickable titles
  notesTitle.style.visibility = 'hidden';
  notesTitleLink.style.visibility = 'hidden';

  notesTitleContainer.appendChild(titleInput);

  // add an event to save the note title on confirm
  // change the button to a confirm button
  buttonEditTitle.style.display = 'none';
  buttonEditTitleConfirm.style.display = 'flex';
  buttonEditTitleConfirm.addEventListener('click', saveTitle);
  titleInput.addEventListener('blur', saveTitle);
  titleInput.addEventListener('keyup', titleInputKeyHandler);
  // buttonEditTitleConfirm.addEventListener('click', saveTitle);
}

/**
 * keyup event handler. Watchs for Enter to fire saved
 *
 * @param {*} e
 */
function titleInputKeyHandler(e) {
  switch (e.keyCode) {
    case 13: // Enter
      saveTitle();
      break;
    default:
      break;
  }
}

/**
 *Save the title by calling saveCurrentNote() and passing the title input
 * value.
 * Resets the Title edit UI and updates the sidebar.
 * @param {*} e Click event
 */
function saveTitle(e) {
  const newTitle = titleInput.value;
  saveCurrentNote(newTitle);
  // Update the title
  setCurrentNoteTitle();
  // Hide the readable/clickable titles
  notesTitle.style.visibility = 'visible';
  notesTitleLink.style.visibility = 'visible';
  // reset Ui
  buttonEditTitle.style.display = 'flex';
  buttonEditTitleConfirm.style.display = 'none';

  // remove event listeners
  buttonEditTitleConfirm.removeEventListener('clcik', saveTitle);
  titleInput.removeEventListener('blur', saveTitle);
  titleInput.removeEventListener('keyup', titleInputKeyHandler);

  titleInput.remove();

  updateSidebar();
  titleInput = null;
}

/**
 * Updates the header saved-indicator field for the current note.
 *  @param {String | Object} state Saving state string to pass to the UI.
*           May also Passing an object with {date: ''} as a Date string
 */
function setSaveIndicator(state) {
  console.log('state', state);
  let savedTime;
  const today = new Date();
  // states to manage, typing,
  // saving -> makes call to background script, get's promise when done,
  // saving is it's own function that will hit Firebase
  const saveIndicator = document.querySelector('.save-indicator');
  if (state.note) {
    saveIndicator.innerHTML = state.note;
    return;
  }
  // Passed a specific date string, e.g., One stored in Firebase
  if (state.date) {
    savedTime = new Date(state.date);
  } else {
    savedTime = new Date(NOTES_SORTED[ACTIVE_NOTE].lastSaved);
  }

  if (today.toDateString() == savedTime.toDateString()) {
    saveIndicator.innerHTML = `Last Saved: ${savedTime.toLocaleTimeString()}`;
  } else {
    saveIndicator.innerHTML = `Last Saved: ${savedTime.toDateString()}`;
  }
}

/**
 * Posts a write message to the content script (content.js) to save the
 * current ACTIVE_NOTE
 * @param {String} title optional title change string
 */
function saveCurrentNote(title) {
  // get content of note Area
  const noteState = notesArea.innerHTML;
  if (title) {
    NOTES_SORTED[ACTIVE_NOTE].videoTitle = title;
  }

  console.log('saving current note', ACTIVE_NOTE);
  // update the object
  NOTES_SORTED[ACTIVE_NOTE].note = noteState;
  NOTES_SORTED[ACTIVE_NOTE].lastSaved = new Date().toISOString();
  NOTES_DATA[NOTES_SORTED[ACTIVE_NOTE].videoID] = NOTES_SORTED[ACTIVE_NOTE];
  // Notify the background script to send to Firebase
  port.postMessage({write: NOTES_DATA});
  // resort sidebar notes, because this note is now the latest.
  // unless the sidebar is already in the right order, latest on top.
  if (ACTIVE_NOTE == '0') return;
  updateSidebar();
}

/**
 * Delete's an event from Firebase.
 * Specifically, this method removes the object reference from notes and
 * updates the object in Firebase; it does not use firestore delete().
 * @param {Event} e Clicke event that triggered the delete call
 */
function deleteNote(e) {
  delete NOTES_DATA[NOTES_SORTED[ACTIVE_NOTE].videoID];
  port.postMessage({write: NOTES_DATA});

  updateSidebar();
  ACTIVE_NOTE = 0;
  setSidebarActiveNote();
  setCurrentNoteView();
}

/**
 * Get's the current time of the YouTube video and appends a node to the note
 * with the time stamp as a link and text.
 * TODO: Add a check for video ID's so you don't add links to the wrong video
 * TODO: Only show the time marker button on YouTube
 */
function addTimeMarkerToNote() {
  if (!isYouTube) return;

  chrome.tabs.sendMessage(activeTab, {'method': 'currentTime'}, (response) => {
    const time = response.data;
    const timestampWrapper = document.createElement('div');
    timestampWrapper.classList.add('note_area__timestamp-wrapper');
    timestampWrapper.style.display = 'inline-block';

    const stampNode = document.createElement('a');

    stampNode.innerHTML = `${time.timestamp}`;
    stampNode.href =
    `${YTShortLink}${time.videoID}?t=${Math.round(time.seconds)}`;

    stampNode.classList.add('notes_area__timestamp');

    stampNode.addEventListener('blur', (e) => {
      e.preventDefault();
      console.log('Link CLicked event target', e.target);

      chrome.tabs.create({url: e.target.href, selected: false});
    });

    timestampWrapper.addEventListener('click', timestampClickHandler);

    timestampWrapper.appendChild(stampNode);
    notesArea.appendChild(timestampWrapper);
  });
}

/**
 * Click handler for clicking a Timestamp within a note-view (note body).
 *  Calls Chrome.tabs.create to open a new tab at the link href
 *  [Note: Chrome extension popups do not handle <a> links by default.]
 *
 * @param {Node} parentNode Wrapper node of a <a> timestamp link.
 */
function timestampClickHandler(parentNode) {
  const link = parentNode.firstChild;
  console.log('LINK HANDLER', link);
  if (link) {
    parentNode.addEventListener('click', (e) => {
      console.log('Link true; making tab!', link.href);
      e.preventDefault();
      chrome.tabs.create({url: link.href, selected: false});
    });
  }
}

/**
 * Begins creating a new note.
 * Get's YT video data if applicable, then posts a write message to the
 * Content script (content.js).
 * Updates the UI view; refresh sidebar and switch note-view.
 *
 */
function newNote() {
  getYTData().then((note) => {
    // Check if the note exists first
    let noteIndex;
    if (NOTES_DATA[note.videoID]) {
      sortByLastSavedNote();
      NOTES_SORTED.find((existing, index) => {
        if (existing.videoID == note.videoID) {
          noteIndex = index;
          return;
        }
      });
      ACTIVE_NOTE = noteIndex;
      setCurrentNoteView();
      setSidebarActiveNote();
      setSaveIndicator({
        note: 'Note for video already exists. Switched to it!',
      });
      return;
    }

    // If the note doesn't exist, make a new one.
    NOTES_DATA[note.videoID] = note;
    port.postMessage({write: NOTES_DATA});
    // Updated sorted array to include latest note and resort and repopulate
    NOTES_SORTED = NOTES_DATA;
    sortByLastSavedNote();
    updateSidebar();
    bindSidebarNoteEvents();
    ACTIVE_NOTE = 0;
    setSidebarActiveNote();
    setCurrentNoteView(ACTIVE_NOTE);
  });
}


/**
 * Get's Video data from YT via the Content script (content.js) by sending a
 * method message.
 * handles YT Video notes, and 'blank' notes created from non-YouTube URL's
 *
 * @return {Promise} Promise resolves new note data.
 */
function getYTData() {
  const id = generateUUID();
  const note = {
    videoID: id,
    videoTitle: 'New Note',
    lastSaved: new Date().toISOString(),
    note: '',
    YTVideo: false,
  };

  return new Promise((resolve) => {
    if (!isYouTube) {
      resolve(note);
    }
    if (isYouTube) {
      chrome.tabs.sendMessage(activeTab, {
        method: 'getYTData',
      }, function(response) {
        console.log('Get DATA response', response);
        note.videoTitle = response.data.videoTitle;
        note.videoID = response.data.videoID;
        note.videoShareUrl = `${YTShortLink}${note.videoID}`;
        note.YTVideo = true,
        resolve(note);
      });
    }
  });
}

// TODO: split files
/**
 * Debounce utility
 * @param {Function} func function to debounce.
 * @param {Number} wait time in miliseconds to debunce by
 * @param {Boolean} immediate True to fire on the first occurrance.
 * @return {function}
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function(...args) {
    console.log('DEBOUCE ARGS', ...args);
    const context = this;
    // const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, ...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/**
 * Generates a string of 12 random characters - Simulated UUID
 * each 's' is replaced with 4 characters.
 * @return {string} 12 characters
 */
function generateUUID() {
  return 'sss'.replace(/s/g, s4);
}


/**
 * Converts a single character into 4 random characters
 * @return {String}
 */
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}
