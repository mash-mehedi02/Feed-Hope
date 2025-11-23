/**
 * Firebase Locations Service
 * FeedHope - Location Functions
 * Complete Bangladesh Location Data (8 Divisions, 64 Districts, Major Areas)
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Complete Bangladesh Location Data (Hardcoded Fallback)
const BANGLADESH_LOCATIONS = {
  divisions: [
    { id: 'dhaka', name: 'Dhaka' },
    { id: 'chittagong', name: 'Chittagong' },
    { id: 'sylhet', name: 'Sylhet' },
    { id: 'rajshahi', name: 'Rajshahi' },
    { id: 'khulna', name: 'Khulna' },
    { id: 'barisal', name: 'Barisal' },
    { id: 'rangpur', name: 'Rangpur' },
    { id: 'mymensingh', name: 'Mymensingh' }
  ],
  districts: {
    'Dhaka': [
      'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 
      'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 
      'Shariatpur', 'Tangail'
    ],
    'Chittagong': [
      'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', 
      'Cox\'s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 
      'Rangamati'
    ],
    'Sylhet': [
      'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'
    ],
    'Rajshahi': [
      'Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 
      'Pabna', 'Rajshahi', 'Sirajganj'
    ],
    'Khulna': [
      'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 
      'Magura', 'Meherpur', 'Narail', 'Satkhira'
    ],
    'Barisal': [
      'Barguna', 'Barisal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'
    ],
    'Rangpur': [
      'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 
      'Panchagarh', 'Rangpur', 'Thakurgaon'
    ],
    'Mymensingh': [
      'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'
    ]
  },
  areas: {
    // Dhaka District Areas
    'Dhaka': [
      'Dhanmondi', 'Mirpur 1', 'Mirpur 2', 'Mirpur 6', 'Mirpur 10', 'Mirpur 11', 
      'Mirpur 12', 'Mirpur 13', 'Mirpur 14', 'Banani', 'Gulshan 1', 'Gulshan 2', 
      'Uttara', 'Wari', 'Old Dhaka', 'Ramna', 'Motijheel', 'Dilkusha', 'Tejgaon', 
      'Farmgate', 'Mohammadpur', 'Adabor', 'Shyamoli', 'Kallyanpur', 'Gabtoli', 
      'Agargaon', 'Sher-e-Bangla Nagar', 'Karwan Bazar', 'Badda', 'Rampura', 
      'Khilgaon', 'Malibagh', 'Rampura', 'Cantonment', 'Airport', 'Kuril', 
      'Bashundhara', 'Notun Bazar', 'Pallabi', 'Kazipara', 'Shewrapara'
    ],
    // Gazipur District Areas
    'Gazipur': [
      'Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Tongi'
    ],
    // Narayanganj District Areas
    'Narayanganj': [
      'Narayanganj Sadar', 'Bandar', 'Rupganj', 'Sonargaon', 'Araihazar'
    ],
    // Major areas for other districts (key cities/towns)
    'Chittagong': [
      'Chittagong Sadar', 'Agrabad', 'Pahartali', 'Halishahar', 'Panchlaish', 
      'Kotwali', 'Double Mooring', 'Chandgaon', 'Bahaddarhat', 'Oxygen', 
      'Nasirabad', 'GEC Circle'
    ],
    'Sylhet': [
      'Sylhet Sadar', 'Zindabazar', 'Kumarpara', 'Akhalia', 'Bandar Bazar', 
      'Subidbazar', 'Balaganj', 'Beanibazar'
    ],
    'Rajshahi': [
      'Rajshahi Sadar', 'Boalia', 'Shah Makhdum', 'Kazla', 'Laxmipur', 
      'New Market', 'Tikapara'
    ],
    'Khulna': [
      'Khulna Sadar', 'Sonadanga', 'Labonchora', 'Khalishpur', 'Daulatpur', 
      'Boyra', 'Rupsa'
    ],
    'Barisal': [
      'Barisal Sadar', 'Nathullabad', 'Chandmari', 'Notun Bazar', 'Kotwali', 
      'Kashipur'
    ],
    'Rangpur': [
      'Rangpur Sadar', 'Alamnagar', 'College Para', 'Kachari Bazar', 
      'Gangachara', 'Mithapukur'
    ],
    'Mymensingh': [
      'Mymensingh Sadar', 'Cantonment', 'Valuka', 'Muktagachha', 'Dhobaura', 
      'Fulbaria'
    ]
  }
};

/**
 * Get all divisions
 */
