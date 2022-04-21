import { RendererCommunicator, CommunicatorEventParameters, CommunicatorRPCFunction, CommunicatorType } from "@rrox/api";
import { EventEmitter2 } from "eventemitter2";
import io, { Socket } from "socket.io-client";

export class SocketCommunicator implements RendererCommunicator {
    private socket?: Socket;
    private broadcaster = new EventEmitter2();

    public connect( key: string ) {
        this.socket = io( 'localhost:3001', {
            transports: [ 'websocket' ]
        } );

        this.socket.on( 'broadcast', ( channel: string, args: any[] ) => {
            this.broadcaster.emit( channel, ...args );
        } );

        this.socket.emit( 'join', key, ( success: Boolean ) => {
            if( !success )
                throw new Error( 'Failed to join' );

            this.broadcaster.emit( 'available' );
        } );
    }

    private communicatorToChannel( communicator: CommunicatorType<( ...p: any[] ) => void,( ...p: any[] ) => any> ) {
        return `c/${communicator.module.name}/${communicator.key}`;
    }

    listen<C extends CommunicatorType<( ...p: any[] ) => void, any>>(
        communicator: C, listener: ( ...args: CommunicatorEventParameters<C> ) => void
    ): () => void {
        const channel = this.communicatorToChannel( communicator );

        this.broadcaster.addListener( channel, listener );

        return () => this.broadcaster.removeListener( channel, listener );
    }

    emit<C extends CommunicatorType<( ...p: any[] ) => void, any>>(
        communicator: C, ...args: CommunicatorEventParameters<C>
    ): void {
        const channel = this.communicatorToChannel( communicator );
        if( !this.socket )
            throw new SocketCommunicatorError( `Socket is not available while emitting to '${channel}'` );

        this.socket.emit( 'rpc', channel, args );
    }

    rpc<C extends CommunicatorType<any, ( ...p: any[] ) => any>>(
        communicator: C, ...args: Parameters<CommunicatorRPCFunction<C>>
    ): ReturnType<CommunicatorRPCFunction<C>> {
        return new Promise( ( resolve, reject ) => {
            const channel = this.communicatorToChannel( communicator );
            if( !this.socket )
                return reject( new SocketCommunicatorError( `Socket is not available while calling rpc '${channel}'` ) );

            this.socket.emit( 'rpc', channel, args, ( res: any ) => resolve( res ) );
        } );
    }

    isAvailable(): boolean {
        return this.socket != null;
    }

    whenAvailable( callback: () => void ): () => void {
        if( this.isAvailable() ) {
            callback();

            return () => null;
        }

        this.broadcaster.once( 'available', callback );

        return () => this.broadcaster.removeListener( 'available', callback );
    }
}

export class SocketCommunicatorError extends Error {
    constructor( message: string ) {
        super( message );

        this.name = 'SocketCommunicatorError';
    }
}