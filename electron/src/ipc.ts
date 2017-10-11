const download = require('./js/lib/download');
const googleAuth = require('./js/lib/googleAuth');
const rimraf = require('rimraf');

export class IPC {

  public static ipcMain: Electron.IpcMain;

  public static registerEvents() {

    this.ipcMain.once('webapp-version', (event, version) => {
      webappVersion = version;
    });

    this.ipcMain.on('save-picture', (event, fileName, bytes) => {
      download(fileName, bytes);
    });

    this.ipcMain.on('notification-click', () => {
      windowManager.showPrimaryWindow();
    });

    this.ipcMain.on('badge-count', (event, count) => {
      tray.updateBadgeIcon(main, count);
    });

    this.ipcMain.on('google-auth-request', event => {
      googleAuth.getAccessToken(config.GOOGLE_SCOPES, config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET)
        .then(code => {
          event.sender.send('google-auth-success', code.access_token);
        })
        .catch(error => {
          event.sender.send('google-auth-error', error);
        });
    });

    this.ipcMain.on('delete-account-data', (e, accountID, sessionID) => {

      // delete webview partition
      try {
        if (sessionID) {
          const partitionDir = path.join(app.getPath('userData'), 'Partitions', sessionID);
          rimraf.sync(partitionDir);
          debugMain(`Deleted partition for account: ${sessionID}`);
        } else {
          debugMain(`Skipping partition deletion for account: ${accountID}`);
        }
      } catch (error) {
        debugMain(`Failed to partition for account: ${sessionID}`);
      }

      // delete logs
      try {
        const logDir = path.join(app.getPath('userData'), 'logs', accountID);
        rimraf.sync(logDir);
        debugMain(`Deleted logs folder for account: ${accountID}`);
      } catch (error) {
        debugMain(`Failed to delete logs folder for account: ${accountID} with error: ${error.message}`);
      }
    });

    this.ipcMain.on('wrapper-reload', () => {
      app.relaunch();
      // Using exit instead of quit for the time being
      // see: https://github.com/electron/electron/issues/8862#issuecomment-294303518
      app.exit();
    });
  }
};
