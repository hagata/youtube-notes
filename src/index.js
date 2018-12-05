import firebase from '@firebase/app';
import '@firebase/firestore';
import { resolve } from 'path';
// import firestore from 'firebase/firestore';

console.log('FIREBASE added', firebase);

// Communication with Popup
// LONG LIVED CONNECTION
chrome.extension.onConnect.addListener(function(port) {
  console.log("Connected .....");
  port.onMessage.addListener(function(msg) {
      console.log("message recieved", msg);
      // on load
      if (msg.write) {
        console.log('Backend write request', msg.write)
        writeNotes(msg.write).then(msg => {
          if (msg == 'saved') {
            port.postMessage('saved')
          }
        })
        .catch(err => {
          console.log('err from top level promise')
        })
        return;
      }

      getNotes(port).then(payload => {
        console.log('RESOLVED PAYLOAD', payload)
        port.postMessage({notesData: payload});
      })
      .catch(err => {
        console.log('err from top level promise')
      })
  });
})

firebase.initializeApp({
  apiKey: "AIzaSyBBEti7HBk3UO7mC5V5hxUHD-7OA1yasAA",
  authDomain: "yt-notes-82fc5.firebaseapp.com",
  databaseURL: "https://yt-notes-82fc5.firebaseio.com",
  projectId: "yt-notes-82fc5",
  storageBucket: "yt-notes-82fc5.appspot.com",
  messagingSenderId: "338971969016"
});

// Initialize Cloud Firestore through Firebase
const db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true,
});

/**
 *Makes the query to Firebase to get the notes for the current user
 * @param {} port The Chrome runtime port
 *
 */
function getNotes() {
  return new Promise((resolve, reject) => {
    const userID = 'user-uuid' // TODO: Use actual user ID
    const docRef = db.collection("user-notes").doc(userID);

      docRef.get().then((query) => {
        console.log('QUERY…', query);
        console.log('QUery docs', query.docs)
        if (query.exists) {
          const notesData = query.data();
          console.log('data', query.data()) // {object} {phrases: []}
          resolve(notesData)
        }
      })
    .catch(error => {
      console.log('CATch ERRRRRRRR')
      reject('ERROR', error)
  })
})
}

/**
 *Writes notes to Firebase
 *
 */
function writeNotes(writeData) {
  return new Promise((resolve, reject) => {
    const userID = 'user-uuid' // TODO: Use actual user ID
    const docRef = db.collection("user-notes").doc(userID)

    docRef.set({notes: writeData})
      .then(function () {
        console.log("Document successfully written!");
        resolve('saved')
      })
      .catch(function (error) {
        console.error("Error writing document: ", error);
        reject("Error writing document: ", error)
      });
  })
}

/**
 * Handles clicks/selections of the contextMenu items.
 * @param {Object} info clicked contextMenu item info object
 */
function selectionClickHandler(info) {
  alert('Flagged to the Unbyas Contributor Queue. Thank you!', info.menuItemId);

  db.collection('contributor-queue').add({
    phrase: info.selectionText,
    meta: {...info},
    reason: 'none WIP',
    reviewed: false, // Flag to track reviewing later.
  }).then((docRef) => {
    console.log('Added Doc', docRef);
  });

  // TODO: add window messaging to communicate with background
  // if WithoutContext, just send it to the database and thank the user
  // if With Context, preent a modal and collect data to send
}

chrome.contextMenus.onClicked.addListener(selectionClickHandler);

// Set up context menu tree at install time.

chrome.runtime.onInstalled.addListener(() => {
  // Contexts in which the Unbyas contrib options should be shown
  const contexts = ['selection', 'link', 'editable'];

  // Parent level menu item will (nearly)always be shown
  chrome.contextMenus.create({
    'title': 'Unbyas',
    'contexts': [...contexts, 'page'],
    'id': 'parent',
  });

  // Flagging options are shown if there is text highlighted from contexts
  chrome.contextMenus.create({
    'title': 'Flag selected phrase',
    'contexts': contexts,
    'parentId': 'parent',
    'id': 'flagWithoutContext',
  });
  // chrome.contextMenus.create({
  //   'title': 'Flag phrase and add context',
  //   'contexts': contexts,
  //   'parentId': 'parent',
  //   'id': 'flagWithContext',
  // });
});
