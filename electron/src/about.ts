import { Config } from './js/config';

export class About {

  public static BrowserWindow;
  private static aboutWindow: Electron.BrowserWindow;
  public static ABOUT_HTML: string;
  private static webappVersion: string;

  public static showAboutWindow(webappVersion: string): void {
    if (this.aboutWindow === undefined) {
      this.webappVersion = webappVersion;
      this.aboutWindow = new About.BrowserWindow({
        title: Config.NAME,
        width: 304,
        height: 256,
        resizable: false,
        fullscreen: false,
      });
      this.aboutWindow.setMenuBarVisibility(false);
      this.aboutWindow.loadURL(this.ABOUT_HTML);

      this.aboutWindow.webContents.on('dom-ready', this.onDomReady);
      this.aboutWindow.on('closed', this.whenClosed);
    }

    this.aboutWindow.show();
  }

  private static onDomReady(): void {
    this.aboutWindow.webContents.send('about-loaded', { webappVersion: this.webappVersion });
  }

  private static whenClosed(): void {
    this.aboutWindow = null;
  }
};
