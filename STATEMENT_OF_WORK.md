# STATEMENT OF WORK (SOW)
## UAD-Based Invoicing Application Migration
### From Zoho Creators to Full-Stack Solution

---

## 1. PROJECT OVERVIEW

### 1.1 Project Title
**UAD-Based Invoicing Application Migration and Enhancement**

### 1.2 Project Description
This project involves migrating a sophisticated User Acceptance Document (UAD) based invoicing application from Zoho Creators to a custom full-stack solution. The application manages complex billing cycles, factory allocations, and automated invoice generation with prorated calculations based on UAD periods.

### 1.3 Business Justification
- **Zoho Creators Limitations**: Current platform lacks advanced date calculation capabilities and complex database relationship management required for the business logic
- **Custom Requirements**: Need for sophisticated proration algorithms, flexible billing cycles, and seamless Zoho Books integration
- **Scalability**: Full-stack solution provides better performance, customization, and future scalability

---

## 2. CURRENT SYSTEM ANALYSIS

### 2.1 Existing Application Features
Based on analysis of the current codebase, the application includes:

#### Core Entities:
- **Sales Orders**: Root records fetched from Zoho Books with custom fields for billing configuration
- **Factories**: Allocations per Sales Order with product quantity distributions
- **UADs (User Acceptance Documents)**: Time-bound service delivery periods with specific line items
- **Invoices**: Generated per UAD per billing cycle with complex proration calculations

#### Key Functionality:
- **Zoho Books Integration**: Automated fetching of sales orders and invoice creation
- **Complex Date Calculations**: Support for monthly, quarterly, half-yearly, and yearly billing cycles
- **Proration Logic**: Sophisticated algorithms for partial period billing
- **Factory Allocation Management**: Hierarchical product quantity distribution
- **User Authentication**: JWT-based authentication system
- **Database Relationships**: Complex relational data model with proper constraints

### 2.2 Technical Stack (Current)
- **Frontend**: Next.js 15.5.2 with React 19.1.0
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcryptjs
- **External Integration**: Zoho Books API
- **Styling**: Tailwind CSS 4

---

## 3. PROJECT SCOPE

### 3.1 In-Scope Items

#### 3.1.1 Core Application Features
1. **Sales Order Management**
   - Import sales orders from Zoho Books
   - Parse custom fields for billing configuration
   - Manage line items and product allocations

2. **Factory Management**
   - Create and manage factory allocations
   - Distribute product quantities across factories
   - Track allocation constraints and validations

3. **UAD Management**
   - Create User Acceptance Documents with time periods
   - Link UADs to specific factories and sales orders
   - Manage UAD line items and quantities

4. **Invoice Generation**
   - Automated invoice calculation based on UAD periods
   - Complex proration algorithms for partial periods
   - Support for multiple billing cycles (monthly, quarterly, half-yearly, yearly)
   - Integration with Zoho Books for invoice creation

5. **User Interface**
   - Modern, responsive web interface
   - Dashboard with sales order overview
   - Detailed views for factories, UADs, and invoices
   - Form-based data entry with validation

6. **Authentication & Authorization**
   - User registration and login
   - JWT-based session management
   - Role-based access control (if required)

#### 3.1.2 Technical Implementation
1. **Database Design**
   - Complete Prisma schema implementation
   - Proper relationships and constraints
   - Data migration scripts

2. **API Development**
   - RESTful API endpoints for all entities
   - Zoho Books integration endpoints
   - Error handling and validation

3. **Frontend Development**
   - React components for all features
   - Form handling and validation
   - Responsive design implementation

4. **Integration**
   - Zoho Books API integration
   - OAuth token management
   - Automated invoice synchronization

### 3.2 Out-of-Scope Items
1. **Mobile Application**: Native mobile apps (responsive web only)
2. **Advanced Reporting**: Complex analytics and reporting features
3. **Multi-tenant Architecture**: Single-tenant solution
4. **Third-party Integrations**: Beyond Zoho Books
5. **Advanced Security Features**: Basic authentication only
6. **Performance Optimization**: Basic optimization only

---

## 4. TECHNICAL REQUIREMENTS

### 4.1 Functional Requirements

#### 4.1.1 Date Calculation Engine
- **Billing Cycle Support**:
  - Monthly (with configurable billing day)
  - Quarterly (Mar 31, Jun 30, Sep 30, Dec 31)
  - Half-Yearly (Jun 30, Dec 31)
  - Yearly (12 months from SO start)

- **Proration Logic**:
  - Inclusive day counting
  - Fractional quantity calculations
  - Half-up rounding to 2 decimal places
  - Support for partial periods

#### 4.1.2 Business Rules
- **Allocation Constraints**:
  - Σ(Factory allocations) ≤ SO quantity
  - Σ(UAD quantity in factory) ≤ factory allocation
  - Σ(UAD quantity across factories) ≤ SO quantity

- **Invoice Rules**:
  - One invoice per UAD per cycle
  - Rates sourced from SO products
  - Full cycle = full rate
  - Partial cycle = prorated by days

#### 4.1.3 Integration Requirements
- **Zoho Books API**:
  - Sales order fetching
  - Invoice creation (draft mode)
  - Custom field mapping
  - Token refresh management

### 4.2 Non-Functional Requirements

