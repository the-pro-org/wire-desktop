/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

// Modules
const {app, BrowserWindow, ipcMain, Menu, shell} = require('electron');
const fs = require('fs-extra');
const minimist = require('minimist');
const path = require('path');
const raygun = require('raygun');

// Paths
const APP_PATH = app.getAppPath();
/*eslint-disable no-unused-vars*/
const USER_DATAS_PATH = app.getPath('userData');
/*eslint-enable no-unused-vars*/

// Configuration persistence
const settings = require('./js/lib/settings');

// Wrapper modules
const certutils = require('./js/certutils');
const locale = require('./locale/locale');
const systemMenu = require('./js/menu/system');
const developerMenu = require('./js/menu/developer');
const tray = require('./js/menu/tray');
const util = require('./js/util');
const windowManager = require('./js/window-manager');

// Config
const argv = minimist(process.argv.slice(1));
const config = require('./js/config');

let main;
let raygunClient;
let about;
let quitting = false;
let shouldQuit = false;
let webappVersion;

///////////////////////////////////////////////////////////////////////////////
// Misc
///////////////////////////////////////////////////////////////////////////////
if (argv.portable) {
  const EXEC_PATH = process.env.APPIMAGE || process.execPath;
  const USER_PATH = path.join(EXEC_PATH, '..', 'Data');
  app.setPath('userData', USER_PATH);
}

///////////////////////////////////////////////////////////////////////////////
// Single Instance stuff
///////////////////////////////////////////////////////////////////////////////

// makeSingleInstance will crash the signed mas app
// see: https://github.com/atom/electron/issues/4688
if (process.platform !== 'darwin') {
  shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
    if (main) {
      windowManager.showPrimaryWindow();
    }
    return true;
  });
  if (process.platform !== 'win32' && shouldQuit) {
    // Using exit instead of quit for the time being
    // see: https://github.com/electron/electron/issues/8862#issuecomment-294303518
    app.exit();
  }
}

///////////////////////////////////////////////////////////////////////////////
// Fix indicator icon on Unity
// Source: https://bugs.launchpad.net/ubuntu/+bug/1559249
///////////////////////////////////////////////////////////////////////////////
if (process.platform === 'linux') {
  const isUbuntuUnity = process.env.XDG_CURRENT_DESKTOP && process.env.XDG_CURRENT_DESKTOP.includes('Unity');

  if (isUbuntuUnity) {
    process.env.XDG_CURRENT_DESKTOP = 'Unity';
  }
}

///////////////////////////////////////////////////////////////////////////////
// Delete the console.log
///////////////////////////////////////////////////////////////////////////////
const logDir = path.join(app.getPath('userData'), 'logs');
fs.readdir(logDir, (error, files) => {
  if (error) {
    console.log(`Failed to read log directory with error: ${error.message}`);
    return;
  }

  // TODO filter out dotfiles
  for (const file of files) {
    const consoleLog = path.join(logDir, file, config.CONSOLE_LOG);
    fs.rename(consoleLog, consoleLog.replace('.log', '.old'), (renameError) => {
      if (renameError) {
        console.log(`Failed to rename log file (${consoleLog}) with error: ${renameError.message}`);
      }
    });
  }

});

class ElectronWrapperInit {

  constructor() {
    this.debug = debug('ElectronWrapperInit');
  }

  async run() {
    this.debug('webviewProtection init');
    this.webviewProtection();
  }

  // <webview> hardening
  webviewProtection() {
    const webviewProtectionDebug = debug('ElectronWrapperInit:webviewProtection');

    const openLinkInNewWindow = (event, _url) => {
      // Prevent default behavior
      event.preventDefault();

      webviewProtectionDebug('Opening an external window from a webview. URL: %s', _url);
      shell.openExternal(_url);
    };
    const willNavigateInWebview = (event, _url) => {
      // Ensure navigation is to a whitelisted domain
      if (util.isMatchingHost(_url, BASE_URL)) {
        webviewProtectionDebug('Navigating inside webview. URL: %s', _url);
      } else {
        webviewProtectionDebug('Preventing navigation inside webview. URL: %s', _url);
        event.preventDefault();
      }
    };

    app.on('web-contents-created', (event, contents) => {

      switch(contents.getType()) {
        case 'window':
          contents.on('will-attach-webview', (e, webPreferences, params) => {
            const _url = params.src;

            // Use secure defaults
            webPreferences.nodeIntegration = false;
            webPreferences.webSecurity = true;
            params.contextIsolation = true;
            webPreferences.allowRunningInsecureContent = false;
            params.plugins = false;
            params.autosize = false;

            // Verify the URL being loaded
            if (!util.isMatchingHost(_url, BASE_URL)) {
              e.preventDefault();
              webviewProtectionDebug('Prevented to show an unauthorized <webview>. URL: %s', _url);
            }
          });
        break;

        case 'webview':
          // Open webview links outside of the app
          contents.on('new-window', (e, _url) => { openLinkInNewWindow(e, _url); });
          contents.on('will-navigate', (e, _url) => { willNavigateInWebview(e, _url); });

          contents.session.setCertificateVerifyProc((request, cb) => {
            const {hostname = '', certificate = {}, error} = request;

            if (typeof error !== 'undefined') {
              console.error('setCertificateVerifyProc', error);
              main.loadURL(CERT_ERR_HTML);
              return cb(-2);
            }

            if (certutils.hostnameShouldBePinned(hostname)) {
              const pinningResults = certutils.verifyPinning(hostname, certificate);
              for (const result of Object.values(pinningResults)) {
                if (result === false) {
                  console.error(`Certutils verification failed for ${hostname}: ${result} is false`);
                  main.loadURL(CERT_ERR_HTML);
                  return cb(-2);
                }
              }
            }

            return cb(-3);
          });
        break;
      }
    });
  }
};

class BrowserWindowInit {

  constructor() {

    this.debug = debug('BrowserWindowInit');
    this.quitting = false;
    this.accessToken = false;

    // Start the browser window
    this.browserWindow = new BrowserWindow({
      title: config.NAME,
      titleBarStyle: 'hidden-inset',

      width: config.DEFAULT_WIDTH_MAIN,
      height: config.DEFAULT_HEIGHT_MAIN,
      minWidth: config.MIN_WIDTH_MAIN,
      minHeight: config.MIN_HEIGHT_MAIN,

      autoHideMenuBar: !settings.restore('showMenu', true),
      icon: ICON_PATH,
      show: false,
      backgroundColor: '#fff',

      webPreferences: {
        backgroundThrottling: false,
        nodeIntegration: false,
        preload: PRELOAD_JS,
        webviewTag: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        webgl: false,
      },
    });

    // Show the renderer
    const envUrl = encodeURIComponent(`${BASE_URL}${(BASE_URL.includes('?') ? '&' : '?')}hl=${locale.getCurrent()}`);
    main.loadURL(`file://${path.join(APP_PATH, 'renderer', 'index.html')}?env=${envUrl}`);

    // Restore previous window size
    if (settings.restore('fullscreen', false)) {
      this.browserWindow.setFullScreen(true);
    } else {
      this.browserWindow.setBounds(settings.restore('bounds', this.browserWindow.getBounds()));
    }
  }
};

(new ElectronWrapperInit()).run();
