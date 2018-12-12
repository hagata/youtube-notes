# YouTube Notes Chrome extention [Beta]
![yt-notes-screenshot-sm](https://user-images.githubusercontent.com/2608893/49850255-aaa7a980-fd91-11e8-8634-71dbe9e51781.png)


Note taking app for writing and saving notes while watching videos on YouTube.com.

Quickly saves timestamps when writing notes and creates quick share links to moments and video (note) titles.

Feature and development Roadmap: [https://github.com/hagata/youtube-notes/wiki](https://github.com/hagata/youtube-notes/wiki)

# Getting started
To get started contributing, or loading the extension for fun, Chrome must be set to developer mode for extensions.
To do this, go go [chrom://extensions](chrom://extensions) within Chrome, and toggle Developer Mode to On.

## Building
If you do not already have the prerequisites installed, install Node and Npm.
Then, clone this repo. Install dependencies with:
```
npm install
```

This project (currently) runs Webpack _without_ a configuration file.
To build, use
```
npx webpack
```

You can watch for changes by using the `--watch` flag.
```
npx webpack --watch
```


## Installing the unpacked extension
Once the build is complete, in the chrome extensions page, use the Load Unpacked Extension option to choose the root directory of this repository.
Chrome will load the extension, and it would be ready to go 🙌

# Contributing
We would love your support and help 🙌
