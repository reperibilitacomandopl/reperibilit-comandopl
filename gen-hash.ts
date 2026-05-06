import bcrypt from "bcryptjs";

async function run() {
  const newHash = await bcrypt.hash("password", 10);
  console.log("Valid hash for password:", newHash);
}

run();
