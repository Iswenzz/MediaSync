import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";
import { StateService } from "@/services/state.service";

@WebSocketGateway({
	cors: { origin: [process.env.HOST || "*"] }
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor(private stateService: StateService) {}

	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
		client.emit("video", this.stateService.getCurrentState());
	}

	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	broadcast(event: string, data: any) {
		this.server.emit(event, data);
	}
}
