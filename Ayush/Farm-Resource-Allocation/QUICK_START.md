# 🚀 Quick Start Guide

## Start the Backend Server

### Method 1: Using npm (Recommended)
```bash
cd backend
npm install  # Only needed first time
npm start
```

### Method 2: Using the startup script
```bash
cd backend
./start.sh
```

### Method 3: Direct node command
```bash
cd backend
node server.js
```

## What You Should See

When the server starts successfully, you'll see:
```
✅ MongoDB Connected: localhost:27017
✅ AgriOptima Server running on http://localhost:3000
📊 Database routes available at /api/*
```

## Verify Server is Running

1. **Open browser** and go to: `http://localhost:3000`
   - Should show: "AgriOptima Server is running. Database integrated for all sections."

2. **Test API endpoint**: `http://localhost:3000/api/auth/check-user/1234567890`
   - Should return JSON response

## Common Issues

### ❌ "Cannot find module"
**Fix:** Run `npm install` in the backend directory

### ❌ "MongoDB Connection Error"
**Fixes:**
1. **Start MongoDB:**
   - macOS: `brew services start mongodb-community`
   - Windows: Start MongoDB service
   - Linux: `sudo systemctl start mongod`

2. **Or use MongoDB Atlas (Cloud):**
   - Create free account at mongodb.com/cloud/atlas
   - Get connection string
   - Update `.env` file with `MONGODB_URI`

3. **Server will still run** - Database features just won't work until MongoDB is connected

### ❌ "Port 3000 already in use"
**Fix:** 
- Change PORT in `.env` to 3001 (or another port)
- Or kill the process: `lsof -ti:3000 | xargs kill` (macOS/Linux)

### ❌ Network Error in Frontend
**Fixes:**
1. Make sure backend is running (check terminal)
2. Verify URL in frontend matches your PORT
3. Check that server shows "✅ AgriOptima Server running"

## Next Steps

1. ✅ Start backend server
2. ✅ Open `login.html` in browser
3. ✅ Enter phone number
4. ✅ Check terminal for OTP (if Twilio not configured)
5. ✅ Enter OTP to login

## Need Help?

Check `backend/START_SERVER.md` for detailed troubleshooting.
