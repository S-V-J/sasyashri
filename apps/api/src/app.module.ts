import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SellerModule } from './modules/seller/seller.module';
import { FarmerModule } from './modules/farmer/farmer.module';
import { FinancierModule } from './modules/financier/financier.module';
import { AgentModule } from './modules/agent/agent.module';
import { TransporterModule } from './modules/transporter/transporter.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LabModule } from './modules/lab/lab.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Queue (BullMQ with Redis)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    SellerModule,
    FarmerModule,
    FinancierModule,
    AgentModule,
    TransporterModule,
    JobsModule,
    LabModule,
    PaymentsModule,
    CommunicationModule,
    AiModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}