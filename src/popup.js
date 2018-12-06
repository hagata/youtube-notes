

const port = chrome.extension.connect({
  name: 'YTNotes',
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('loaded...');

  // Get Chrome Tab/window data
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const url = tabs[0].url;
    activeTab = tabs[0].id;

    console.log('SITE URL', {url, activeTab});
    isYouTube = url.includes('youtube.com');
    console.log('isYouTube?', isYouTube);
    if (isYouTube) {
      console.log('%cYou are on YouTube', 'color:red');
      document.querySelector('.on-yt-indicator').style.display = 'block';
    }
  });


  notesArea = document.querySelector('.note-area');
  notesTitle = document.querySelector('.note-title__link');
  newNoteButton = document.querySelector('.new-note-button');
  timstampButton = document.querySelector('.add-marker__button');


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


// TODO: define globals somewhere scoped better…maybe.
let ACTIVE_NOTE = 0;
let NOTES_DATA;
let notesArea;
let notesTitle;
let timstampButton;
let newNoteButton;
let isYouTube = false;
let video;
let activeTab;
const YTShortLink = 'https://youtu.be/';

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
  const notesList = document.querySelector('.notes-sidebar__notes');
  // REMOVE ALL OLD Entries
  while (notesList.firstChild) {
    notesList.removeChild(notesList.firstChild);
  }

  NOTES_DATA.forEach((element, index) => {
    const noteItem = document.createElement('li');

    noteItem.classList.add('notes-sidebar__note');
    noteItem.innerHTML = `${element.videoTitle}`;
    noteItem.dataset.noteId = `${index}`;
    notesList.appendChild(noteItem);
  });
}

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
    });
  });

  notesArea.addEventListener('input', debounce(inputHandler, 700, false));

  notesTitle.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Link CLicked event target', e.target);

    chrome.tabs.create({url: e.target.href, selected: false});
  }, false);

  newNoteButton.addEventListener('click', newNote);

  timstampButton.addEventListener('click', addTimeMarkerToNote);
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
  notesTitle.innerText = NOTES_DATA[ACTIVE_NOTE].videoTitle;
  if (NOTES_DATA[ACTIVE_NOTE].videoShareUrl) {
    notesTitle.href = NOTES_DATA[ACTIVE_NOTE].videoShareUrl;
  }
  notesArea.innerHTML = NOTES_DATA[ACTIVE_NOTE].note;

  //bind timestamp links
  const noteLinks = notesArea.querySelectorAll('.note_area__timestamp-wrapper')
  console.log('COLLECTING LINKS', noteLinks)
  noteLinks.forEach((current, index, link) => {
    console.log('Handline link', {current, index, link})
    timestampClickHandler(current)
  })
  setSaveIndicator();
}

/**
 * Updates the header saved-indicator field for the current note.
 *
 */
function setSaveIndicator(state) {
  console.log('state', state);
  // states to manage, typing,
  // saving -> makes call to background script, get's promise when done,
  // saving is it's own function that will hit Firebase
  const saveIndicator = document.querySelector('.save-indicator');
  if (state) {
    saveIndicator.innerHTML = state;
    return;
  }
  // Loads date from NOTES_DATA
  console.log('Current last saved time', NOTES_DATA[ACTIVE_NOTE].lastSaved );
  const savedTime = new Date(NOTES_DATA[ACTIVE_NOTE].lastSaved.seconds);
  saveIndicator.innerHTML = `Last Saved: ${savedTime.toDateString()}`;
}

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
  console.log('marker start…');
  chrome.tabs.sendMessage(activeTab, {'method': 'currentTime'}, (response) => {
    const time = response.data;
    const timestampWrapper = document.createElement('div');
    timestampWrapper.classList.add('note_area__timestamp-wrapper')
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

    timestampWrapper.addEventListener('click', timestampClickHandler)

    timestampWrapper.appendChild(stampNode);
    notesArea.appendChild(timestampWrapper);
  });
}

function timestampClickHandler(parentNode) {
  
  const link = parentNode.firstChild
  console.log('LINK HANDLER', link)
  if (link) {
    parentNode.addEventListener('click', e => {
      console.log('Link true; making tab!', link.href)
      e.preventDefault();
      chrome.tabs.create({url: link.href, selected: false});
    })
  }
}

function newNote() {
  getYTData().then((note) => {
    NOTES_DATA.push(note);
    // Write initial state to DB

    console.log('Generate New Note', NOTES_DATA);
    port.postMessage({write: NOTES_DATA});
    ACTIVE_NOTE = NOTES_DATA.length - 1;// cheeky way of getting the new item ID
    setCurrentNoteView(ACTIVE_NOTE);
    populateSidebar();
  });
}

function getYTData() {
  const note = {
    videoID: '',
    videoTitle: 'New Note',
    lastSaved: new Date().toISOString(),
    note: '',
  };

  return new Promise((resolve) => {
    if (!isYouTube) {
      resolve(note);
    }
    if (isYouTube) {
      // Get the video ID
      chrome.tabs.sendMessage(activeTab, {method: 'getYTData'}, function(response) {
        note.videoTitle = response.data.videoTitle;
        note.videoID = response.data.videoID;
        note.videoShareUrl = `${YTShortLink}${note.videoID}`;
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
