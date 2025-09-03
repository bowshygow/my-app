import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "mysecret"; // keep in .env

// Generate token
const token = jwt.sign(
  { id: "123", email: "john.doe@gmail.com" }, // payload
  secret,                                     // signing key
  { expiresIn: "1h" }                         // expiry
);

console.log("JWT:", token);

// Verify token
try {
  const decoded = jwt.verify(token, secret);
  console.log("Decoded:", decoded);
} catch (err) {
  console.error("Invalid token");
}
