import { Controller, Post, Query } from "@nestjs/common";

import { StateService } from "@/services/state.service";
import { AppGateway } from "@/app.gateway";

@Controller("api/video")
export class VideoController {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService
	) {}

	@Post("next")
	next() {
		if (this.stateService.state.index + 1 < this.stateService.ids.length)
			this.stateService.state.index++;
		this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
		this.stateService.state.time = 0;
		this.stateService.state.looped = true;
		this.stateService.clearTimer();
		this.appGateway.broadcast("video", this.stateService.state);
		return { success: true };
	}

	@Post("prev")
	prev() {
		if (this.stateService.state.index - 1 >= 0) this.stateService.state.index--;
		this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
		this.stateService.state.time = 0;
		this.stateService.state.looped = true;
		this.stateService.clearTimer();
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
