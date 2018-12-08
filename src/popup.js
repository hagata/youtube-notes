// TODO: define globals somewhere scoped better…maybe.
let ACTIVE_NOTE = '';
let NOTES_DATA;
let notesArea;
let notesTitle;
let notesTitleLink;
let timstampButton;
let deleteNoteButton;
// TODO: rename buttons to start with 'button'
let newNoteButton;
let isYouTube = false;
let activeTab;
let notesList;
const YTShortLink = 'https://youtu.be/';


const port = chrome.extension.connect({
  name: 'YTNotes',
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('loaded...');

  // Get Chrome Tab/window data
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const url = tabs[0].url;
    activeTab = tabs[0].id;

    isYouTube = url.includes('youtube.com/watch');

    if (isYouTube) {
      document.querySelector('.on-yt-indicator').style.display = 'block';
    }
  });


  notesArea = document.querySelector('.note-area');
  notesTitle = document.querySelector('.note-title');
  notesTitleLink = document.querySelector('.note-title__link');
  newNoteButton = document.querySelector('.new-note-button');
  timstampButton = document.querySelector('.add-marker__button');
  deleteNoteButton = document.querySelector('.delete-note__buton');
  notesList = document.querySelector('.notes-sidebar__notes');

  port.postMessage('YTNotes-loaded');
});

/**
 * Event listener for the browser extension. Successful message callback
 *  kicks off the loading of all notes and data to the frontent.
 */
