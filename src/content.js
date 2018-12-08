console.log('CONTENT SCRIPT LOADED');

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                'from a content script:' + sender.tab.url :
                'from the extension');
      if (request.method == 'getYTData') {
        getYTData().then((payload) => {
          console.log('Promise returned', payload);
          sendResponse({data: payload});
        });
      }

      if (request.method == 'currentTime') {
        getVideoTimeInSeconds().then((payload) => {
          sendResponse({data: payload});
        });
      }

      // Return True to indicate an async request and keep messaging open.
      return true;
    });


/**
 * Get's page data from the YouTube page DOM
 * @return {Promise} returns data
 *
 */
function getYTData() {
  return new Promise((resolve, reject) => {
    const videoTitle = document.querySelector('.title').innerText;
    const pageData = parseQuery(window.location.search);
    const videoID = pageData.v;
    resolve({
      videoTitle,
      videoID,
    });
  });
}

/**
 * Get's current video time when method is called
 * @return {Promise} returns video time in seconds
 *
 */
function getVideoTimeInSeconds() {
  return new Promise((resolve, reject) => {
    const video = document.querySelector('video');
    if (video) {
      // TODO: Refactor how we're passing the VideoID here,
      const pageData = parseQuery(window.location.search);
      const videoID = pageData.v;

      const time = video.currentTime;
      console.log('TIMESTAMP', {time, format: formatTimeString(time), videoID});
      resolve({
        videoID,
        seconds: time,
        timestamp: formatTimeString(time),
      });
    }
  });
}

// UTILS

/**
 * Parses a query string to pull out values
 * @param {String} search Urls query string
 * @return {Object} parsed args in a nice and neat object.
 */
function parseQuery(search) {
  const args = search.substring(1).split('&');
  const argsParsed = {};
  let i; let arg; let kvp; let key; let value;
  for (i=0; i < args.length; i++) {
    arg = args[i];

    if (-1 === arg.indexOf('=')) {
      argsParsed[decodeURIComponent(arg).trim()] = true;
    } else {
      kvp = arg.split('=');
      key = decodeURIComponent(kvp[0]).trim();
      value = decodeURIComponent(kvp[1]).trim();
      argsParsed[key] = value;
    }
  }

  return argsParsed;
}

/**
 * Returns time in HH:MM:SS. Omits Hours if 0.
 * @param {String} time in hh:mm:ss format
 * @return {String} String from time as HH:MM:SS
 */
function formatTimeString(time) {
  const secNum = parseInt(time, 10); // don't forget the second param
  let hours = Math.floor(secNum / 3600);
  const minutes = Math.floor((secNum - (hours * 3600)) / 60);
  let seconds = secNum - (hours * 3600) - (minutes * 60);

  if (hours <= 0) {
    hours = '0';
  } else if (hours < 10) {
    hours = '0'+hours;
  }
  // if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {
    seconds = '0'+seconds;
  }
  console.log('parsing hours', hours);

  return `${hours > 0 ? hours + ':': ''}${minutes}:${seconds}`;
}
