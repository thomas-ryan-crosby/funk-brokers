// Script to populate Firestore with dummy property data
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../firebase/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const dummyProperties = [
  {
    address: '123 Oak Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    propertyType: 'single-family',
    price: 1250000,
    squareFeet: 2500,
    lotSize: 5000,
    yearBuilt: 1920,
    bedrooms: 3,
    bathrooms: 2.5,
    description: 'Beautiful Victorian home in the heart of San Francisco. Features original hardwood floors, updated kitchen, and a charming backyard garden. Walking distance to public transportation and local shops.',
    features: ['Garage', 'Fireplace', 'Hardwood Floors', 'Updated Kitchen', 'Garden', 'Central Air'],
    hoaFee: null,
    propertyTax: 15000,
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    ],
    status: 'active',
    sellerId: 'seller-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    address: '456 Maple Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90028',
    propertyType: 'condo',
    price: 850000,
    squareFeet: 1200,
    lotSize: null,
    yearBuilt: 2010,
    bedrooms: 2,
    bathrooms: 2,
    description: 'Modern condo with stunning city views. Open floor plan, high ceilings, and premium finishes throughout. Building amenities include gym, pool, and rooftop terrace.',
    features: ['Pool', 'Gym', 'Updated Kitchen', 'Updated Bathroom', 'Central Air', 'Dishwasher'],
    hoaFee: 450,
    propertyTax: 8500,
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
    status: 'active',
    sellerId: 'seller-2',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    address: '789 Pine Road',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    propertyType: 'townhouse',
    price: 675000,
    squareFeet: 1800,
    lotSize: 3000,
    yearBuilt: 2005,
    bedrooms: 3,
    bathrooms: 2.5,
    description: 'Spacious townhouse in desirable neighborhood. Two-car garage, private backyard, and modern updates. Close to parks, schools, and shopping.',
    features: ['Garage', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Washer/Dryer', 'Central Heat'],
    hoaFee: 250,
    propertyTax: 7200,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    ],
    status: 'active',
    sellerId: 'seller-3',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    address: '321 Elm Drive',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    propertyType: 'single-family',
    price: 950000,
    squareFeet: 3200,
    lotSize: 8000,
    yearBuilt: 2018,
    bedrooms: 4,
    bathrooms: 3,
    description: 'Stunning modern home with open concept design. Chef\'s kitchen, master suite with walk-in closet, and resort-style backyard with pool. Energy efficient with solar panels.',
    features: ['Pool', 'Garage', 'Fireplace', 'Updated Kitchen', 'Updated Bathroom', 'Central Air', 'Garden'],
    hoaFee: null,
    propertyTax: 18000,
    photos: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    status: 'active',
    sellerId: 'seller-4',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    address: '654 Birch Lane',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    propertyType: 'single-family',
    price: 550000,
    squareFeet: 1600,
    lotSize: 4000,
    yearBuilt: 1955,
    bedrooms: 2,
    bathrooms: 1.5,
    description: 'Charming mid-century home with character and potential. Large lot, mature trees, and original architectural details. Great for first-time buyers or investors.',
    features: ['Garden', 'Fireplace', 'Hardwood Floors', 'Central Heat'],
    hoaFee: null,
    propertyTax: 5500,
    photos: [
      'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
    ],
    status: 'active',
    sellerId: 'seller-5',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
  {
    address: '987 Cedar Court',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    propertyType: 'condo',
    price: 425000,
    squareFeet: 950,
    lotSize: null,
    yearBuilt: 2015,
    bedrooms: 1,
    bathrooms: 1,
    description: 'Cozy downtown condo perfect for urban living. Walk to restaurants, shops, and entertainment. Low maintenance lifestyle with all the city has to offer.',
    features: ['Updated Kitchen', 'Updated Bathroom', 'Central Air', 'Dishwasher', 'Garbage Disposal'],
    hoaFee: 350,
    propertyTax: 4200,
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
    status: 'active',
    sellerId: 'seller-6',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    address: '147 Spruce Street',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    propertyType: 'multi-family',
    price: 750000,
    squareFeet: 2800,
    lotSize: 6000,
    yearBuilt: 1925,
    bedrooms: 6,
    bathrooms: 4,
    description: 'Historic two-family home with rental income potential. Each unit has 3 bedrooms and 2 bathrooms. Great investment opportunity in established neighborhood.',
    features: ['Garage', 'Fireplace', 'Hardwood Floors', 'Central Heat', 'Washer/Dryer'],
    hoaFee: null,
    propertyTax: 12000,
    photos: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    status: 'active',
    sellerId: 'seller-7',
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date('2024-02-12'),
  },
  {
    address: '258 Willow Way',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    propertyType: 'condo',
    price: 1200000,
    squareFeet: 1800,
    lotSize: null,
    yearBuilt: 2020,
    bedrooms: 2,
    bathrooms: 2,
    description: 'Luxury waterfront condo with ocean views. High-end finishes, smart home features, and resort-style amenities. Steps from the beach.',
    features: ['Pool', 'Gym', 'Updated Kitchen', 'Updated Bathroom', 'Central Air', 'Dishwasher', 'Garbage Disposal'],
    hoaFee: 850,
    propertyTax: 22000,
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
    status: 'active',
    sellerId: 'seller-8',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    address: '369 Ash Boulevard',
    city: 'Boston',
    state: 'MA',
    zipCode: '02101',
    propertyType: 'townhouse',
    price: 1100000,
    squareFeet: 2200,
    lotSize: 2500,
    yearBuilt: 2012,
    bedrooms: 3,
    bathrooms: 2.5,
    description: 'Elegant townhouse in historic neighborhood. Renovated throughout with attention to detail. Private roof deck with city views. Walk to everything.',
    features: ['Garage', 'Fireplace', 'Hardwood Floors', 'Updated Kitchen', 'Updated Bathroom', 'Central Air'],
    hoaFee: 400,
    propertyTax: 15000,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    status: 'active',
    sellerId: 'seller-9',
    createdAt: new Date('2024-02-18'),
    updatedAt: new Date('2024-02-18'),
  },
  {
    address: '741 Poplar Circle',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37201',
    propertyType: 'single-family',
    price: 475000,
    squareFeet: 2000,
    lotSize: 7000,
    yearBuilt: 2000,
    bedrooms: 3,
    bathrooms: 2,
    description: 'Well-maintained family home in quiet neighborhood. Large backyard, two-car garage, and recent updates. Great schools nearby.',
    features: ['Garage', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Central Air', 'Washer/Dryer'],
    hoaFee: null,
    propertyTax: 4800,
    photos: [
      'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
    ],
    status: 'active',
    sellerId: 'seller-10',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20'),
  },
];

async function populateProperties() {
  try {
    console.log('Starting to populate dummy properties...');
    
    const batch = db.batch();
    const propertiesRef = db.collection('properties');
    
    for (const property of dummyProperties) {
      const docRef = propertiesRef.doc();
      batch.set(docRef, property);
      console.log(`Added property: ${property.address}, ${property.city}, ${property.state}`);
    }
    
    await batch.commit();
    console.log(`\n✅ Successfully added ${dummyProperties.length} properties to Firestore!`);
    console.log('\nProperties added:');
    dummyProperties.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.address}, ${prop.city}, ${prop.state} - $${prop.price.toLocaleString()}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating properties:', error);
    process.exit(1);
  }
}

populateProperties();
