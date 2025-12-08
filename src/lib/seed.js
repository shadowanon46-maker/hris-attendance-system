import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import { db } from './db.js';
import { users, shift, companySettings } from './schema.js';

config({ path: '.env.local' });

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Insert Shift Data
    console.log('📅 Seeding shift data...');
    const shiftData = await db.insert(shift).values([
      {
        name: 'Pagi',
        startTime: '08:00:00',
        endTime: '16:00:00',
        toleranceLate: 15,
      },
      {
        name: 'Siang',
        startTime: '13:00:00',
        endTime: '21:00:00',
        toleranceLate: 15,
      },
      {
        name: 'Malam',
        startTime: '21:00:00',
        endTime: '05:00:00',
        toleranceLate: 15,
      },
    ]).returning();
    console.log(`✅ Created ${shiftData.length} shifts`);

    // 2. Insert Company Settings
    console.log('🏢 Seeding company settings...');
    const settings = await db.insert(companySettings).values([
      {
        key: 'office_lat',
        value: '-6.200000',
        description: 'Latitude koordinat kantor',
      },
      {
        key: 'office_lng',
        value: '106.816666',
        description: 'Longitude koordinat kantor',
      },
      {
        key: 'office_radius',
        value: '100',
        description: 'Radius area kantor dalam meter',
      },
      {
        key: 'office_name',
        value: 'PT. HRIS Indonesia',
        description: 'Nama perusahaan',
      },
      {
        key: 'office_address',
        value: 'Jakarta, Indonesia',
        description: 'Alamat kantor',
      },
    ]).returning();
    console.log(`✅ Created ${settings.length} company settings`);

    // 3. Insert Default Admin User
    console.log('👤 Seeding admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await db.insert(users).values({
      nip: 'ADM001',
      email: 'admin@hris.com',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'admin',
      shiftId: shiftData[0].id, // Shift Pagi
      isActive: true,
    }).returning();
    console.log(`✅ Created admin user: ${adminUser[0].email}`);

    // 4. Insert Sample Employees
    console.log('👥 Seeding sample employees...');
    const employeePassword = await bcrypt.hash('employee123', 10);
    const employees = await db.insert(users).values([
      {
        nip: 'EMP001',
        email: 'employee1@hris.com',
        password: employeePassword,
        fullName: 'John Doe',
        role: 'employee',
        shiftId: shiftData[0].id, // Shift Pagi
        isActive: true,
      },
      {
        nip: 'EMP002',
        email: 'employee2@hris.com',
        password: employeePassword,
        fullName: 'Jane Smith',
        role: 'employee',
        shiftId: shiftData[1].id, // Shift Siang
        isActive: true,
      },
      {
        nip: 'EMP003',
        email: 'employee3@hris.com',
        password: employeePassword,
        fullName: 'Bob Johnson',
        role: 'employee',
        shiftId: shiftData[0].id, // Shift Pagi
        isActive: true,
      },
    ]).returning();
    console.log(`✅ Created ${employees.length} employees`);

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Shifts: ${shiftData.length}`);
    console.log(`   - Settings: ${settings.length}`);
    console.log(`   - Admin: 1 (email: admin@hris.com, password: admin123)`);
    console.log(`   - Employees: ${employees.length} (password: employee123)`);
    console.log('\n🚀 You can now start the application!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
