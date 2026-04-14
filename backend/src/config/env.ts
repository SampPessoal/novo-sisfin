import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z.string().optional().default(''),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  STORAGE_PROVIDER: z.enum(['s3', 'azure', 'local']).default('local'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('sa-east-1'),
  AWS_S3_BUCKET: z.string().default('sisfin-comprovantes'),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().default('https://sandbox.asaas.com/api/v3'),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  PLUGNOTAS_API_KEY: z.string().optional(),
  PLUGNOTAS_BASE_URL: z.string().default('https://api.plugnotas.com.br'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  OCR_PROVIDER: z.enum(['extractlab', 'tesseract']).default('extractlab'),
  EXTRACTLAB_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('financeiro@empresa.com.br'),
  OPENAI_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
