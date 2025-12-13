import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

const bootstrap = async () => {
	const app = await NestFactory.create(AppModule);
	await app.listen(parseInt(process.env.PORT || "9000"));
};
bootstrap();
