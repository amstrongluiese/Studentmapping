import "dotenv/config";
import mysql from "mysql2/promise";

async function run() {
  const mysqlUrl = process.env.MYSQL_URL || "mysql://root:admin123@localhost:3306/student_mapping";
  console.log("Connecting to MySQL database...");
  const connection = await mysql.createConnection(mysqlUrl);
  
  console.log("Creating mapping_logs table if not exists...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`mapping_logs\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`import_id\` int NULL,
      \`student_processed_id\` int NULL,
      \`school_registry_id\` int NULL,
      \`action\` varchar(100) NOT NULL,
      \`matched_rule\` varchar(255) NULL,
      \`notes\` text NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`import_id\`) REFERENCES \`imports\`(\`id\`) ON DELETE SET NULL,
      FOREIGN KEY (\`student_processed_id\`) REFERENCES \`students_processed\`(\`id\`) ON DELETE SET NULL,
      FOREIGN KEY (\`school_registry_id\`) REFERENCES \`school_registry\`(\`id\`) ON DELETE SET NULL
    );
  `);
  
  console.log("Table mapping_logs verified/created successfully!");
  await connection.end();
}

run().catch(console.error);
