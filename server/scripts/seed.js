/**
 * Database Seed Script
 * FeedHope Server - Seed Sample Data
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('../db');

const seed = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Hash password for test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create test users
    console.log('Creating test users...');
    
    // Donor user
    const donorUser = await query(
      'INSERT INTO users (email, password, role, email_verified) VALUES (?, ?, ?, ?)',
      ['donor@feedhope.com', hashedPassword, 'donor', true]
    );
    const donorUserId = donorUser.insertId;

    // Volunteer user
    const volunteerUser = await query(
      'INSERT INTO users (email, password, role, email_verified) VALUES (?, ?, ?, ?)',
      ['volunteer@feedhope.com', hashedPassword, 'volunteer', true]
    );
    const volunteerUserId = volunteerUser.insertId;

    // Delivery user
    const deliveryUser = await query(
      'INSERT INTO users (email, password, role, email_verified) VALUES (?, ?, ?, ?)',
      ['delivery@feedhope.com', hashedPassword, 'delivery', true]
    );
    const deliveryUserId = deliveryUser.insertId;

    console.log('✅ Test users created\n');

    // 2. Create profiles
    console.log('Creating user profiles...');

    // Donor profile
    await query(
      `INSERT INTO donors (user_id, name, phone, gender, division, district, area, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [donorUserId, 'John Donor', '01712345678', 'male', 'Dhaka', 'Dhaka', 'Mirpur 2', 'House 123, Road 456']
    );

    // Volunteer profile
    await query(
      `INSERT INTO volunteers (user_id, name, organization_name, phone, division, district, area, address, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [volunteerUserId, 'NGO Volunteer', 'FeedHope NGO', '01787654321', 'Dhaka', 'Dhaka', 'Dhanmondi', 'Office 789', true]
    );

    // Delivery profile
    await query(
      `INSERT INTO delivery_persons (user_id, name, phone, division, district, area, address, vehicle_type, availability_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deliveryUserId, 'Delivery Person', '01711111111', 'Dhaka', 'Dhaka', 'Mirpur 2', 'Area XYZ', 'Motorcycle', 'available']
    );

    console.log('✅ User profiles created\n');

    // 3. Create sample food donations
    console.log('Creating sample food donations...');

    const donorProfile = await query('SELECT id FROM donors WHERE user_id = ?', [donorUserId]);
    const donorProfileId = donorProfile[0].id;

    await query(
      `INSERT INTO food_donations 
       (donor_id, food_name, food_type, category, quantity, description, pickup_address,
        pickup_division, pickup_district, pickup_area, contact_phone, status)
       VALUES 
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [
        donorProfileId, 'Rice & Curry', 'Cooked', 'Meal', '20 servings',
        'Freshly cooked rice and curry, packed and ready for distribution',
        'House 123, Road 456, Mirpur 2', 'Dhaka', 'Dhaka', 'Mirpur 2', '01712345678'
      ]
    );

    await query(
      `INSERT INTO food_donations 
       (donor_id, food_name, food_type, category, quantity, description, pickup_address,
        pickup_division, pickup_district, pickup_area, contact_phone, status)
       VALUES 
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [
        donorProfileId, 'Biryani Packets', 'Cooked', 'Meal', '15 packets',
        'Delicious biryani packets, hot and fresh',
        'House 123, Road 456, Mirpur 2', 'Dhaka', 'Dhaka', 'Mirpur 2', '01712345678'
      ]
    );

    console.log('✅ Sample food donations created\n');

    // 4. Import locations
    console.log('Importing locations...');
    // Note: Locations should be imported from locations_seed.sql separately
    console.log('ℹ️  Locations should be imported from server/database/locations_seed.sql\n');

    console.log('✅ Database seed completed successfully!\n');
    console.log('Test Accounts:');
    console.log('  Donor:     donor@feedhope.com / password123');
    console.log('  Volunteer: volunteer@feedhope.com / password123');
    console.log('  Delivery:  delivery@feedhope.com / password123\n');

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run seed
seed()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

