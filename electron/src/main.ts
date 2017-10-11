import * as path from 'path';
import * as fs from 'fs';

import { IPC } from './ipc';
import { About } from './about';

import * as minimist from 'minimist';
import * as raygun from 'raygun';

// Config
const argv = minimist(process.argv.slice(1));
import { Config } from './js/config';

// Configuration persistence
import * as settings from './js/lib/settings';

// Wrapper modules
const certutils = require('./js/certutils');
const locale = require('./locale/locale');
const systemMenu = require('./js/menu/system');
const developerMenu = require('./js/menu/developer');
const tray = require('./js/menu/tray');
const util = require('./js/util');
const windowManager = require('./js/window-manager');

export default class Main {
  private static APP_PATH: string;
  private static USER_DATAS_PATH: string;
  private static PRELOAD_JS: string;
  private static WRAPPER_CSS: string;
  private static CERT_ERR_HTML: string;

  private static readonly ICON = `wire.${((process.platform === 'win32') ? 'ico' : 'png')}`;
  private static ICON_PATH: string;

  private static readonly BASE_URL = ((): string => {
    if (!argv.env && Config.DEVELOPMENT) {
      switch (settings.restore('env', Config.INTERNAL)) {
        case Config.DEV: return Config.DEV_URL;
        case Config.EDGE: return Config.EDGE_URL;
        case Config.INTERNAL: return Config.INTERNAL_URL;
        case Config.LOCALHOST: return Config.LOCALHOST_URL;
        case Config.STAGING: return Config.STAGING_URL;
      }
    }

    return argv.env || Config.PROD_URL;
  })();

  private static mainWindow: Electron.BrowserWindow;
  private static application: Electron.App;
  private static shell: Electron.Shell;
  private static BrowserWindow;
  private static Menu;

  private static quitting: boolean = false;
  private static shouldQuit: boolean = false;
  private static webappVersion: string;

  private static onWindowAllClosed(): void {
      if (process.platform !== 'darwin') {
        this.application.quit();
      }
  }

  private static onDomReady(): void {
    fs.readFile(this.WRAPPER_CSS, 'utf8', (error, data) => {
      if (error) {
        throw error;
      }
      this.mainWindow.webContents.insertCSS(data);
    });
  }

  private static onCrash(): void {
    this.mainWindow.reload();
  }

  private static whenClosed(): void {
    // experimental
    this.mainWindow = null;
  }

