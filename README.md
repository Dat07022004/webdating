# 💖 VibeMatch - The Gen Z Dating App

VibeMatch is a modern, vibrant dating platform built with the Gen Z audience in mind. Stop swiping on ghosts and start meeting verified profiles, discovering people with chaotic good energy, and matching with those who pass the vibe check.

<img width="2844" height="1540" alt="image" src="https://github.com/user-attachments/assets/51837777-feb9-4dfa-88c9-f1b31e10b0b3" />


## ✨ Key Features

- **Modern & Vibrant UI**: Immersive, dynamic design with gorgeous sunset gradients and 3D icons, focused on an intuitive Gen Z user experience.
- **Swiping & Matching**: Core swipe logic connected directly with an intelligent matching algorithm.
- **Real-time Messaging & Notifications**: Powered by Socket.io to ensure you never miss a beat when someone likes you back or sends a message.
- **High-Quality Video Calls**: Seamless in-app video dating experiences integrated with GetStream.io.
- **Robust Authentication**: Secure, effortless login and registration process handled by Clerk.
- **Comprehensive Admin Dashboard**: Complete moderation tools that allow administrators to manage users, handle reports, set roles, and keep the community safe.
- **User Role Management**: Tiered access (User, Admin, Premium) to control system capabilities.

## 🛠️ Technology Stack

### Frontend
- **React 18** & **Vite**: For a lightning-fast development and user experience.
- **Tailwind CSS** & **Framer Motion**: For beautiful, responsive styling and smooth micro-animations.
- **Radix UI**: Accessible, unstyled UI components as the foundation for the design system.
- **Clerk React**: Comprehensive user authentication and management.
- **React Query (@tanstack/react-query)**: Efficient data fetching and state management.
- **Socket.io Client**: Real-time communication for chat and notifications.
- **Zod & React Hook Form**: Type-safe form validation.

### Backend
- **Node.js** & **Express**: Blazing fast, asynchronous backend architecture.
- **MongoDB** & **Mongoose**: Flexible NoSQL database for managing users, matches, and messages.
- **Clerk Express**: Validating user sessions and managing permissions securely.
- **Socket.io**: Real-time server-side event handling.
- **GetStream API**: High-performance backend integration for video call token generation.
- **Cloudinary**: Cloud-based image upload and management.
- **multer**: Handling multipart/form-data for avatar and media uploads.
- **Inngest**: Background jobs and scheduled tasks.

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v20+) and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dat07022004/webdating.git
   cd webdating
   ```

2. Install dependencies for both frontend and backend in one stroke:
   ```bash
   npm run build
   ```
   *(Alternatively, you can `npm install` inside the `frontend` and `backend` directories individually).*

3. Set up environment variables:
   - Create a `.env` file in the `backend/` directory referencing your MongoDB URI, Clerk Secret Keys, Cloudinary config, and GetStream credentials.
   - Create a `.env` file in the `frontend/` directory referencing your Vite Clerk Publishable Key and backend API URL.

### Running the Application Locally

Start the backend and frontend development servers concurrently: 

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
npm run dev
```

The frontend should now be running on `http://localhost:5173` (or your configured Vite port) and the backend on the port specified in your `.env`.

## 🛡️ Security & Moderation

VibeMatch takes community safety seriously:
- **JWT & Clerk Verification**: Every protected backend route enforces strict token verification.
- **Role-Based Access Control (RBAC)**: Only authorized Admin users can access moderation endpoints (ban, block, roles).
- **Automated Filtering**: Banned and blocked users are restricted from API interactions, ensuring a secure environment for valid members.

## 📄 License

This project is licensed under the ISC License.
