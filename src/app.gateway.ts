import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";

@WebSocketGateway({
	cors: { origin: [process.env.HOST || "*"] }
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	broadcast(event: string, data: any) {
		this.server.emit(event, data);
	}
}