  private static onActivate(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
    }
  }

  private static onBeforeQuit(): void {
    this.quitting = true;
  }

  private static onFocus(): void {
    this.mainWindow.flashFrame(false);
  }

  private static onPageTitleUpdated(): void {
    tray.updateBadgeIcon(this.mainWindow);
  }

  private static onNewWindow(event, _url): void {
    event.preventDefault();

    // Ensure the link does not come from a webview
    if (typeof event.sender.viewInstanceId !== 'undefined') {
      console.log('Attempt to create a new window from a webview blocked.');
      return;
    }

    this.shell.openExternal(_url);
  }

  private static async onClose(event): Promise<void> {
    const isFullScreen = this.mainWindow.isFullScreen();
    settings.save('fullscreen', isFullScreen);
    if (!isFullScreen) {
      settings.save('bounds', this.mainWindow.getBounds());
    }

    if (!Main.quitting) {
      event.preventDefault();
      console.log('Closing window...');

      if (isFullScreen) {
        this.mainWindow.once('leave-full-screen', this.mainWindow.hide);
        this.mainWindow.setFullScreen(false);
      } else {
        this.mainWindow.hide();
      }
      return;
    }

    console.log('Persisting user configuration file...');
    await settings._saveToFile();
  }

  private static restoreFullscreenSettings(): void {
    if (settings.restore('fullscreen', false)) {
      Main.mainWindow.setFullScreen(true);
    } else {
      Main.mainWindow.setBounds(settings.restore('bounds', Main.mainWindow.getBounds()));
    }
  }

  private static showMainWindow(): void {

    this.mainWindow = new Main.BrowserWindow({
      title: Config.NAME,
      titleBarStyle: 'hidden-inset',
      width: Config.DEFAULT_WIDTH_MAIN,
      height: Config.DEFAULT_HEIGHT_MAIN,
      minWidth: Config.MIN_WIDTH_MAIN,
      minHeight: Config.MIN_HEIGHT_MAIN,
      autoHideMenuBar: !settings.restore('showMenu', true),
      icon: Main.ICON_PATH,
      show: false,
      webPreferences: {
        backgroundThrottling: false,
        nodeIntegration: false,
        preload: this.PRELOAD_JS,

        // Enable <webview>
        webviewTag: true,
      },
    });

    const envUrl = encodeURIComponent(`${this.BASE_URL}${(this.BASE_URL.includes('?') ? '&' : '?')}hl=${locale.getCurrent()}`);
    this.mainWindow.loadURL(`file://${path.join(this.APP_PATH, 'renderer', 'index.html')}?env=${envUrl}`);

    if (argv.devtools) {
      this.showDevTools();
    }

    this.mainWindow.on('focus', this.onFocus);
    this.mainWindow.on('page-title-updated', this.onPageTitleUpdated);

    // Prevent any kind of navigation inside the main window
    this.mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

    // Handle the new window event in the main Browser Window
    this.mainWindow.webContents.on('new-window', (event, _url) => this.onNewWindow(event, _url));

    this.mainWindow.webContents.on('dom-ready', this.onDomReady);
    this.mainWindow.webContents.on('crashed', this.onCrash);

    this.restoreFullscreenSettings();

    if (!argv.startup && !argv.hidden) {
      if (!util.isInView(this.mainWindow)) {
        this.mainWindow.center();
      }

      // Disclose Window ID
      windowManager.setPrimaryWindowId(this.mainWindow.id);

      // Show the window
      setTimeout(() => {
        this.mainWindow.show();
      }, 800);
    }
  }

  private static showDevTools(): void {
    this.mainWindow.webContents.openDevTools();
  }

  private static createMenus(): void {
    const appMenu = systemMenu.createMenu();

    if (Config.DEVELOPMENT) {
      appMenu.append(developerMenu);
    }
    appMenu.on('about-wire', () => {
      About.showAboutWindow(this.webappVersion);
    });

    this.Menu.setApplicationMenu(appMenu);
  }

  private static onReady() {
    this.createMenus();
    tray.createTrayIcon();

    this.showMainWindow();

    this.mainWindow.on('closed', this.whenClosed);
    this.mainWindow.on('close', this.onClose);
  }

  static run(
    app: Electron.App,
    browserWindow: typeof BrowserWindow,
    ipcMain: Electron.IpcMain,
    Menu,
    shell: Electron.Shell
  ) {
    this.application = app;
    Main.BrowserWindow = About.BrowserWindow = browserWindow;
    IPC.ipcMain = ipcMain;
    this.Menu = Menu;
    this.shell = shell;

    // Set paths to resources
    this.APP_PATH = this.application.getAppPath();
    this.USER_DATAS_PATH = this.application.getPath('userData');
    this.PRELOAD_JS = path.join(this.APP_PATH, 'js', 'preload.js');
    this.WRAPPER_CSS = path.join(this.APP_PATH, 'css', 'wrapper.css');
    this.CERT_ERR_HTML = `file://${path.join(this.APP_PATH, 'html', 'certificate-error.html')}`;
    this.ICON_PATH = path.join(this.APP_PATH, 'img', this.ICON);
    About.ABOUT_HTML = `file://${path.join(this.APP_PATH, 'html', 'about.html')}`;

    console.log('Init');

    this.application.on('ready', this.onReady);
    this.application.on('activate', this.onActivate);
    this.application.on('before-quit', this.onBeforeQuit);
    this.application.on('window-all-closed', this.onWindowAllClosed);
  }
};

