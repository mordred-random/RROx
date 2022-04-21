import { RendererCommunicator, CommunicatorEventParameters, CommunicatorRPCFunction, CommunicatorType, ValueConsumer } from "@rrox/api";
import { ShareMessagesCommunicator, ShareMode, ShareModeCommunicator, ShareConnectClientCommunicator, ShareConnectHostCommunicator, ShareKeysCommunicator } from "../../../shared/communicators";
import { IPCCommunicator } from "./communicator";

interface IPC {
    invoke: ( channel: string, ...args: any[] ) => Promise<any>,
    send: ( channel: string, ...args: any[] ) => void,
    on: ( channel: string, fn: ( event: Electron.IpcRendererEvent, ...args: any[] ) => void ) => () => void;
}

declare global {
    interface Window {
        ipc: () => IPC | null;
    }
}

export class SharedCommunicator extends IPCCommunicator implements RendererCommunicator {
    private readonly SHARED_COMMUNICATORS: string[] = [
        this.communicatorToChannel( ShareModeCommunicator ),
        this.communicatorToChannel( ShareMessagesCommunicator ),
        this.communicatorToChannel( ShareConnectClientCommunicator ),
        this.communicatorToChannel( ShareConnectHostCommunicator ),
        this.communicatorToChannel( ShareKeysCommunicator ),
    ];

    private shareMode = new ValueConsumer( this, ShareModeCommunicator, ShareMode.NONE );

    listen<C extends CommunicatorType<( ...p: any[] ) => void, any>>(
        communicator: C, listener: ( ...args: CommunicatorEventParameters<C> ) => void
    ): () => void {
        return super.listen( communicator, listener );
    }

    emit<C extends CommunicatorType<( ...p: any[] ) => void, any>>(
        communicator: C, ...args: CommunicatorEventParameters<C>
    ): void {
        const channel = this.communicatorToChannel( communicator );

        if( !this.SHARED_COMMUNICATORS.includes( channel ) && this.shareMode.getValue() === ShareMode.CLIENT )
            super.emit( ShareMessagesCommunicator, channel, ...args );
        else
            super.emit( communicator, ...args );
    }

    rpc<C extends CommunicatorType<any, ( ...p: any[] ) => any>>(
        communicator: C, ...args: Parameters<CommunicatorRPCFunction<C>>
    ): ReturnType<CommunicatorRPCFunction<C>> {
        const channel = this.communicatorToChannel( communicator );
    
        if( !this.SHARED_COMMUNICATORS.includes( channel ) && this.shareMode.getValue() === ShareMode.CLIENT )
            return super.rpc( ShareMessagesCommunicator, channel, ...args );
        else
            return super.rpc( communicator, ...args );
    }
}