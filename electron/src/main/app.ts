import { app, autoUpdater, dialog } from 'electron';
import Updater from 'update-electron-app';
import Logger from 'electron-log';
import { createAppWindow, createOverlayWindow, WindowType } from './windows';
import { RROx } from './rrox';
import { ChangeSwitchAction, EnsureInGameAction, InjectDLLAction, ReadAddressAction, ReadAddressValueAction, ReadWorldAction, SaveAction, SetEngineControlsAction, StopAction } from './actions';
import { AttachTask, AutosaveTask, LoggerTask, OverlayTask, ReadWorldTask } from './tasks';
import { AutosaveIPCListener, ChangeSwitchIPCListener, GetAttachedStateIPCHandler, KillDanglingInjector, MapDataIPCHandler, SetAttachedStateIPCListener, SetEngineControlsIPCListener, UpdateConfigIPCListener } from './ipc';

/** Handle creating/removing shortcuts on Windows when installing/uninstalling. */
if ( require( 'electron-squirrel-startup' ) ) {
    app.quit();
}

Updater( {
    logger    : Logger,
    notifyUser: false, // We manually notify the user with a custom message
} );

autoUpdater.on( 'update-downloaded', ( event, releaseNotes, releaseName, releaseDate, updateURL ) => {
    Logger.log( 'update-downloaded', [ event, releaseNotes, releaseName, releaseDate, updateURL ] )

    const dialogOpts = {
        type: 'info',
        buttons: [ 'Restart', 'Later' ],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version is available. Before updating, please shut down the game, if it is running.'
    }

    dialog.showMessageBox( dialogOpts ).then( ( { response } ) => {
        if ( response === 0 ) autoUpdater.quitAndInstall()
    } )
} );

app.on( 'ready', async () => {
    let rrox = new RROx();

    rrox.addWindow( WindowType.App    , createAppWindow    () );
    rrox.addWindow( WindowType.Overlay, createOverlayWindow() );

    // Initialize all actions
    const actions = [
        ChangeSwitchAction,
        EnsureInGameAction,
        InjectDLLAction,
        ReadAddressAction,
        ReadAddressValueAction,
        ReadWorldAction,
        SaveAction,
        SetEngineControlsAction,
        StopAction
    ];
    rrox.createActions( actions );

    // Initialize all tasks and autostart all (except for attach)
    const tasks = [
        AttachTask,
        AutosaveTask,
        ReadWorldTask,
        LoggerTask,
        OverlayTask
    ];
    rrox.createTasks( tasks );
    await rrox.startTasks( tasks.filter( ( t ) => t !== AttachTask ) );

    // Initialize and start all IPC tasks
    const ipc = [
        AutosaveIPCListener,
        ChangeSwitchIPCListener,
        GetAttachedStateIPCHandler,
        KillDanglingInjector,
        MapDataIPCHandler,
        SetAttachedStateIPCListener,
        SetEngineControlsIPCListener,
        UpdateConfigIPCListener
    ];
    rrox.createTasks( ipc );
    await rrox.startTasks( ipc );

    rrox.start();
} );

app.on( 'window-all-closed', () => {
    app.quit();
} );