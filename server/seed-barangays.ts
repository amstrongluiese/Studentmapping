import { getPool } from './db';
import dotenv from 'dotenv';
dotenv.config();

const BINAN_BARANGAYS: Record<string, { lat: number; lng: number }> = {
  "Biñan": { lat: 14.3333, lng: 121.0833 },
  "Bungahan": { lat: 14.3167, lng: 121.0667 },
  "Casile": { lat: 14.3214, lng: 121.0742 },
  "Canlalay": { lat: 14.3411, lng: 121.0850 },
  "De La Paz": { lat: 14.3347, lng: 121.0758 },
  "Ganado": { lat: 14.3015, lng: 121.0811 },
  "Halang": { lat: 14.3119, lng: 121.0575 },
  "Kalamunding": { lat: 14.3328, lng: 121.0872 },
  "Langkiwa": { lat: 14.3006, lng: 121.0572 },
  "Loma": { lat: 14.3108, lng: 121.0514 },
  "Malaban": { lat: 14.3537, lng: 121.0865 },
  "Malamig": { lat: 14.2989, lng: 121.0697 },
  "Mampalasan": { lat: 14.3094, lng: 121.0767 },
  "Platero": { lat: 14.3289, lng: 121.0825 },
  "Poblacion": { lat: 14.3339, lng: 121.0839 },
  "San Antonio": { lat: 14.3283, lng: 121.0767 },
  "San Jose": { lat: 14.3325, lng: 121.0772 },
  "San Vicente": { lat: 14.3361, lng: 121.0828 },
  "Santo Niño": { lat: 14.3317, lng: 121.0817 },
  "Soro-soro": { lat: 14.3189, lng: 121.0614 },
  "Santo Tomas": { lat: 14.3242, lng: 121.0736 },
  "Timbao": { lat: 14.3072, lng: 121.0628 },
  "Tubigan": { lat: 14.3175, lng: 121.0831 },
  "Zapote": { lat: 14.3225, lng: 121.0819 }
};

const SANTA_ROSA_BARANGAYS: Record<string, { lat: number; lng: number }> = {
  "Aplaya": { lat: 14.3262, lng: 121.1189 },
  "Balibago": { lat: 14.2882, lng: 121.1011 },
  "Caingin": { lat: 14.3175, lng: 121.1158 },
  "Dila": { lat: 14.2944, lng: 121.0967 },
  "Dita": { lat: 14.2831, lng: 121.1042 },
  "Don Jose": { lat: 14.2547, lng: 121.0558 },
  "Ibaba": { lat: 14.3128, lng: 121.1150 },
  "Kanluran": { lat: 14.3125, lng: 121.1092 },
  "Labas": { lat: 14.3183, lng: 121.1083 },
  "Macabling": { lat: 14.3025, lng: 121.1019 },
  "Malitlit": { lat: 14.2725, lng: 121.0928 },
  "Malusak": { lat: 14.3089, lng: 121.1128 },
  "Market Area": { lat: 14.3120, lng: 121.1110 },
  "Pooc": { lat: 14.3014, lng: 121.1147 },
  "Pulong Santa Cruz": { lat: 14.2650, lng: 121.0833 },
  "Santo Domingo": { lat: 14.2403, lng: 121.0450 },
  "Sinalhan": { lat: 14.3306, lng: 121.1101 },
  "Tagapo": { lat: 14.3217, lng: 121.1042 }
};

async function seed() {
  const pool = getPool();

  try {
    console.log('Creating table if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barangay_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        province VARCHAR(255) NOT NULL DEFAULT 'Laguna',
        municipality VARCHAR(255) NOT NULL,
        barangay_name VARCHAR(255) NOT NULL,
        normalized_name VARCHAR(255) NOT NULL DEFAULT '',
        latitude DOUBLE NULL,
        longitude DOUBLE NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_barangay_muni (municipality),
        INDEX idx_barangay_name (barangay_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [existing] = await pool.query('SELECT COUNT(*) as count FROM barangay_registry');
    if ((existing as any)[0].count > 0) {
      console.log('Barangay registry already seeded.');
      process.exit(0);
    }

    console.log('Seeding Barangay Registry...');
    for (const [name, coords] of Object.entries(BINAN_BARANGAYS)) {
      await pool.query(
        'INSERT INTO barangay_registry (province, municipality, barangay_name, normalized_name, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        ['Laguna', 'Biñan', name, name.toLowerCase(), coords.lat, coords.lng]
      );
    }
    
    for (const [name, coords] of Object.entries(SANTA_ROSA_BARANGAYS)) {
      await pool.query(
        'INSERT INTO barangay_registry (province, municipality, barangay_name, normalized_name, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        ['Laguna', 'Santa Rosa', name, name.toLowerCase(), coords.lat, coords.lng]
      );
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
