# MediaSync

A lightweight NestJS backend for synchronizing media playback across multiple clients in real-time. Built with WebSockets for instant state synchronization with minimal latency. Full support YouTube & YouTube Shorts navigation.

## Building

_Pre-Requisites:_

1. [Node](https://nodejs.org/en/)
2. [Yarn](https://yarnpkg.com/)

_Pre-Requisites:_

    yarn patchright install

## Browser

_Host:_

    apt install xvfb x11vnc x11-apps
    Xvfb :99 -screen 0 1280x720x24 &
    export DISPLAY=:99
    x11vnc -nopw -listen localhost &
    xclock

_Client:_

    ssh -L 5900:localhost:5900 user@server_ip
    login to localhost:5900 with tigervnc

## Contributors

**_Note:_** If you would like to contribute to this repository, feel free to send a pull request, and I will review your code.
Also feel free to post about any problems that may arise in the issues section of the repository.
