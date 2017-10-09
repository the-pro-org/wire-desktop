import {app, BrowserWindow, ipcMain, Menu, shell} from 'electron';
import Main from './Main';

Main.start(app, BrowserWindow);
