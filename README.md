# UAD-Based Invoicing Application

A comprehensive invoicing application that manages User Acceptance Documents (UADs) and generates prorated invoices based on billing cycles. Built with Next.js, React, Tailwind CSS, Prisma ORM, and integrated with Zoho Books API.

## 🚀 Features

- **Sales Order Management**: Fetch and manage sales orders from Zoho Books
- **Factory Allocations**: Create and manage factory allocations for products
- **UAD Management**: Handle User Acceptance Documents with date-based tracking
- **Smart Invoicing**: Generate prorated invoices based on billing cycles
- **Zoho Integration**: Seamless integration with Zoho Books for invoice creation
- **Authentication**: Secure user authentication with JWT tokens
- **Responsive UI**: Modern, mobile-friendly interface built with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 6
- **Authentication**: JWT with bcrypt
- **API Integration**: Zoho Books API
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Supabase)
- Zoho Books account with API access
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd my-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Zoho Books API
ZOHO_CLIENT_ID="your_zoho_client_id"
ZOHO_CLIENT_SECRET="your_zoho_client_secret"
ZOHO_REFRESH_TOKEN="your_zoho_refresh_token"
ZOHO_ORGANIZATION_ID="your_zoho_organization_id"
ZOHO_API_DOMAIN="https://www.zohoapis.in"

# Optional: Custom Field IDs for Factory and UAD
ZOHO_FACTORY_CUSTOM_FIELD_ID="2031676000008612118"
ZOHO_UAD_CUSTOM_FIELD_ID="2031676000008612122"
```

### 4. Database Setup

Generate and run Prisma migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Sales Orders
- `GET /api/salesorders/[id]` - Fetch SO from Zoho and store locally

### Factories
- `POST /api/factories` - Create factory with allocations

### UADs
- `POST /api/uads` - Create UAD and generate invoices

### Invoices
- `POST /api/invoices` - Push local invoice to Zoho

## 🏗️ Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users**: Authentication and user management
- **SalesOrders**: Root records from Zoho Books
- **SOProducts**: Line items within sales orders
- **Factories**: Allocations per sales order
- **FactoryAllocations**: Product allocations per factory
- **UADs**: User acceptance documents
- **UADLineItems**: Line items within UADs
- **Invoices**: Generated invoices per UAD per cycle
- **InvoiceLineItems**: Detailed invoice line items

## 💰 Billing Logic

### Core Rules
- SO window: `SO.StartDate ≤ UAD.StartDate ≤ UAD.EndDate ≤ SO.EndDate`
- Allocations: Σ(Factory allocations) ≤ SO qty
- One invoice per UAD per cycle
- Rates come from SO products
- Full cycle = full rate, Partial cycle = prorated by days

### Billing Cycles
- **Monthly**: Ends on billing day (or last day if month shorter)
- **Quarterly**: Mar 31, Jun 30, Sep 30, Dec 31
- **Half-Yearly**: Jun 30, Dec 31
- **Yearly**: 12 months from SO start

### Proration Formula
```
Fraction = ActiveDays / DaysInMonth
MonthAmount = FullMonthAmount × Fraction
```

## 🔧 Configuration

### Zoho Books Setup

1. Create a Zoho Books account
2. Generate OAuth credentials (Client ID, Client Secret)
3. Get refresh token and organization ID
4. Configure custom fields for Factory and UAD tracking

### Database Configuration

The application supports PostgreSQL databases. For Supabase:

1. Create a new Supabase project
2. Get your database connection string
3. Update `DATABASE_URL` in your environment file

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 📱 Usage

### 1. User Registration/Login
- Create an account or sign in
- Access the dashboard

### 2. Sales Order Management
- Fetch sales orders from Zoho using SO ID
- View line items and customer details

### 3. Factory Setup
- Create factories for different locations
- Allocate products and quantities

### 4. UAD Creation
- Create User Acceptance Documents
- Set start and end dates
- Select factory and products

### 5. Invoice Generation
- Automatic invoice generation based on billing cycles
- Prorated calculations for partial periods
- Push to Zoho Books

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the API specifications
- Open an issue on GitHub

## 🔮 Roadmap

- [ ] Advanced reporting and analytics
- [ ] Bulk operations
- [ ] Email notifications
- [ ] Mobile app
- [ ] Multi-tenant support
- [ ] Advanced billing rules
- [ ] Integration with other accounting systems

---

Built with ❤️ using Next.js and modern web technologies.