port.onMessage.addListener(function(msg) {
  // if the backend successfully fetches and returns notesData…
  if (msg.notesData) {
    console.log('NOTES DATA RECEIVED');
    loadNotes(msg.notesData.notes);
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
  populateSidebar();
  setCurrentNoteView(ACTIVE_NOTE);
  bindEvents();
}

/**
 * Populates the sidebar with the available notes
 *
 */
function populateSidebar() {
  // REMOVE ALL OLD Entries
  while (notesList.firstChild) {
    notesList.removeChild(notesList.firstChild);
  }

  /** Populates the sidebar with DOM nodes for each note title
   *  The first time notes are sorted through and when we first set
   *  ACTIVE_NOTE to match the order of the sidebar
   */
  for (const note in NOTES_DATA) {
    const noteItem = document.createElement('li');

    noteItem.classList.add('notes-sidebar__note');
    noteItem.innerHTML = `${NOTES_DATA[note].videoTitle}`;
    ACTIVE_NOTE = note;
    noteItem.dataset.noteId = `${note}`;
    notesList.appendChild(noteItem);
  };
  setSidebarActiveNote();
}

/**
 * Handles the class toggling for active state on sidebar items.
 *
 */
function setSidebarActiveNote() {
  const active = notesList.querySelector(`[data-note-id="${ACTIVE_NOTE}"]`)
  console.log('ACTIVE NOTE SIDEBAR NODE', )
  // Remove the class on the current active item
  const previous = notesList.querySelector('.notes-sidebar__note--active')
  if (previous) {
    previous.classList.remove('notes-sidebar__note--active')
  }
  active.classList.add('notes-sidebar__note--active')
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
  const notes = document.querySelectorAll('.notes-sidebar__note');

  // Click events for sidebar items
  notes.forEach((note) => {
    note.addEventListener('click', (e) => {
      console.log('click sidebar', e);
      ACTIVE_NOTE = e.target.dataset.noteId;
      setCurrentNoteView();
      setSidebarActiveNote();
    });
  });

  notesArea.addEventListener('input', debounce(inputHandler, 700, false));

  notesTitle.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Link CLicked event target', e.target);

    chrome.tabs.create({url: e.target.href, selected: false});
  }, false);

  newNoteButton.addEventListener('click', newNote);
  if (isYouTube) {
    timstampButton.addEventListener('click', addTimeMarkerToNote);
    timstampButton.classList.remove('add-marker__button--disabled');
  }

  deleteNoteButton.addEventListener('click', e => {
    console.log('deleting note: ', NOTES_DATA[ACTIVE_NOTE].videoID)
    delete NOTES_DATA[ACTIVE_NOTE];
    port.postMessage({write: NOTES_DATA});
    populateSidebar();
    //TODO: Update the view to some other note?
  })
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
 *Set's the note data from the active note to the note view pane

 */
function setCurrentNoteView() {
  if (NOTES_DATA[ACTIVE_NOTE].YTVideo) {
    notesTitleLink.innerText = NOTES_DATA[ACTIVE_NOTE].videoTitle;
  } else {
    notesTitle.innerText = NOTES_DATA[ACTIVE_NOTE].videoTitle;
    notesTitleLink.innerText = '';
  }
  if (NOTES_DATA[ACTIVE_NOTE].videoShareUrl) {
    notesTitleLink.href = NOTES_DATA[ACTIVE_NOTE].videoShareUrl;
  }
  notesArea.innerHTML = NOTES_DATA[ACTIVE_NOTE].note;

  // bind timestamp links
  const noteLinks = notesArea.querySelectorAll('.note_area__timestamp-wrapper');
  console.log('COLLECTING LINKS', noteLinks);
  noteLinks.forEach((current, index, link) => {
    console.log('Handline link', {current, index, link});
    timestampClickHandler(current);
  });
  setSaveIndicator({date:NOTES_DATA[ACTIVE_NOTE].lastSaved});
}

/**
 * Updates the header saved-indicator field for the current note.
 *  @param {String | Object} state Saving state string to pass to the UI.
*           May also Passing an object with {date: ''} as a Date string
 */
function setSaveIndicator(state) {
  console.log('state', state);
  let savedTime;
  const today = new Date()
  // states to manage, typing,
  // saving -> makes call to background script, get's promise when done,
  // saving is it's own function that will hit Firebase
  const saveIndicator = document.querySelector('.save-indicator');
  if (state.note) {
    saveIndicator.innerHTML = state;
    return;
  }
  // Passed a specific date string, e.g., One stored in Firebase
  if (state.date) {
    savedTime = new Date(state.date);
  }
  else {
    savedTime = new Date(NOTES_DATA[ACTIVE_NOTE].lastSaved);
  }

  if (today.toDateString() == savedTime.toDateString()) {
    saveIndicator.innerHTML = `Last Saved: ${savedTime.toLocaleTimeString()}`;
  }
  else {
    saveIndicator.innerHTML = `Last Saved: ${savedTime.toDateString()}`;
  }
}

/**
 * Posts a write message to the content script (content.js) to save the
 * current ACTIVE_NOTE
 */
function saveCurrentNote() {
  // get content of note Area
  const noteState = notesArea.innerHTML;
  console.log('saving current note', NOTES_DATA[ACTIVE_NOTE]);
  // update the object
  NOTES_DATA[ACTIVE_NOTE].note = noteState;
  NOTES_DATA[ACTIVE_NOTE].lastSaved = new Date().toISOString();
  // Notify the background script to send to Firebase
  port.postMessage({write: NOTES_DATA});
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
    if (NOTES_DATA[note.videoID]) {
      console.log('VIDEO NOTE ALREADY EXISTS. ', )
      ACTIVE_NOTE = note.videoID;
      setSidebarActiveNote();
      setCurrentNoteView(ACTIVE_NOTE)
      setSaveIndicator({note: 'Note for video already exists. Switched to it!'})
      return;
    }

    NOTES_DATA[note.videoID] = note;
    console.log('Generate New Note', NOTES_DATA);
    port.postMessage({write: NOTES_DATA});
    ACTIVE_NOTE = note.videoID;
    setCurrentNoteView(ACTIVE_NOTE);
    populateSidebar();
  });
}

/**
 * Get's Video data from YT via the Content script (content.js) by sending a
 * method message.
 * handles YT Video notes, and 'blank' notes created from non-YouTube URL's
 *
 * @returns {Promise} Promise resolves new note data.
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
      console.log('%cTrying to Get YT title', 'color: red; font-weight: bold');
      // Get the video ID
      chrome.tabs.sendMessage(activeTab, {method: 'getYTData'}, function(response) {
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

// UTILS

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this; const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
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
 */
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}
