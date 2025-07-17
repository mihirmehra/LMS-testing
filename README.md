# RealEstate CRM - Lead Management System

A comprehensive real estate lead management and analytics platform built with Next.js, MongoDB, and modern web technologies.

## Features

### 🏠 Lead Management
- Complete lead lifecycle management
- Advanced filtering and search capabilities
- Lead assignment and tracking
- Activity timeline and notes
- Import/export functionality

### 📊 Analytics & Reporting
- Real-time dashboard metrics
- Lead source analysis
- Agent performance tracking
- Conversion funnel visualization
- Exportable reports

### 📅 Calendar Integration
- **Updated Google Calendar Integration** using Google Identity Services (GIS)
- Meeting scheduling and management
- Automated reminders
- Event synchronization

### 💬 Communication Tools
- WhatsApp integration with templates
- Email communication tracking
- Activity logging
- Communication history

### 👥 User Management
- Role-based access control (Admin/Agent)
- User permissions and security
- Profile management
- Team collaboration

### 🔔 Notifications
- Real-time notifications
- Push notification support
- Email alerts
- Task reminders

## Technology Stack

- **Frontend**: Next.js 13, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes, Node.js
- **Database**: MongoDB with connection pooling
- **Authentication**: JWT with bcrypt
- **Calendar**: Google Calendar API with Google Identity Services
- **Charts**: Recharts
- **Icons**: Lucide React

## Google Calendar Integration Update

This project has been updated to use the **new Google Identity Services (GIS)** library, replacing the deprecated Google Sign-In JavaScript library. The integration now:

- Uses `https://accounts.google.com/gsi/client` for authentication
- Implements OAuth 2.0 token client for secure access
- Provides proper token management and revocation
- Ensures compliance with Google's latest security standards

### Migration Benefits
- ✅ Complies with Google's latest authentication standards
- ✅ Enhanced security with proper token management
- ✅ Future-proof implementation
- ✅ Better error handling and user experience

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Google Cloud Console project with Calendar API enabled

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/realestate_crm

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google Calendar Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

### Default Users

The system comes with default users for testing:

- **Admin**: admin@realestate.com / admin123
- **Agent**: agent@realestate.com / agent123

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your domain to authorized origins
6. Copy the Client ID and API Key to your `.env` file

## Database Schema

The application uses MongoDB with the following collections:
- `users` - User accounts and authentication
- `leads` - Lead information and tracking
- `agents` - Agent profiles (linked to users)
- `notifications` - System notifications
- `communication_activities` - Communication logs
- `calendar_events` - Calendar events and meetings
- `whatsapp_messages` - WhatsApp communication logs

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting (configurable)

## Performance Optimizations

