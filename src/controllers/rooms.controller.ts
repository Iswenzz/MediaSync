import { Controller, Post, Query } from "@nestjs/common";

import { RoomsService } from "@/services/rooms.service";

@Controller("api/rooms")
export class RoomsController {
	constructor(private roomsService: RoomsService) {}

	@Post()
	create(@Query("id") id: string) {
		if (!id) return { success: false, error: "Missing room id" };
		const created = this.roomsService.ensure(id);
		return { success: true, roomId: id, created };
	}
}
