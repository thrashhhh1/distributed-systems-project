import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const mongoUrl = configService.get<string>('MONGODB_URL');
                console.log(`Connecting to MongoDB at: ${mongoUrl}`);
                return {
                    uri: mongoUrl,
                };
            },
        }),
    ],
})
export class DatabaseModule { }