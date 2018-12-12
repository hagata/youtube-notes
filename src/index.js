import firebase from '@firebase/app';
import '@firebase/firestore';
require('firebase/auth');

let CURRENT_USER = null;

// Communication with Popup
// LONG LIVED CONNECTION
chrome.extension.onConnect.addListener(function(port) {
  console.log('YT Notes Connected.');
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      // If there is no user signed in, prompt to login.
      port.postMessage('noUser');
    } else {
      CURRENT_USER = firebase.auth().currentUser;
      port.postMessage('UserLoggedIn');
    }
  });

  port.onMessage.addListener(function(msg) {
    if (msg === 'login') {
      initPopup().then((results) => {
        port.postMessage('UserLoggedIn');
      });
    }
    if (msg.write) {
      writeNotes(msg.write).then((msg) => {
        if (msg == 'saved') {
          port.postMessage('saved');
        }
      })
          .catch((err) => {
            console.log('WRITE: err from top level promise');
          });
      return;
    }

    if (msg === 'signout') {
      signOutCurrentUser().then(() => {
        port.postMessage('signedOut');
      }).catch((error) => {
        console.log('Sign Out Error:', error);
      });
      return;
    }

    if (msg === 'getNotes') {
      getNotes(port).then((payload) => {
        port.postMessage({
          notesData: payload,
          userName: CURRENT_USER.displayName,
          userPhoto: CURRENT_USER.photoURL,
        });
      }).catch((err) => {
        port.postMessage('offline');
        // TODO: better offline handling.
      });
    }
  });
});

firebase.initializeApp({
  apiKey: 'AIzaSyBBEti7HBk3UO7mC5V5hxUHD-7OA1yasAA',
  authDomain: 'yt-notes-82fc5.firebaseapp.com',
  databaseURL: 'https://yt-notes-82fc5.firebaseio.com',
  projectId: 'yt-notes-82fc5',
  storageBucket: 'yt-notes-82fc5.appspot.com',
  messagingSenderId: '338971969016',
});
// Initialize Cloud Firestore through Firebase
const db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true,
});

/**
 *Makes the query to Firebase to get the notes for the current user
 * @return {Promise} resolved with Firebase Data
 *
 */
function getNotes() {
  console.log('GET NOTES');
  return new Promise((resolve, reject) => {
    const userID = CURRENT_USER.uid;
    const docRef = db.collection('user-notes').doc(userID);

    docRef.get().then((query) => {
      if (query.exists) {
        const notesData = query.data();
        resolve(notesData);
      } else {
        // If the user doesn't have data yet, create an empty notes object
        writeNotes({});
      }
    })
        .catch((error) => {
          console.log('CATch ERRRRRRRR');
          reject('ERROR', error);
        });
  });
}

/**
 *Writes notes to Firebase
 * @param {Object} writeData Object to write to Firebase.
 * @return {Promise} Resolves when Firebase write callback is recieved.
 */
function writeNotes(writeData) {
  return new Promise((resolve, reject) => {
    const userID = CURRENT_USER.uid;
    const docRef = db.collection('user-notes').doc(userID);

    docRef.set({notes: writeData})
        .then(function() {
          console.log('Document successfully written!');
          resolve('saved');
        })
        .catch(function(error) {
          console.error('Error writing document: ', error);
          reject('Error writing document: ', error);
        });
  });
}

/**
 * Signs in using the popup window to sign in with Google.
 * TODO:// Keep the popup open after signin and load the data.
 * @return {Promise} Sign in attempt results
 */
function initPopup() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return new Promise((resolve, reject) => {
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token.
      // You can use it to access the Google API.
      resolve('Signed-In', result);
      // The signed-in user info.
    }).catch(function(error) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      const credential = error.credential;

      console.warn('Caught errors', {
        errorCode,
        errorMessage,
        email,
        credential,
      });
    });
  });
}

/**
 * Signs out the current user
 * @return {Promise} returns a prmise when complete.
 */
function signOutCurrentUser() {
  return new Promise((resolve, reject) => {
    firebase.auth().signOut().then(() => {
      // Sign-out successful.
      resolve();
    }).catch(function(error) {
      // An error happened.
      reject(error);
    });
  });
}
