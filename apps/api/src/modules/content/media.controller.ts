import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService } from "./media.service";

class UploadMediaDto {
  @ApiProperty()
  @IsString()
  alt!: string;
}

class UpdateMediaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alt?: string;
}

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async listMedia() {
    return this.mediaService.list();
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        alt: { type: "string" },
      },
      required: ["file", "alt"],
    },
  })
  async uploadMedia(
    @UploadedFile() file:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
    @Body() body: UploadMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.mediaService.upload({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      alt: body.alt,
    });
  }

  @Delete(":id")
  async deleteMedia(@Param("id") id: string) {
    await this.mediaService.delete(id);
    return { ok: true };
  }

  @Patch(":id")
  async updateMedia(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.mediaService.update(id, { alt: body.alt?.trim() || undefined });
  }
}
