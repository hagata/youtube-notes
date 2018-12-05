
const notesArea = document.querySelector('.note-area');

var port = chrome.extension.connect({
    name: "YT-Notes"
});
document.addEventListener('DOMContentLoaded', () => {
    console.log('loaded...')
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
});


// TODO: define globals somewhere scoped better…maybe.
let ACTIVE_NOTE = 0;
let NOTES_DATA;


/**
 * add Items for each note in the sidebar
 * @param {Object} notes array of notes from background.js/Firebase
 */
function loadNotes(notes) {
    NOTES_DATA = notes
    console.log('NOTES_DATA', NOTES_DATA)
    populateSidebar();
    setCurrentNoteView(ACTIVE_NOTE);
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
        noteItem.dataset.nodeId = `${index}`;
        notesList.appendChild(noteItem);
    });

}

/**
 * binds event listen es to each of the note items in the sidebar
 *
 */
function bindEvents() {
    const notes = document.querySelectorAll('.notes-sidebar__note')
    notes.forEach(note, () => {
        note.addEventListener('click', (e) => {
            ACTIVE_NOTE = e.dataset.noteId
            setCurrentNoteView();
        })
    })
}

/**
 *Set's the note data from the active note to the note view pane
 * @param {string} ACTIVE_NOTE, numberical ID from the NOTES_DATA array
 */
function setCurrentNoteView(ACTIVE_NOTE) {
    notesArea.innerHTML = NOTES_DATA[ACTIVE_NOTE].note;
}


