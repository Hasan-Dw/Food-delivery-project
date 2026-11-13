import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UploadsService } from './uploads.service';

@Module({
  providers: [CloudinaryService, UploadsService],
  exports: [CloudinaryService, UploadsService],
})
export class UploadsModule {}
