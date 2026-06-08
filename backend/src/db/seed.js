import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Compliance from '../models/Compliance.js';
import { COMPLIANCE_AREAS } from '../config/constants.js';

const ADMIN_USERS = [
  ['admin@dwelloro.com', 'DwelloroAdmin!1', 'Dwelloro Admin', 'admin'],
];

const DEMO_USERS = [
  ['manager@dwelloro.demo', 'Demo!123', 'Alex Manager', 'property_manager'],
  ['tenant@dwelloro.demo', 'Demo!123', 'Sam Tenant', 'tenant'],
  ['contractor@dwelloro.demo', 'Demo!123', 'Jordan Plumb', 'contractor'],
  ['landlord@dwelloro.demo', 'Demo!123', 'Robin Owner', 'landlord'],
  ['inspector@dwelloro.demo', 'Demo!123', 'Casey Inspect', 'inspector'],
];

export async function seed() {
  const ids = {};

  for (const [email, pw, name, role] of ADMIN_USERS) {
    if (!await User.findOne({ email })) {
      await User.create({ email, full_name: name, role, password_hash: bcrypt.hashSync(pw, 10) });
    }
  }

  for (const [email, pw, name, role] of DEMO_USERS) {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        full_name: name,
        role,
        password_hash: bcrypt.hashSync(pw, 10),
      });
    }
    ids[role] = user.id;
  }

  await User.updateOne(
    { email: 'manager@dwelloro.demo' },
    { $set: { plan_tier: 'enterprise', plan_started_at: '2026-01-01T00:00:00.000Z' } }
  );

  const existing = await Property.findOne({
    address: '12 Smith Street',
    manager_id: ids.property_manager,
  });

  if (!existing) {
    const samples = [
      {
        address: '12 Smith Street',
        suburb: 'Mt Eden',
        city: 'Auckland',
        bedrooms: 3,
        bathrooms: 1,
        tenant_id: ids.tenant,
        landlord_id: ids.landlord,
      },
      {
        address: '88 Lake Avenue',
        suburb: 'Hamilton East',
        city: 'Hamilton',
        bedrooms: 4,
        bathrooms: 2,
        landlord_id: ids.landlord,
      },
      {
        address: '5 Queen Road',
        suburb: 'Brooklyn',
        city: 'Wellington',
        bedrooms: 2,
        bathrooms: 1,
        landlord_id: ids.landlord,
      },
    ];

    for (const sample of samples) {
      const property = await Property.create({
        ...sample,
        manager_id: ids.property_manager,
      });
      for (const area of COMPLIANCE_AREAS) {
        await Compliance.create({
          property_id: property.id,
          area,
          status: area === 'heating' ? 'compliant' : 'missing_evidence',
        });
      }
    }
  }

  console.log('Seed complete');
}
