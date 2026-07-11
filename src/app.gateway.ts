import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect
} from "@nestjs/websockets";

import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

import { RoomService } from "@/services/room.service";

@WebSocketGateway({
	cors: { origin: [process.env.HOST || "*"] }
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(AppGateway.name);

	@WebSocketServer()
	server: Server;

	constructor(private rooms: RoomService) {}

	handleConnection(client: Socket) {
		const roomId = this.getRoomId(client);
		const room = roomId ? this.rooms.get(roomId) : null;
		if (!roomId || !room) {
			client.emit("invalid-room");
			return;
		}
		client.join(roomId);
		this.logger.log(`Client ${client.id} joined room ${roomId}`);
		client.emit("video", this.rooms.getCurrentState(room));
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	emitToRoom(roomId: string, event: string, data: any) {
		this.server.to(roomId).emit(event, data);
	}

	private getRoomId(client: Socket) {
		const room = client.handshake.query.room;
		if (Array.isArray(room)) return room[0] ?? null;
		return room ?? null;
	}
}
