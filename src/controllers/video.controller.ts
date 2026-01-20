import { Controller, Post, Query } from "@nestjs/common";

import { StateService } from "@/services/state.service";
import { BrowserService } from "@/services/browser.service";
import { AppGateway } from "@/app.gateway";

@Controller("api/video")
export class VideoController {
	constructor(
		private appGateway: AppGateway,
		private stateService: StateService,
		private browserService: BrowserService
	) {}

	@Post("next")
	async next() {
		if (this.stateService.state.mode === "browser-shorts") {
			const result = await this.browserService.nextShort();
			if (result.success && result.id) {
				this.stateService.state.id = result.id;
				this.stateService.state.time = 0;
				this.appGateway.broadcast("video", this.stateService.state);
			}
			return result;
		}
		if (this.stateService.state.mode === "shorts" || this.stateService.state.mode === "playlist") {
			if (this.stateService.state.index + 1 < this.stateService.ids.length)
				this.stateService.state.index++;
			this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
			this.stateService.state.time = 0;
			this.stateService.state.looped = true;
			this.stateService.clearTimer();
			this.appGateway.broadcast("video", this.stateService.state);
			return { success: true };
		}
		return { success: false, error: "No active playlist" };
	}

	@Post("prev")
	async prev() {
		if (this.stateService.state.mode === "browser-shorts") {
			const result = await this.browserService.prevShort();
			if (result.success && result.id) {
				this.stateService.state.id = result.id;
				this.stateService.state.time = 0;
				this.appGateway.broadcast("video", this.stateService.state);
			}
			return result;
		}
		if (this.stateService.state.mode === "shorts" || this.stateService.state.mode === "playlist") {
			if (this.stateService.state.index - 1 >= 0) this.stateService.state.index--;
			this.stateService.state.id = this.stateService.ids[this.stateService.state.index];
			this.stateService.state.time = 0;
			this.stateService.state.looped = true;
			this.stateService.clearTimer();
			this.appGateway.broadcast("video", this.stateService.state);
			return { success: true };
		}
		return { success: false, error: "No active playlist" };
	}

	@Post("pause")
	pause() {
		this.stateService.state.paused = !this.stateService.state.paused;
		if (this.stateService.state.paused) this.stateService.clearTimer();
		else if (!this.stateService.state.looped) this.stateService.startTimer();
		this.appGateway.broadcast("video-pause", this.stateService.state);
		return { success: true };
	}

	@Post("seek")
	seek(@Query("time") time: string) {
		this.stateService.clearTimer();
		const parts = (time || "0").split(":").map(p => parseInt(p));
		this.stateService.state.time = parts.length === 3
			? parts[0] * 3600 + parts[1] * 60 + parts[2]
			: parts.length === 2
			? parts[0] * 60 + parts[1]
			: parts[0];
		if(!this.stateService.state.looped) this.stateService.startTimer();
		this.appGateway.broadcast("video-seek", this.stateService.state);
		return { success: true };
	}
}
