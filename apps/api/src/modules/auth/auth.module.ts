import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionRepository } from "./session.repository";
import { MailerModule } from "../mailer/mailer.module";

@Module({
  imports: [
    ConfigModule,
    MailerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET is not configured");
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "1h",
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionRepository],
  exports: [AuthService],
})
export class AuthModule {}
