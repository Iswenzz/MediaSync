import { Controller, Post, Query } from "@nestjs/common";

import { RoomService } from "@/services/room.service";

@Controller("api/rooms")
export class RoomController {
	constructor(private roomService: RoomService) {}

	@Post()
	create(@Query("id") id: string) {
		if (!id) return { success: false, error: "Missing room id" };
		const created = this.roomService.ensure(id);
		return { success: true, roomId: id, created };
	}
}