#### 4.2.1 Performance
- **Response Time**: API responses < 2 seconds
- **Concurrent Users**: Support for 10+ concurrent users
- **Data Volume**: Handle 1000+ sales orders, 5000+ invoices

#### 4.2.2 Security
- **Authentication**: JWT-based authentication
- **Data Protection**: Password hashing with bcryptjs
- **API Security**: Input validation and sanitization

#### 4.2.3 Usability
- **User Interface**: Intuitive, modern web interface
- **Responsive Design**: Mobile-friendly layout
- **Error Handling**: Clear error messages and validation

---

## 5. DELIVERABLES

### 5.1 Code Deliverables
1. **Complete Source Code**
   - Frontend React components
   - Backend API routes
   - Database schema and migrations
   - Configuration files

2. **Documentation**
   - Technical documentation
   - API documentation
   - User manual
   - Deployment guide

3. **Database**
   - Prisma schema file
   - Migration scripts
   - Seed data (if applicable)

### 5.2 Deployment Deliverables
1. **Production Environment Setup**
   - Database configuration
   - Environment variables setup
   - Zoho API credentials configuration

2. **Testing**
   - Unit tests for critical functions
   - Integration tests for API endpoints
   - User acceptance testing

---

## 6. PROJECT TIMELINE

### 6.1 Development Phases

#### Phase 1: Foundation (Week 1-2)
- Database schema finalization
- Authentication system implementation
- Basic API structure setup
- Zoho Books integration foundation

#### Phase 2: Core Features (Week 3-5)
- Sales Order management
- Factory allocation system
- UAD management
- Basic invoice calculation

#### Phase 3: Advanced Features (Week 6-7)
- Complex date calculation engine
- Proration algorithms
- Zoho Books invoice creation
- Error handling and validation

#### Phase 4: Frontend Development (Week 8-9)
- User interface implementation
- Form handling and validation
- Dashboard and reporting views
- Responsive design

#### Phase 5: Testing & Deployment (Week 10)
- Comprehensive testing
- Bug fixes and optimization
- Production deployment
- User training and documentation

### 6.2 Milestones
- **Week 2**: Database and authentication complete
- **Week 5**: Core business logic implemented
- **Week 7**: Advanced calculations and integrations complete
- **Week 9**: Frontend development complete
- **Week 10**: Production deployment and handover

---

## 7. ASSUMPTIONS AND DEPENDENCIES

### 7.1 Assumptions
1. **Zoho Books Access**: Client has valid Zoho Books account with API access
2. **Database Hosting**: Client will provide PostgreSQL database hosting
3. **Domain and Hosting**: Client will provide domain and hosting for the application
4. **User Requirements**: Client will provide detailed user requirements and feedback
5. **Testing Data**: Client will provide test data for development and testing

### 7.2 Dependencies
1. **Zoho Books API**: Availability and stability of Zoho Books API
2. **Client Availability**: Client availability for requirements clarification and testing
3. **Third-party Services**: Reliance on external services (Zoho, hosting providers)

---

## 8. RISK ASSESSMENT

### 8.1 Technical Risks
1. **Zoho API Limitations**: Changes in Zoho Books API may affect functionality
   - *Mitigation*: Implement robust error handling and API versioning

2. **Complex Date Calculations**: Edge cases in date calculations may cause issues
   - *Mitigation*: Extensive testing with various date scenarios

3. **Database Performance**: Complex queries may impact performance
   - *Mitigation*: Database optimization and indexing

### 8.2 Project Risks
1. **Scope Creep**: Additional requirements may extend timeline
   - *Mitigation*: Clear scope definition and change management process

2. **Client Availability**: Delays in client feedback may impact timeline
   - *Mitigation*: Regular communication and milestone reviews

---

## 9. SUCCESS CRITERIA

### 9.1 Functional Success Criteria
1. **Complete Migration**: All existing functionality migrated successfully
2. **Zoho Integration**: Seamless integration with Zoho Books
3. **Calculation Accuracy**: 100% accuracy in invoice calculations
4. **User Experience**: Intuitive and efficient user interface

### 9.2 Technical Success Criteria
1. **Performance**: Application meets performance requirements
2. **Reliability**: 99% uptime and error-free operation
3. **Security**: Secure authentication and data protection
4. **Maintainability**: Well-documented and maintainable codebase

---

## 10. POST-DEPLOYMENT SUPPORT

### 10.1 Support Period
- **30 days** of post-deployment support included
- Bug fixes and minor adjustments
- User training and documentation updates

### 10.2 Ongoing Maintenance
- Additional support available on hourly basis
- Feature enhancements and modifications
- Performance optimization and updates

---

## 11. TERMS AND CONDITIONS

### 11.1 Payment Terms
- **Hourly Rate**: $75/hour for senior developer
- **Payment Schedule**: Weekly invoicing based on hours worked
- **Payment Method**: Bank transfer or digital payment

### 11.2 Intellectual Property
- Client retains ownership of business logic and requirements
- Developer retains rights to generic code patterns and frameworks
- Source code delivered to client upon final payment

### 11.3 Confidentiality
- All project information treated as confidential
- Non-disclosure agreement applies
- Client data protection guaranteed

---

**Document Version**: 1.0  
**Date**: January 2025  
**Prepared By**: Senior Developer  
**Client**: [Client Name]  
**Project Duration**: 10 weeks (estimated)  
**Total Estimated Hours**: 400-500 hours

