

const port = chrome.extension.connect({
    name: "YTNotes"
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('loaded...')

    // Get Chrome Tab/window data
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = tabs[0].url;
        console.log('SITE URL', url)
        isYouTube = url.includes('youtube.com')

        if (isYouTube) {
            console.log('%rYou are on YouTube', 'color:red')
            document.querySelector('.on-yt-indicator').style.display = 'block';
        }

    });


    notesArea = document.querySelector('.note-area');
    notesTitle = document.querySelector('.note-title');
    newNoteButton = document.querySelector('.new-note-button');


    port.postMessage('YTNotes-loaded');
})

/**
 * Event listener for the browser extension. Successful message callback
 *  kicks off the loading of all notes and data to the frontent.
 */
port.onMessage.addListener(function (msg) {
    // if the backend successfully fetches and returns notesData…
    if (msg.notesData){
        console.log('NOTES DATA RECEIVED')
        loadNotes(msg.notesData.notes);
    }

    if (msg == 'saved') {
        // TODO: Creating a new date here makes the actual date slightly off
        let timeStamp = new Date().toDateString()
        setSaveIndicator(`Last Saved: ${timeStamp}`);
    }
});


// TODO: define globals somewhere scoped better…maybe.
let ACTIVE_NOTE = 0;
let NOTES_DATA;
let notesArea;
let notesTitle;
let newNoteButton;
let isYouTube = false;
let video;

/**
 * add Items for each note in the sidebar
 * @param {Object} notes array of notes from background.js/Firebase
 */
function loadNotes(notes) {
    NOTES_DATA = notes
    console.log('NOTES_DATA', NOTES_DATA)
    populateSidebar();
    setCurrentNoteView(ACTIVE_NOTE);
    bindEvents();
}

/**
 * Populates the sidebar with the available notes
 *
 */
function populateSidebar() {
    const notesList = document.querySelector('.notes-sidebar__notes')
    console.log('ul exists?', notesList)
    NOTES_DATA.forEach((element, index) => {
        console.log('populate sitebar', element)
        const noteItem = document.createElement('li')

        noteItem.classList.add('notes-sidebar__note')
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
    const notes = document.querySelectorAll('.notes-sidebar__note')

    //Click events for sidebar items
    notes.forEach((note) => {
        note.addEventListener('click', (e) => {
            console.log('click sidebar', e)
            ACTIVE_NOTE = e.target.dataset.noteId
            setCurrentNoteView();
        })
    })

    notesArea.addEventListener('input', debounce(inputHandler, 700, false))

    newNoteButton.addEventListener('click', newNote)
}

/**
 *Note Area input handler
 *
 * @param {*} event
 */
function inputHandler(event) {
    console.log('debounced input event')
    saveCurrentNote();
    setSaveIndicator('Saving')
}

/**
 *Set's the note data from the active note to the note view pane

 */
function setCurrentNoteView() {


    notesArea.innerHTML = NOTES_DATA[ACTIVE_NOTE].note;
    setSaveIndicator()
}

/**
 * Updates the header saved-indicator field for the current note.
 *
 */
function setSaveIndicator(state) {
    console.log('state', state)
    // states to manage, typing,
    // saving -> makes call to background script, get's promise when done,
    // saving is it's own function that will hit Firebase
    const saveIndicator = document.querySelector('.save-indicator');
    if (state) {
        saveIndicator.innerHTML = state;
        return;
    }
    // Loads date from NOTES_DATA
    console.log('Current last saved time',NOTES_DATA[ACTIVE_NOTE].lastSaved )
    const savedTime = new Date(NOTES_DATA[ACTIVE_NOTE].lastSaved.seconds)
    saveIndicator.innerHTML = `Last Saved: ${savedTime.toDateString()}`

}

function saveCurrentNote() {
    //get content of note Area
    const noteState = notesArea.innerText;
    console.log('saving current note', NOTES_DATA[ACTIVE_NOTE])
    // update the object
    NOTES_DATA[ACTIVE_NOTE].note = noteState
    NOTES_DATA[ACTIVE_NOTE].lastSaved = new Date().toISOString()
    // Notify the background script to send to Firebase
    port.postMessage({write: NOTES_DATA})
}

function newNote() {
    // Get basic info
    let videoID = ''
    let videoTitle = 'new note';

    // Populate video data if we're on YT
    if (isYouTube) {
        const pageData = parseQuery(window.location.search);
        videoTitle = document.querySelector('.title').innerText;
        videoID = pageData.v;
    }

    // Write initial state to DB
    NOTES_DATA.push({
        videoID,
        videoTitle: 'test',
        lastSaved: new Date().toISOString(),
        note: '',
    })

    console.log('Generate New Note', NOTES_DATA)
    port.postMessage({write: NOTES_DATA})
    
    ACTIVE_NOTE = NOTES_DATA.length + 1 // cheeky way of getting the new idem ID
    // setCurrentNoteView(ACTIVE_NOTE)
}

// TODO: split files

// UTILS

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function parseQuery(search) {
    let args = search.substring(1).split('&');
    let argsParsed = {};
    let i, arg, kvp, key, value;
    for (i=0; i < args.length; i++) {
        arg = args[i];

        if (-1 === arg.indexOf('=')) {
            argsParsed[decodeURIComponent(arg).trim()] = true;
        }
        else {
            kvp = arg.split('=');
            key = decodeURIComponent(kvp[0]).trim();
            value = decodeURIComponent(kvp[1]).trim();
            argsParsed[key] = value;
        }
    }

    return argsParsed;
}