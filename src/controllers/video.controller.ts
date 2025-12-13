import { Controller, Post, Query } from "@nestjs/common";

import { StateService } from "@/services/state.service";
import { AppGateway } from "@/app.gateway";

@Controller("api/video")
export class VideoController {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService
	) {}

	@Post("youtube")
	load(@Query("id") id: string) {
		this.stateService.state.type = "youtube";
		this.stateService.state.id = id;
		this.stateService.state.time = 0;
		this.stateService.startTimer();
		this.appGateway.broadcast("video", this.stateService.state);
		return { success: true };
	}

	@Post("pause")
	pause() {
		this.stateService.state.paused = !this.stateService.state.paused;
		if (this.stateService.state.paused) this.stateService.clearTimer();
		else this.stateService.startTimer();
		this.appGateway.broadcast("video-pause", this.stateService.state);
		return { success: true };
	}

	@Post("seek")
	seek(@Query("time") time: string) {
		this.stateService.clearTimer();
		this.stateService.state.time = parseInt(time || "0");
		this.stateService.startTimer();
		this.appGateway.broadcast("video-seek", this.stateService.state);
		return { success: true };
	}
}
