# YouTube Notes Chrome extention [Alpha]
Note taking app for writing and saving notes while watching videos on YouTube.com.

Quickly saves timestamps when writing notes and creates quick share links to moments and video (note) titles.

Feature Roadmap:
- Markdown support
- Exporting to cloud services, e.g., Dropbox
- Export ALL notes
- Copy/paste

Development Roadmap
- clean up code
- add webpack config, with Sass and modular src JS.

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