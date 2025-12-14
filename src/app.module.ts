import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { VideoController } from "@/controllers/video.controller";
import { YoutubeController } from "@/controllers/youtube.controller";
import { StateService } from "@/services/state.service";
import { AppGateway } from "@/app.gateway";

@Module({
	controllers: [VideoController, YoutubeController],
	providers: [AppGateway, StateService],
	imports: [
		ConfigModule.forRoot({
			envFilePath:
				process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"
		})
	],
	exports: [StateService]
})
export class AppModule {}
