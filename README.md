# ♻️ Rubbish Revamp — Digital Recycling Marketplace

> **Turn Industrial Scrap Into Business Value**

Rubbish Revamp is a full-stack B2B digital marketplace that connects scrap-supplying businesses with purchasing companies such as recyclers, processors, manufacturers, and scrap traders.

The platform enables businesses to list, discover, request, purchase, and track industrial scrap through a structured digital workflow.

Built as part of **MSME Idea Hackathon 5.0**.

---

## 🖼️ Overview

Traditional industrial scrap trading often depends on informal communication, limited visibility, manual coordination, and a lack of transparent transaction records.

Rubbish Revamp aims to digitize this process by providing:

- Business-oriented scrap listings
- Supplier and buyer accounts
- Structured purchase requests
- Order lifecycle management
- Inventory reservation
- Mock payment workflow
- Fulfillment and delivery tracking
- Supplier verification
- Reviews and ratings
- Notifications
- Administrative controls
- Business profiles and order documentation

The platform is designed around a B2B marketplace model rather than a consumer e-commerce model.

---

## 🎯 Problem Statement

Industrial and manufacturing businesses frequently generate reusable scrap materials such as:

- Metal scrap
- Aluminum
- Copper
- Steel
- Plastic
- Electronic scrap
- Manufacturing waste
- Construction-related scrap
- Other recyclable materials

However, businesses often face challenges such as:

- Difficulty finding suitable buyers or suppliers
- Limited visibility into available scrap
- Manual order and request coordination
- Unclear inventory availability
- Lack of structured transaction records
- Difficulties tracking payment and fulfillment status
- Limited trust indicators between businesses

Rubbish Revamp addresses these challenges through a centralized digital marketplace.

---

## ✨ Key Features

### 🏭 For Scrap Suppliers

Scrap suppliers may include factories, manufacturing units, warehouses, construction businesses, automotive companies, and other scrap-generating organizations.

- Create and manage scrap listings
- Specify scrap material name, category, quantity, price, and condition
- Add structured pickup location details
- Select country, state/UT, district, city, or industrial area
- Add map coordinates for pickup locations
- View incoming buyer requests
- Accept or reject purchase requests
- Manage order fulfillment
- View order and payment statuses
- Maintain a business profile
- Display supplier verification status
- Receive notifications for marketplace activity
- View supplier ratings and buyer reviews

---

### 🏢 For Purchasing Companies

Buyers may include recyclers, processors, manufacturers, scrap traders, and other businesses purchasing recyclable materials.

- Browse available scrap listings
- Search by material name, title, category, location, and description
- Filter listings by category, location, price, and quantity
- Sort listings by newest, price, and available quantity
- View detailed listing information
- View supplier information and verification status
- Submit purchase requests to suppliers
- Specify requested quantity and buyer message
- Make payment after supplier acceptance
- Track order fulfillment and delivery status
- View order receipts and transaction information
- Review suppliers after successful delivery
- Receive notifications for order and payment events

---

### 🛡️ Platform Features

- Role-based access for buyers, suppliers, and administrators
- JWT-based authentication
- Password hashing
- Protected REST APIs
- Request validation
- Supplier verification controlled by administrators
- Inventory reservation and availability tracking
- Order status transition controls
- Mock payment lifecycle
- Fulfillment and delivery workflow
- Order status history
- Buyer-to-supplier review system
- In-app notifications
- Admin dashboard and operational controls
- Dispute management
- Business profile management
- Structured pickup location data
- Interactive pickup location maps
- Printable order receipts
- Server-side marketplace search, filtering, sorting, and pagination

---

## 🔄 Marketplace Workflow

The primary marketplace workflow is:

```text
Supplier creates a scrap listing
            ↓
Buyer browses marketplace
            ↓
Buyer submits a purchase request
            ↓
Supplier accepts or rejects request
            ↓
Buyer completes payment after acceptance
            ↓
Order is confirmed
            ↓
Supplier prepares order for pickup
            ↓
Order moves in transit
            ↓
Order is delivered
            ↓
Buyer can review the supplier
```