- MongoDB connection pooling
- Efficient data fetching with proper indexing
- Client-side caching
- Optimized bundle splitting
- Image optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.
```
project
├─ .eslintrc.json
├─ app
│  ├─ admin
│  │  ├─ leads
│  │  │  └─ page.tsx
│  │  └─ users
│  │     └─ page.tsx
│  ├─ analytics
│  │  └─ page.tsx
│  ├─ api
│  │  ├─ agents
│  │  │  └─ route.ts
│  │  ├─ auth
│  │  │  ├─ change-password
│  │  │  │  └─ route.ts
│  │  │  ├─ google
│  │  │  │  ├─ connect
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ disconnect
│  │  │  │     └─ route.ts
│  │  │  ├─ login
│  │  │  │  └─ route.ts
│  │  │  ├─ logout
│  │  │  │  └─ route.ts
│  │  │  ├─ me
│  │  │  │  └─ route.ts
│  │  │  ├─ profile
│  │  │  │  └─ route.ts
│  │  │  └─ register
│  │  │     └─ route.ts
│  │  ├─ communications
│  │  │  ├─ activities
│  │  │  │  └─ route.ts
│  │  │  ├─ calendar
│  │  │  │  ├─ route.ts
│  │  │  │  └─ [id]
│  │  │  │     └─ route.ts
│  │  │  └─ whatsapp
│  │  │     └─ route.ts
│  │  ├─ leads
│  │  │  ├─ import
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     ├─ activities
│  │  │     │  └─ route.ts
│  │  │     └─ route.ts
│  │  ├─ notifications
│  │  │  ├─ devices
│  │  │  │  ├─ route.ts
│  │  │  │  └─ [id]
│  │  │  │     └─ route.ts
│  │  │  ├─ mark-all-read
│  │  │  │  └─ route.ts
│  │  │  ├─ push
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     ├─ read
│  │  │     │  └─ route.ts
│  │  │     └─ route.ts
│  │  └─ users
│  │     ├─ route.ts
│  │     └─ [id]
│  │        └─ route.ts
│  ├─ calendar
│  │  └─ page.tsx
│  ├─ cold
│  │  └─ page.tsx
│  ├─ communications
│  │  └─ page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ leads
│  │  ├─ page.tsx
│  │  └─ [id]
│  │     └─ page.tsx
│  ├─ login
│  │  └─ page.tsx
│  ├─ notifications
│  │  └─ page.tsx
│  ├─ page.tsx
│  ├─ profile
│  │  └─ page.tsx
│  ├─ register
│  │  └─ page.tsx
│  ├─ reports
│  │  └─ page.tsx
│  └─ unauthorized
│     └─ page.tsx
├─ components
│  ├─ admin
│  │  └─ LeadAssignment.tsx
│  ├─ analytics
│  │  ├─ ActivityReportChart.tsx
│  │  ├─ AgentPerformanceChart.tsx
│  │  ├─ AnalyticsDashboard.tsx
│  │  ├─ ConversionFunnelChart.tsx
│  │  └─ LeadSourceChart.tsx
│  ├─ auth
│  │  ├─ LoginForm.tsx
│  │  ├─ ProtectedRoute.tsx
│  │  ├─ RegisterForm.tsx
│  │  └─ UserProfile.tsx
│  ├─ communication
│  │  ├─ CalendarEventModal.tsx
│  │  ├─ CommunicationPanel.tsx
│  │  └─ WhatsAppModal.tsx
│  ├─ dashboard
│  │  └─ DashboardMetrics.tsx
│  ├─ layout
│  │  ├─ ClientLayout.tsx
│  │  ├─ Layout.tsx
│  │  └─ Sidebar.tsx
│  ├─ leads
│  │  ├─ AddLeadModal.tsx
│  │  ├─ LeadCard.tsx
│  │  ├─ LeadExportModal.tsx
│  │  ├─ LeadFilters.tsx
│  │  ├─ LeadImportModal.tsx
│  │  ├─ LeadNotesModal.tsx
│  │  ├─ LeadProfile.tsx
│  │  └─ LeadTasksModal.tsx
│  ├─ notifications
│  │  ├─ NotificationBell.tsx
│  │  ├─ NotificationCenter.tsx
│  │  ├─ NotificationToast.tsx
│  │  └─ PushNotificationSettings.tsx
│  └─ ui
│     ├─ accordion.tsx
│     ├─ alert-dialog.tsx
│     ├─ alert.tsx
│     ├─ aspect-ratio.tsx
│     ├─ avatar.tsx
│     ├─ badge.tsx
│     ├─ breadcrumb.tsx
│     ├─ button.tsx
│     ├─ calendar.tsx
│     ├─ card.tsx
│     ├─ carousel.tsx
│     ├─ chart.tsx
│     ├─ checkbox.tsx
│     ├─ collapsible.tsx
│     ├─ command.tsx
│     ├─ context-menu.tsx
│     ├─ dialog.tsx
│     ├─ drawer.tsx
│     ├─ dropdown-menu.tsx
│     ├─ form.tsx
│     ├─ hover-card.tsx
│     ├─ input-otp.tsx
│     ├─ input.tsx
│     ├─ label.tsx
│     ├─ menubar.tsx
│     ├─ navigation-menu.tsx
│     ├─ pagination.tsx
│     ├─ popover.tsx
│     ├─ progress.tsx
│     ├─ radio-group.tsx
│     ├─ resizable.tsx
│     ├─ scroll-area.tsx
│     ├─ select.tsx
│     ├─ separator.tsx
│     ├─ sheet.tsx
│     ├─ skeleton.tsx
│     ├─ slider.tsx
│     ├─ sonner.tsx
│     ├─ switch.tsx
│     ├─ table.tsx
│     ├─ tabs.tsx
│     ├─ textarea.tsx
│     ├─ toast.tsx
│     ├─ toaster.tsx
│     ├─ toggle-group.tsx
│     ├─ toggle.tsx
│     └─ tooltip.tsx
├─ components.json
├─ hooks
│  ├─ use-toast.ts
│  ├─ useAgents.ts
│  ├─ useAuth.tsx
│  ├─ useLeads.ts
│  └─ useNotifications.ts
├─ lib
│  ├─ analyticsService.ts
│  ├─ api
│  │  ├─ agents.ts
│  │  ├─ communications.ts
│  │  ├─ leads.ts
│  │  ├─ notifications.ts
│  │  └─ users.ts
│  ├─ auth.ts
│  ├─ googleCalendar.ts
│  ├─ mockData.ts
│  ├─ mongodb.ts
│  ├─ permissions.ts
│  ├─ pushNotifications.ts
│  ├─ utils.ts
│  └─ whatsappService.ts
├─ next.config.js
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ favicon.png
│  └─ sw.js
├─ README copy.md
├─ README.md
├─ tailwind.config.ts
├─ tsconfig.json
└─ types
   ├─ analytics.ts
   ├─ auth.ts
   ├─ communication.ts
   ├─ lead.ts
   └─ notification.ts

```