export const getDivisions = async () => {
  try {
    // Try Firestore query first (only if index exists)
    try {
      const q = query(
        collection(db, 'locations'),
        where('type', '==', 'division'),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      const divisionsSet = new Set();
      const divisions = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'division' && !divisionsSet.has(data.name)) {
          divisionsSet.add(data.name);
          divisions.push({
            id: doc.id,
            name: data.name
          });
        }
      });

      // If Firestore has data, use it
      if (divisions.length > 0) {
        return {
          success: true,
          data: divisions.sort((a, b) => a.name.localeCompare(b.name))
        };
      }
    } catch (firestoreError) {
      // Index missing or other Firestore error - silently fallback
      // Don't log error as it's expected if index doesn't exist
    }

    // Fallback to hardcoded divisions (always works)
    return {
      success: true,
      data: BANGLADESH_LOCATIONS.divisions.sort((a, b) => a.name.localeCompare(b.name))
    };
  } catch (error) {
    // Final fallback if something unexpected happens
    console.warn('Unexpected error in getDivisions, using fallback:', error);
    return {
      success: true,
      data: BANGLADESH_LOCATIONS.divisions.sort((a, b) => a.name.localeCompare(b.name))
    };
  }
};

/**
 * Get districts by division
 */
export const getDistricts = async (division) => {
  try {
    if (!division) {
      return {
        success: false,
        message: 'Division is required',
        data: []
      };
    }

    // Try to get from Firestore first
    try {
      const q = query(
        collection(db, 'locations'),
        where('parent', '==', division),
        where('type', '==', 'district'),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      const districts = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        districts.push({
          id: doc.id,
          name: data.name,
          parent: data.parent
        });
      });

      if (districts.length > 0) {
        return {
          success: true,
          data: districts.sort((a, b) => a.name.localeCompare(b.name))
        };
      }
    } catch (firestoreError) {
      console.warn('Firestore query failed, using fallback:', firestoreError);
    }

    // Fallback to hardcoded districts
    const hardcodedDistricts = BANGLADESH_LOCATIONS.districts[division] || [];
    if (hardcodedDistricts.length > 0) {
      return {
        success: true,
        data: hardcodedDistricts.map((name, index) => ({
          id: `${division.toLowerCase()}_${name.toLowerCase().replace(/\s+/g, '_')}`,
          name: name,
          parent: division
        })).sort((a, b) => a.name.localeCompare(b.name))
      };
    }

    return {
      success: false,
      message: `No districts found for division: ${division}`,
      data: []
    };
  } catch (error) {
    console.error('Get districts error:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
};

/**
 * Get areas by district (with optional search)
 */
export const getAreas = async (district, search = '') => {
  try {
    if (!district) {
      return {
        success: false,
        message: 'District is required',
        data: []
      };
    }

    // Try to get from Firestore first
    try {
      const q = query(
        collection(db, 'locations'),
        where('parent', '==', district),
        where('type', '==', 'area'),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      let areas = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const areaName = data.name || '';
        
        // Filter by search term if provided
        if (!search || areaName.toLowerCase().includes(search.toLowerCase())) {
          areas.push({
            id: doc.id,
            name: areaName,
            latitude: data.latitude || null,
            longitude: data.longitude || null
          });
        }
      });

      if (areas.length > 0) {
        return {
          success: true,
          data: areas.sort((a, b) => a.name.localeCompare(b.name))
        };
      }
    } catch (firestoreError) {
      console.warn('Firestore query failed, using fallback:', firestoreError);
    }

    // Fallback to hardcoded areas
    const hardcodedAreas = BANGLADESH_LOCATIONS.areas[district] || [];
    if (hardcodedAreas.length > 0) {
      let areas = hardcodedAreas.map((name, index) => ({
        id: `${district.toLowerCase()}_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name: name,
        latitude: null,
        longitude: null
      }));

      // Filter by search term if provided
      if (search) {
        areas = areas.filter(area => 
          area.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      return {
        success: true,
        data: areas.sort((a, b) => a.name.localeCompare(b.name))
      };
    }

    // If no areas found, return empty array
    return {
      success: true,
      data: []
    };
  } catch (error) {
    console.error('Get areas error:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
};