---

## 📦 Order Lifecycle

The platform uses controlled order status transitions.

```text
Pending
   ↓
Awaiting Payment
   ↓
Confirmed
   ↓
Ready for Pickup
   ↓
In Transit
   ↓
Delivered
```

Additional business outcomes such as rejection, cancellation, or payment failure are handled according to the implemented order and payment rules.

The backend validates status transitions to prevent invalid workflow changes.

---

## 💳 Payment Workflow

The current implementation contains a **mock payment system** for demonstrating the payment lifecycle.

Payment is available only after the supplier accepts the buyer's request.

```text
Supplier accepts request
          ↓
Order enters awaiting-payment state
          ↓
Buyer initiates mock payment
          ↓
Payment succeeds or fails
          ↓
Successful payment confirms the order
```

### Important Note

This project currently uses a **mock payment workflow** for development and demonstration.

It does not claim to provide a production payment gateway, real escrow service, or real financial settlement.

---

## 📊 Inventory Management

The backend maintains inventory quantities throughout the order lifecycle.

Inventory concepts include:

- Total quantity
- Available quantity
- Reserved quantity
- Fulfilled quantity

The system supports:

- Atomic inventory reservation
- Prevention of overselling
- Inventory release when applicable
- Inventory fulfillment after delivery
- Duplicate-operation protection
- Concurrency-aware inventory handling

Example:

```text
Total Quantity:      1,000 kg
Available Quantity:    600 kg
Reserved Quantity:     300 kg
Fulfilled Quantity:    100 kg
```

The exact quantities depend on the listing and order activity.

---

## ⭐ Reviews and Ratings

The review system is designed around buyer-to-supplier feedback.

### Review Rules

- Only buyers can review suppliers
- A review is allowed after successful delivery
- Reviews are linked to an order
- One review is allowed per order
- Ratings must be between 1 and 5
- Comments are optional
- Comments have a maximum length
- Unauthorized users cannot review unrelated orders
- Users cannot review themselves
- Supplier ratings are calculated from valid buyer reviews

Supplier ratings may be displayed on listing cards, supplier profiles, and order-related views.

---

## 🔔 Notifications

The platform provides in-app notifications for important marketplace events, including:

- New purchase requests
- Request acceptance
- Request rejection
- Payment updates
- Order status changes
- Fulfillment updates
- Delivery completion
- New reviews
- Administrative alerts

The notification system includes notification preferences and duplicate-notification protection for supported events.

---

## 🏢 Business Profiles

Users can maintain business-related profile information.

Supported profile information includes:

- Name
- Company name
- Email
- Phone number
- Country
- State/UT
- City
- Company type
- Company description
- Business-related contact details

The profile experience is role-aware and presents different terminology for scrap suppliers and purchasing companies.

---

## 📍 Pickup Location and Maps

Scrap listings support structured pickup location information.

A listing may include:

- Country
- State/UT
- District
- City, town, or industrial area
- Combined readable location
- Latitude
- Longitude

The platform includes:

- Interactive map location picker for suppliers
- Click-to-select map coordinates
- Draggable map marker
- Browser geolocation support when available
- Read-only map view for buyers
- Coordinate validation
- Fallback location display when coordinates are unavailable

The map functionality uses OpenStreetMap tiles through Leaflet.

---

## 🧾 Order Documentation

The platform includes printable order receipts containing relevant order and business information.

Receipt information may include:

- Order reference
- Order date
- Order status
- Supplier details
- Buyer details
- Listing information
- Quantity
- Price
- Payment status
- Buyer message
- Fulfillment notes

Order receipts are available from buyer and supplier order views where applicable.

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| UI Framework | React |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui and Radix UI |
| Routing | React Router |
| Server State | TanStack React Query |
| Forms | React Hook Form |
| Validation | Zod |
| Icons | Lucide React |
| Charts | Recharts |
| Maps | Leaflet and React Leaflet |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | JavaScript/TypeScript-based backend |
| Database | MySQL 8.0+ |
| Database Client | mysql2 |
| Authentication | JWT-based authentication |
| Password Security | bcrypt/password hashing |
| API Style | RESTful JSON API |
| Schema Changes | Database migration scripts |

