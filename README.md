# Gada Events
### A Digital Platform for Managing Local Events and Participant Registration

[![React](https://img.shields.io/badge/React-19.2.8-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24.21.0-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3.0-lightgrey)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.2-purple)](https://vite.dev/)

**Project Type:** Individual Final-Year Software Engineering Capstone  
**Institution:** African Leadership University  
**Project Scope:** Kigali, Rwanda  
**Developer:** Kethia Karangwa  
**Repository:** https://github.com/kkarangwa/local-events-platform

---

## 1. Project Overview

Gada Events is a web-based platform developed to simplify local event management and participant registration in Kigali, Rwanda.

The platform addresses challenges associated with event organization, event discovery, participant registration and attendance management. It provides a centralized digital environment where event organizers can create and manage events while participants can discover events, register and manage their participation.

The application supports three primary user roles:

- **Participants:** Discover events, register for events and manage their registrations.
- **Event Organizers:** Create, publish and manage events, monitor registrations and manage attendance.
- **Administrators:** Manage users, events and administrative activities.

Gada Events also includes a Recommended Events feature that provides participants with event suggestions based on their selected interests.

### Project Objectives

The main objective is to develop and implement a digital platform that streamlines local event organization and participant registration.

The specific objectives are to:

1. Provide a centralized platform for discovering local events.
2. Enable organizers to create, publish and manage events.
3. Simplify participant registration and registration management.
4. Support organizers in monitoring registrations and attendance.
5. Provide administrative functionality for managing platform activities.
6. Improve event discovery through interest-based recommendations.

## 2. Key Features

### 2.1 Participant Features

- User account registration and authentication.
- Browse published events.
- Search and filter available events.
- View detailed event information.
- Register for available events.
- Cancel registrations where permitted.
- View registered events through a participant dashboard.
- Receive appropriate feedback during registration.
- Discover recommended events based on selected interests.

### 2.2 Event Organizer Features

- Organizer account authentication.
- Create new events.
- Provide event titles, descriptions, dates, times, venues and capacity.
- Edit and update event information.
- Publish events.
- Update or cancel events.
- View registered participants.
- Monitor registration numbers.
- Manage participant attendance.

### 2.3 Administrator Features

- Access administrative functionality.
- View and manage registered users.
- View and manage events.
- Manage inappropriate events and reported content.
- Support general platform administration.

### 2.4 System Features

- Authentication and role-based access control.
- Password hashing using bcrypt.
- JWT-based authentication.
- Duplicate registration prevention.
- Event capacity validation.
- Persistent database storage.
- Input validation and error handling.
- Interest-based event recommendations.

## 3. Technology Stack

Gada Events uses a client-server architecture consisting of a frontend, backend and relational database.

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React 19.2.8 | User interface |
| Build tool | Vite 8.3.2 | Development and production builds |
| Routing | React Router DOM 7.18.4 | Application navigation |
| Backend | Node.js 24.21.0 | Server-side runtime |
| Backend framework | Express 5.3.0 | REST API and request handling |
| Database | PostgreSQL | Persistent data storage |
| Database integration | pg 8.23.1 | PostgreSQL connectivity |
| Authentication | jsonwebtoken 9.0.3 | JWT authentication |
| Password security | bcrypt 6.0.0 | Password hashing |
| Environment configuration | dotenv 18.0.7 | Environment variables |
| API middleware | cors 2.8.6 | Cross-origin resource sharing |
| Development tool | Nodemon 3.1.14 | Backend development |
| Version control | Git and GitHub | Source code management |
| API testing | Postman | API testing |
| Code editor | Visual Studio Code | Development environment |

**Additional frontend dependencies:** React Leaflet 5.0.0, Leaflet 1.9.4 and Mapbox GL 3.33.0.

### Development Environment

The application was developed and tested using:

- Node.js: v24.21.0
- npm: 11.19.0
- Vite: v8.3.2
- PostgreSQL: Compatible PostgreSQL installation
- Operating system: macOS development environment
- Browser: Modern web browser

Dependency versions are managed through the respective `package.json` and lock files.

## 4. System Architecture

The application follows a three-layer client-server architecture.

```text
             USERS
 Participants | Organizers | Admin
                  |
                  v
          REACT FRONTEND
             (Vite)
                  |
             HTTP Requests
                  |
                  v
          NODE.JS + EXPRESS
              REST API
                  |
        Application Logic
        Authentication
        Input Validation
        Access Control
                  |
                  v
             POSTGRESQL
               DATABASE
```

### 4.1 Presentation Layer

The React frontend provides the user interface and handles user interactions. React Router DOM manages navigation between application pages.

### 4.2 Application Layer

The Node.js and Express backend handles API requests, authentication, application logic, validation and communication with the database.

### 4.3 Data Layer

PostgreSQL provides persistent storage for user accounts, events, registrations and related application information.

The frontend communicates with the backend through HTTP requests. The backend processes requests, interacts with PostgreSQL and returns appropriate responses to the frontend.

## 5. Database Design

PostgreSQL is used to store and manage the application's data.

The main data entities identified in the system design include:

| Entity | Description |
|---|---|
| User | Stores user account information and roles |
| Event | Stores event details and organizer associations |
| Registration | Stores participant event registrations |
| Attendance | Stores attendance-related information |
| Notification | Stores notification-related information |

These entities support the main application workflows, including account management, event creation, participant registration and attendance management.

## 6. Project Structure

The repository separates the frontend and backend into independent directories.

```text
local-events-platform/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── auth/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── ...
│
├── server/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── ...
│
├── .gitignore
└── README.md
```

The structure is representative of the main project directories. Individual files and additional configuration files are available in the repository.

## 7. Installation and Setup

Follow the instructions below to run Gada Events locally.

### 7.1 Prerequisites

Install the following before setting up the project:

- Node.js and npm.
- PostgreSQL.
- Git.
- Visual Studio Code or another code editor.
- A modern web browser.

### 7.2 Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/kkarangwa/local-events-platform.git
```

Navigate to the project directory:

```bash
cd local-events-platform
```

### 7.3 Database Configuration

1. Start your PostgreSQL server.
2. Create a database named `gada_events`.

```sql
CREATE DATABASE gada_events;
```

3. Configure the backend database connection using the environment variables expected by the server.
4. Ensure the required database schema and tables are initialized before running the application.

### 7.4 Backend Setup

Navigate to the server directory:

```bash
cd server
```

Install the dependencies:

```bash
npm install
```

Create the required `.env` file in the server directory.

The backend uses environment configuration for:

- Server port (`PORT`, defaulting to `5001`).
- JWT authentication secret (`JWT_SECRET`).
- Database connection settings.

Use the exact database environment variable names expected by the backend configuration. Do not commit credentials or authentication secrets to the repository.

Start the backend:

```bash
npm start
```

For development:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5001
```

### 7.5 Frontend Setup

Open a separate terminal and navigate to the client directory:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend is available at:

```text
http://localhost:5173
```

Open this address in your browser to access Gada Events.

### 7.6 Available Frontend Commands

Run these commands from the `client` directory:

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Generates the production build |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Previews the production build |

## 8. API Documentation

The Express backend exposes REST API endpoints to support authentication, event management and participant operations.

### 8.1 Health and Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks backend availability |
| GET | `/api/db-health` | Checks database connectivity |
| POST | `/api/auth/register` | Registers a user |
| POST | `/api/auth/login` | Authenticates a user |
| GET | `/api/auth/me` | Retrieves authenticated user information |

### 8.2 Event Management Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | Retrieves available events |
| GET | `/api/events/:id` | Retrieves a specific event |
| POST | `/api/events` | Creates an event |
| PATCH | `/api/events/:id` | Updates an event |
| PATCH | `/api/events/:id/publish` | Publishes an event |
| DELETE | `/api/events/:id` | Deletes an event |

### 8.3 Organizer and Participant Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/organizer/events` | Retrieves organizer events |
| GET | `/api/organizer/me` | Retrieves organizer information |
| PATCH | `/api/organizer/profile` | Updates organizer profile |
| GET | `/api/participant/registrations` | Retrieves participant registrations |

The API uses HTTP methods and JSON responses to support communication between the frontend and backend. Protected operations require appropriate authentication and authorization.

## 9. Testing and Validation

Testing was conducted to evaluate the functionality, integration and reliability of the application.

### 9.1 Functional Testing

Functional testing verified that the implemented features behaved as expected.

The following areas were tested:

- User registration and authentication.
- Event creation, editing and publishing.
- Event discovery, search and filtering.
- Event details.
- Participant registration and cancellation.
- Participant and organizer dashboards.
- Registration monitoring.
- Attendance management.
- Administrative functionality.
- Recommended Events and interest preference updates.

### 9.2 Integration Testing

Integration testing assessed communication between the frontend, backend and database.

The following end-to-end workflow was successfully tested:

1. An organizer creates and publishes an event.
2. A participant discovers the published event.
3. The participant registers for the event.
4. The organizer's registration count updates accordingly.

### 9.3 Negative Testing

Negative testing assessed how the application responds to invalid input and unauthorized actions.

The following scenarios were tested:

- Invalid registration details were rejected.
- Incomplete event creation details were rejected.
- Duplicate event registration was prevented.
- Unauthorized organizer access was blocked.
- Requests for nonexistent events were handled correctly.
- Registration attempts when event capacity was reached were prevented.

### 9.4 Build and Connectivity Validation

The following technical checks were completed:

- Backend startup was successful.
- Backend health endpoint returned a successful response.
- Database health endpoint confirmed a successful connection to `gada_events`.
- Frontend development server started successfully.
- Application pages loaded successfully.
- Production build completed successfully using `npm run build`.

**Performance and compatibility testing:** Formal performance benchmarking and cross-browser compatibility assessment remain outstanding. No measured response-time, resource-usage or browser-comparison results are claimed.

## 10. Code Quality and Technical Implementation

The application separates frontend presentation, backend request handling and database operations.

Key implementation considerations include:

- Modular organization of frontend pages and application functionality.
- Separation of frontend and backend responsibilities.
- REST API-based communication.
- Reusable React components and application routing.
- Centralized database connectivity.
- Authentication and role-based access restrictions.
- Validation of registration and event-management operations.
- Environment-based configuration for sensitive information.

The application implements business rules to maintain data integrity, including duplicate registration prevention and event capacity validation.

The production build completed successfully. The linting process also identified six outstanding issues involving React Fast Refresh export rules, an unused variable and state updates within React effects. These are documented as areas for further code-quality refinement.

## 11. Algorithms and Problem-Solving

Gada Events implements application logic to address practical challenges in event discovery, registration and event management.

### 11.1 Registration Validation

Before a registration is completed, the system checks whether the participant is already registered and whether the event has reached its capacity.

This helps prevent duplicate registrations and registrations beyond the permitted event capacity.

### 11.2 Event Discovery and Filtering

Participants can browse available events and use search and filtering functionality to identify events relevant to their requirements.

### 11.3 Interest-Based Recommendations

The Recommended Events feature uses participants' selected interests to determine which events to suggest.

When participants update their interest preferences, the recommendations displayed are updated accordingly.

These mechanisms support more organized event management and improve the participant experience.

## 12. Security Considerations

The application incorporates security measures to protect user accounts and restrict access to protected functionality.

These include:

- Password hashing using bcrypt.
- JWT-based authentication.
- Authentication checks for protected operations.
- Role-based access restrictions.
- Input validation.
- Environment-based configuration for sensitive credentials.

Database credentials and authentication secrets should remain outside the public repository.

## 13. Limitations and Future Improvements

The initial implementation focuses on the core requirements of local event management and participant registration in Kigali.

Potential future improvements include:

- Online payment integration.
- Advanced ticket management.
- Real-time event location and tracking features.
- More advanced recommendation capabilities.
- Advanced attendance analytics and prediction.
- Optimization for larger user populations.
- Expanded integration with external platforms.

These improvements can extend the platform beyond its initial minimum viable product scope.

## 14. Demonstration Video

The demonstration video provides a practical walkthrough of Gada Events and its implemented functionality.

**Video Link:** https://drive.google.com/file/d/1QhYVqA_Vud_0UhygsOt_9lAC1YjrTCwF/view?usp=drive_link

The demonstration covers:

- Application overview and navigation.
- Participant registration and authentication.
- Event discovery and registration.
- Participant dashboard.
- Organizer event creation and management.
- Registration monitoring and attendance management.
- Administrative functionality.
- Technical architecture and implementation.
- Testing and validation.

## 15. Final Product Technical Report

The accompanying technical report provides further details about the project scope, implemented functionality, technical architecture, testing results, code quality and problem-solving approach.

**Technical Report (PDF):** https://docs.google.com/document/d/16RHwHyF8qC7FujxU4vBuG3CkYnTnx2d6WPiZ6VvLYoM/edit?usp=sharing

## 16. Author and Repository Information

**Project:** Gada Events  
**Developer:** Kethia Karangwa  
**Programme:** Bachelor of Science in Software Engineering  
**Institution:** African Leadership University  
**Project Scope:** Kigali, Rwanda  

**GitHub Repository:**  
https://github.com/kkarangwa/local-events-platform

---

*Gada Events — Simplifying Local Event Management and Participant Registration.*
