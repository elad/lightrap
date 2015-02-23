# Lightrap

Lightrap is an experimental Node.js bug and issue tracker. It has an API-first design (exposes a RESTful interface) and plugins inspired by [Haraka](https://haraka.github.io/).

Example plugins:

  * [GNATS](http://www.gnu.org/software/gnats/) handling for incoming PRs
  * Mention support with cross-project notifications

# Status

This project is at a **very** early stage, is not yet anywhere near functional, and development is progressing slowly because I don't (yet) have a need for it other than experimenting with the concepts. If you are interested in contributing, let me know by opening an issue.

# Setup

Install MongoDB and then

```
git clone https://github.com/elad/lightrap
cd lightrap
npm install
./lightrap
```

# License

ISC.

# TODO

* Use [c9/architect](https://github.com/c9/architect) instead of rolling our own plugin framework
* Use [balderdashy/waterline](https://github.com/balderdashy/waterline) instead of node-orm2