### Development and Testing

| Area | Technology / Approach |
|---|---|
| Package Management | npm |
| API Testing | Automated backend test scripts |
| Type Checking | TypeScript compiler |
| Build Validation | Vite production build |
| Database Testing | MySQL integration and regression tests |

---

## 👥 User Roles

| Role | Responsibilities and Access |
|---|---|
| **Supplier** | Create listings, manage scrap inventory, respond to buyer requests, manage fulfillment, view supplier-related orders |
| **Buyer** | Browse listings, submit purchase requests, make payment after acceptance, track orders, review suppliers |
| **Admin** | Manage users, listings, orders, disputes, verification, notifications, and operational platform data |

### Role Terminology

The platform uses business-oriented terminology:

- **Supplier** — A business providing or selling scrap
- **Buyer** — A business purchasing scrap
- **Admin** — An authorized platform administrator

---

## 🔐 Authentication and Authorization

The backend protects application resources through authentication and authorization controls.

Implemented security concepts include:

- User authentication
- Password hashing
- JWT-based access control
- Protected API routes
- Role-based authorization
- Resource ownership checks
- Admin-only endpoints
- Request validation
- Sensitive-field update restrictions
- Controlled supplier verification
- Input allowlisting for supported sorting options

Authentication determines who the user is.

Authorization determines what the user is allowed to do.

---

## 🗄️ Database Design

The application uses MySQL for persistent data storage.

The database contains tables supporting the following major domains:

### User and Business Data

- `users`
- Business profile fields
- Role information
- Supplier verification information
- Contact and location details

### Marketplace Data

- `waste_listings`
- Scrap material information
- Quantity and pricing
- Listing location
- Structured location fields
- Optional latitude and longitude

### Order and Transaction Data

- Orders
- Purchase requests
- Payment information
- Fulfillment information
- Order status history
- Inventory allocation and reservation data

### Engagement and Operations

- Reviews
- Notifications
- Disputes
- Administrative activity and operational records

> Table names and implementation details may evolve as the project continues to develop.

---

## 🧠 Backend Architecture

The backend follows a layered REST API architecture.

```text
Frontend
   ↓
REST API Request
   ↓
Express Routes
   ↓
Authentication / Authorization Middleware
   ↓
Request Validation
   ↓
Controllers
   ↓
Services / Business Logic
   ↓
MySQL Database
   ↓
JSON Response
   ↓
Frontend
```

### Main Backend Concepts Used

- Node.js server runtime
- Express.js routing
- REST API design
- Middleware
- Controllers
- Service-layer business logic
- MySQL queries
- Relational database design
- Database migrations
- Transactions
- Inventory reservation
- Concurrency protection
- State-machine-style order transitions
- Authentication
- Role-based authorization
- Input validation
- Error handling
- Pagination
- Filtering and sorting
- Notifications
- Audit and order history

---

## 🔎 Marketplace Search and Discovery

The marketplace supports server-side discovery features.

### Search Fields

Users can search listings using supported fields such as:

- Scrap material name
- Listing title
- Description
- Category
- Location

### Filters

Supported filters include:

- Category
- Location
- Minimum price
- Maximum price
- Minimum quantity

### Sorting

Supported sorting options include:

- Newest listings
- Price: low to high
- Price: high to low
- Available quantity

### Pagination

Listings are returned using server-side pagination to avoid loading all marketplace records at once.

The backend validates and restricts sorting options to supported values.

---

## 🏗️ Project Structure

The exact structure may evolve, but the project is organized into frontend and backend application areas.

```text
Rubbish-Revamp/
├── frontend/ or client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   ├── data/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   ├── validators/
│   │   ├── config/
│   │   └── database/
│   └── package.json
│
├── README.md
└── other configuration files
```

