# STRATEGIA Connect

Networking app for STRATEGIA'26 - Loyola College Chennai

## 🚀 Quick Deploy to Vercel (Recommended - 5 minutes) |

### Step 1: Push to GitHub
1. Create a new repo on GitHub (e.g., `strategia-connect`)
2. Upload all these files to the repo

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `strategia-connect` repo
5. Click "Deploy"
6. Wait ~2 minutes - DONE! 🎉

Your app will be live at: `https://strategia-connect.vercel.app`

---

## 📁 Project Structure

```
strategia-connect/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   ├── App.js          ← Main app code
│   └── firebase.js     ← Firebase config
├── package.json
└── README.md
```

## 🔥 Firebase Setup (Already Done!)

Your Firebase project: `strategiaconnect-10753`

### To add participants:
1. Go to Firebase Console → Firestore Database
2. You can view all data there in real-time

### Collections:
- `profiles` - All user profiles
- `announcements` - Admin announcements
- `feedbacks` - User feedback
- `users/{userId}/connections` - User connections
- `users/{userId}/sentRequests` - Sent requests
- `users/{userId}/receivedRequests` - Received requests

---

## 🔐 Admin Access

Password: `VanshuDogu`

Admin features:
- View all users
- Post announcements
- View feedback
- Generate reports
- Export data to Excel

---

## 📝 Adding Real Participants

Edit `src/App.js` and find the `allowlist` array (around line 175):

```javascript
const allowlist = [
  { email: 'student1@college.edu', phone: '+919876543210', name: 'Student Name' },
  { email: 'student2@college.edu', phone: '+919876543211', name: 'Another Student' },
  // Add more...
];
```

---

## 🛠 Local Development

```bash
npm install
npm start
```

Opens at http://localhost:3000

---

## 📱 Features

- ✅ User registration with phone verification
- ✅ Profile creation with interests
- ✅ Connection requests (send/accept/decline)
- ✅ Real-time sync via Firebase
- ✅ Admin dashboard
- ✅ Announcements
- ✅ Event feedback
- ✅ Export to Excel
- ✅ WhatsApp integration
- ✅ Mobile-first design

---

## Need Help?

Contact the developer or check Firebase Console for data issues.
