import bcrypt from "bcryptjs";

const hash = "$2a$10$wE9OqjJvGxjzZcTq5d.LueP2aX7M8uDq4Cj4vH8sS9fG/t9lO8R9W";
const password = "password";

bcrypt.compare(password, hash).then(console.log).catch(console.error);