> Folder names may differ slightly depending on the current repository structure.

---

## 🚀 Getting Started

### Prerequisites

Install the following:

- Node.js 18 or later
- MySQL 8.0 or later
- npm
- Git

---

### Clone the Repository

```bash
git clone https://github.com/Sidhartha-roy104/Scrap-To-Value.git
cd Scrap-To-Value
```

---

### Install Dependencies

Install dependencies for the frontend and backend.

```bash
# Frontend
cd frontend
npm install
```

Open another terminal or return to the project root:

```bash
# Backend
cd backend
npm install
```

> If the repository uses `client` and `server` instead of `frontend` and `backend`, use the actual folder names present in the project.

---

### Configure Environment Variables

Create a `.env` file in the backend directory.

Example configuration:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rubbish_revamp

JWT_SECRET=your_secure_jwt_secret
```

Use the actual environment variable names defined in the backend configuration.

Do not commit real passwords, tokens, or secrets to GitHub.

---

### Set Up MySQL

1. Install and start MySQL.
2. Create the application database.
3. Configure the database credentials in `.env`.
4. Run the available database migrations.
5. Run seed scripts if the project provides them.

Example:

```sql
CREATE DATABASE rubbish_revamp;
```

Migration and setup commands may vary depending on the current backend scripts.

---

### Run the Application

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend and backend URLs depend on the Vite and Express configuration used by the project.

---

## 🧪 Testing and Validation

The project has been developed through feature-based implementation and regression testing.

Validated areas include:

- Inventory reservation
- Mock payment lifecycle
- Fulfillment workflow
- Admin and dispute operations
- Notifications
- Reviews and ratings
- Marketplace search and discovery
- Buyer procurement workflow
- Business profiles
- Order documentation
- Pickup location maps
- Structured listing location
- Supplier verification

Testing has included:

- Automated feature tests
- Regression tests across previously completed phases
- TypeScript checks
- Production build verification
- API and business-rule validation

---

## 🛡️ Security Considerations

The current implementation includes security-oriented controls such as:

- Authentication-protected APIs
- Role-based access control
- Admin-only operations
- Resource ownership checks
- Password hashing
- Input validation
- Restricted sensitive-field updates
- Allowlisted sorting parameters
- Inventory consistency checks
- Controlled order transitions
- Duplicate-operation protection
- Error handling
- Environment-based secret configuration

### Current Scope Disclaimer

This is an actively developed project. It should not be considered a fully audited production financial platform.

Before production deployment, additional work would be required for:

- Production payment gateway integration
- Real escrow or settlement infrastructure
- Comprehensive security auditing
- Rate limiting
- Production logging and monitoring
- Backup and recovery strategy
- Deployment hardening
- Privacy and compliance review
- Comprehensive end-to-end browser testing

---

## 🗺️ Roadmap

Potential future improvements include:

- AI-powered Revamp Assistant for marketplace guidance
- Order-based buyer–supplier messaging
- Production payment gateway integration
- Advanced analytics
- Improved admin reporting
- Document upload support
- Enhanced search and recommendation features
- Production deployment
- Monitoring and observability
- Additional business verification workflows

Future features will be added incrementally based on project requirements.

---

## 🏆 Hackathon

Built for:

**MSME Idea Hackathon 5.0**

### Theme

Digital solutions for Indian MSME growth

### Category

B2B Marketplace / Recycling / Industrial Digitalization

---

## 👨‍💻 Author

**Sidhartha Rachakonda**

B.Tech CSE  
Institute of Aeronautical Engineering, Hyderabad

- GitHub: [Sidhartha-roy104](https://github.com/Sidhartha-roy104)
- LinkedIn: [Sidhartha Rachakonda](https://www.linkedin.com/in/sidhartha-rachakonda-8511692b1)

---

## 📄 License

This project is open source and available under the MIT License.

---



<p align="center">
  <strong>Rubbish Revamp — Turn Scrap Into Business Value</strong>
</p>
