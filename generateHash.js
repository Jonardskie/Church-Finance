// Generate bcrypt hash for admin password reset
const bcrypt = require("bcryptjs");

async function generateHash() {
    const newPassword = "NewAdminPassword123"; // Change this to your desired password
    
    console.log("🔄 Generating bcrypt hash...\n");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log("✅ Hash generated successfully!\n");
    console.log("New Password: " + newPassword);
    console.log("Bcrypt Hash: " + hashedPassword);
    console.log("\n📋 SQL Command to run in Neon:\n");
    console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'admin' OR role = 'admin';`);
    console.log("\n⚠️  Copy the SQL command above and run it in your Neon SQL editor.");
}

generateHash();
