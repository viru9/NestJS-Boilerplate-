import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create regular user
  const userPassword = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('Created regular user:', user.email);

  // Create premium user
  const premiumPassword = await bcrypt.hash('Premium123!', 10);
  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@example.com' },
    update: {},
    create: {
      email: 'premium@example.com',
      password: premiumPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: Role.PREMIUM,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('Created premium user:', premiumUser.email);

  // Create sample conversation for the regular user
  const conversation = await prisma.conversation.create({
    data: {
      title: 'Sample Conversation',
      userId: user.id,
      messages: {
        create: [
          {
            role: 'USER',
            content: 'Hello, how can you help me?',
            tokens: 10,
            model: 'gpt-4',
          },
          {
            role: 'ASSISTANT',
            content:
              'Hello! I can help you with various tasks. What would you like to know?',
            tokens: 20,
            model: 'gpt-4',
          },
        ],
      },
    },
  });

  console.log('Created sample conversation:', conversation.id);

  console.log('Database seed completed successfully!');
  console.log('\n=== Test Credentials ===');
  console.log('Admin: admin@example.com / Admin123!');
  console.log('User: user@example.com / User123!');
  console.log('Premium: premium@example.com / Premium123!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
