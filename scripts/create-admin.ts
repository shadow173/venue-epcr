// scripts/create-admin.ts
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../src/lib/auth/password';
import readline from 'readline';
import { eq } from 'drizzle-orm';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  return new Promise<void>((resolve) => {
    rl.question('Enter admin email: ', (email) => {
      rl.question('Enter admin name: ', (name) => {
        rl.question('Enter admin password (min 8 chars): ', async (password) => {
          if (password.length < 8) {
            console.error('Password must be at least 8 characters');
            rl.close();
            resolve();
            return;
          }

          try {
            const userId = uuidv4();
            const hashedPassword = await hashPassword(password);
            
            // Check if admin already exists
            const existingAdmin = await db.select()
              .from(users)
              .where(eq(users.email, email.toLowerCase()))
              .limit(1);
              
            if (existingAdmin.length > 0) {
              console.log(`User with email ${email} already exists`);
              rl.close();
              resolve();
              return;
            }
            
            console.log('Creating admin user...');
            
            await db.insert(users).values({
              id: userId,
              email: email.toLowerCase(),
              name: name,
              password: hashedPassword,
              role: 'ADMIN',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            
            console.log('Admin user created with ID:', userId);
          } catch (error) {
            console.error('Error creating admin user:', error);
          } finally {
            rl.close();
            resolve();
          }
        });
      });
    });
  });
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });