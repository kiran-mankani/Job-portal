
const jwt = require("jsonwebtoken");
// jsonwebtoken package JWT token create karne ke liye use hota hai.

const generateToken = (userId) => {
  // Ye function user ki ID receive karta hai.

  return jwt.sign(
    { id: userId },
    // Token ke andar user ki ID store hogi.

    process.env.JWT_SECRET,
    // JWT_SECRET .env file se secret key leta hai.

    { expiresIn: "7d" }
    // Token 7 din ke baad expire ho jayega.
  );
};

module.exports = generateToken;
// Function ko doosri files mein use karne ke liye export kar rahe hain.