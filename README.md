# ♻️ Rubbish Revamp — Digital Recycling Marketplace

> **Turn Your Factory Scrap Into Real Revenue**  
> A full-stack digital marketplace connecting MSME scrap sellers with verified buyers across India — with secure escrow payments, AI-powered matching, and real-time pricing.

---

## 🖼️ Overview

**Scrap to Value** (Rubbish Revamp) is a production-grade B2B web platform built for Indian MSMEs to buy and sell industrial scrap digitally. It eliminates the inefficiencies of informal scrap trading by providing a transparent, verified, and secure marketplace — fully designed for the Indian industrial ecosystem.

Built as part of **MSME Idea Hackathon 5.0**.

---

## 🎯 Problem Statement

Every year, thousands of Indian MSMEs lose revenue on scrap because:

- No visibility into fair market prices — sellers undersell without knowing
- Buyers and sellers rely on informal middlemen with no accountability
- Payments are risky — no protection against fraud or quantity disputes
- No digital record of transactions for GST or business reporting

**Scrap to Value solves all of this.**

---

## ✨ Key Features

### For Sellers (MSMEs / Factories)
- 📋 List scrap by type, quantity, condition, and location
- 💰 View real-time market prices before setting your rate
- 🤝 Get matched with verified buyers automatically
- 🔒 Receive payment via Escrow — zero payment risk
- 📊 Analytics dashboard to track earnings and listing performance

### For Buyers (Dealers / Recyclers)
- 🔍 Browse 500+ live listings with advanced filters
- 🛒 Place orders or make offers directly on the platform
- 🚚 Track orders from placement to delivery
- ✅ Confirm delivery via OTP — payment released only after confirmation
- 🤖 AI-powered match recommendations based on purchase history (Premium)

### Platform Features
- 🔐 KYC verification for all buyers and sellers
- 💳 Escrow payment system — funds held until delivery confirmed
- 🧾 Auto-generated invoices and weighment slip downloads
- 💬 In-platform messaging between buyers and sellers
- 📢 Real-time notifications for orders, payments, and messages
- ⭐ Review and rating system post-delivery
- 🛡️ Dispute resolution managed by admin

---

## 🛠️ Tech Stack

### Current Implementation
| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript 5.8, Vite 5.4 (SWC) |
| **Styling** | Tailwind CSS v3, shadcn/ui (Radix UI), Framer Motion |
| **Routing** | React Router DOM v6 |
| **State / Data** | TanStack React Query v5, React Context API |
| **Forms** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Backend (current)** | Supabase (PostgreSQL BaaS + Auth + Realtime + Storage) |
| **Charts** | Recharts |
| **Themes** | next-themes (Dark/Light mode) |

### Target Architecture (Node.js Migration — In Progress)
| Layer | Technology |
|---|---|
| **Backend** | Node.js 18+ + Express.js |
| **Database** | MySQL 8.0 |
| **DB Client** | mysql2/promise |
| **Auth** | JWT + bcrypt |
| **API** | RESTful JSON API |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Seller** | Post listings, manage orders, view payments, access analytics |
| **Buyer** | Browse marketplace, place orders, track delivery, manage payments |
| **Admin** | Manage users, listings, disputes, escrow, platform settings |

---

## 📄 Pages & Modules

```
/ ...................... Landing Page (public)
/auth .................. Login & Registration (Seller / Buyer)
/marketplace ........... Browse all scrap listings
/marketplace/:id ....... Individual listing detail + order
/seller/dashboard ...... Seller home with KPIs and activity
/seller/post-scrap ..... Multi-step listing creation wizard
/seller/listings ....... Manage all posted listings
/seller/payments ....... Earnings, escrow, withdrawals
/seller/analytics ...... Premium analytics dashboard
/buyer/dashboard ....... Buyer home with recommendations
/buyer/orders .......... Order history and tracking
/buyer/payments ........ Spend summary and escrow status
/order/checkout/:id .... 3-step escrow checkout flow
/orders/:id ............ Order tracking and delivery confirmation
/messages .............. In-platform buyer-seller chat
/notifications ......... Notification center
/premium ............... Premium plan details and upgrade
/premium/ai-match ...... AI matching and dynamic pricing tool
/profile ............... Profile, KYC, bank, security settings
/reviews ............... Ratings received and given
/help .................. FAQs and support ticket submission
/admin/dashboard ....... Admin control panel
```

---

## 🗄️ Database Design

### Core Tables (MySQL)
- `users` — all platform users with role, KYC status, contact info
- `listings` — scrap listings with category, quantity, price, location
- `orders` — order lifecycle from placement to delivery
- `escrow_transactions` — payment hold, release, and refund records
- `reviews` — post-delivery ratings and comments
- `disputes` — raised issues with resolution history

### Collections (MongoDB)
- `messages` — real-time chat between buyers and sellers
- `notifications` — event-based notification logs
- `activity_logs` — audit trail for admin and analytics

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- MongoDB 6.0+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Sidhartha-roy104/Scrap-To-Value.git
cd Scrap-To-Value

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### Environment Setup

Create a `.env` file in `/server`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=scrap_to_value
MONGO_URI=mongodb://localhost:27017/scrap_to_value
JWT_SECRET=your_jwt_secret
```

### Run the App

```bash
# Start backend
cd server
npm run dev

# Start frontend (new terminal)
cd client
npm start
```

App runs at `http://localhost:3000`

---

## 📸 Screenshots

> Dashboard, Marketplace, and Order Tracking views

| Landing Page | Marketplace | Seller Dashboard |
|---|---|---|
| *(screenshot)* | *(screenshot)* | *(screenshot)* |

---

## 🏗️ Project Structure

```
Scrap-To-Value/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # All 20 route-based pages
│   │   ├── context/         # Auth and global state
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   └── assets/          # Icons, images, SVGs
├── server/                  # Node.js backend
│   ├── routes/              # API route handlers
│   ├── controllers/         # Business logic
│   ├── models/              # DB models (MySQL + Mongo)
│   ├── middleware/          # Auth, role guards, validation
│   └── config/              # DB connections, env config
├── database/
│   ├── schema.sql           # MySQL schema
│   └── seed.sql             # Sample data (Indian MSMEs)
└── README.md
```

---

## 🔒 Security Features

- JWT authentication with role-based route protection
- KYC verification before any transaction
- Escrow payment — funds never go directly to seller until delivery confirmed
- OTP-based delivery confirmation
- Admin dispute resolution system
- Input validation and SQL injection prevention

---

## 🏆 Hackathon

Built for **MSME Idea Hackathon 5.0**  
Theme: Digital solutions for Indian MSME growth  
Category: B2B Marketplace / FinTech

---

## 👨‍💻 Author

**Sidhartha Rachakonda**  
B.Tech CSE — Institute of Aeronautical Engineering, Hyderabad  
[GitHub](https://github.com/Sidhartha-roy104) | [LinkedIn](https://www.linkedin.com/in/sidhartha-rachakonda-8511692b1)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with ♻️ for MSMEs | Rubbish Revamp — Turn Your Scrap Into Value*