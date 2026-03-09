const mongoose = require('mongoose');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/couple-chat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log(`✅ MongoDB connected: ${conn.connection.host}`);
};

module.exports = { connectDB };
