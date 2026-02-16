# Business Management System (BMS)

A comprehensive Business Management System designed to streamline operations across various departments including Inventory, Sales, HR, Finance, and Customer Management. This application provides a modern, responsive interface for managing day-to-day business activities.

## 🚀 Features

- **Dashboard**: Real-time overview of key business metrics and recent activities.
- **Inventory Management**: Track stock levels, manage products, and monitor inventory movements.
- **Order Management**: Process and track customer orders from creation to fulfillment.
- **Sales Tracking**: Monitor sales performance and view transaction histories.
- **Customer Relationship Management (CRM)**: Manage customer profiles and interactions.
- **Supplier Management**: Maintain supplier details and procurement records.
- **Human Resources (HR)**: Manage employee records and roles.
- **Finance & Expenses**: Track business expenses and financial health.
- **Reports**: Generate detailed reports for business insights.
- **Settings**: Configure system preferences and user roles.

## 🛠️ Tech Stack

### Frontend

- **Framework**: [React](https://react.dev/) (via [Vite](https://vitejs.dev/))
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Tailwindcss Animate](https://github.com/jamiebuilds/tailwindcss-animate)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) (Primitives), [Lucide React](https://lucide.dev/) (Icons)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Charts**: [Recharts](https://recharts.org/)
- **Date Handling**: [date-fns](https://date-fns.org/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

### Backend

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Security**: [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors)
- **Logging**: [Morgan](https://github.com/expressjs/morgan)

## 📂 Project Structure

```
Business-Management-System/
├── backend/                # Node.js/Express Backend
│   ├── routes/             # API Routes
│   ├── index.js            # Entry point
│   ├── package.json        # Backend dependencies
│   └── ...
├── frontend/               # React/Vite Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages (Dashboard, Orders, etc.)
│   │   ├── lib/            # Utilities
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # State management stores
│   │   └── ...
│   ├── index.html          # Entry HTML
│   ├── package.json        # Frontend dependencies
│   └── ...
└── README.md               # Project Documentation
```

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A [Supabase](https://supabase.com/) project for the database.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd Business-Management-System
    ```

2.  **Setup Backend:**

    ```bash
    cd backend
    npm install
    ```

    - Create a `.env` file in the `backend` directory with your Supabase credentials:
      ```env
      PORT=5000
      SUPABASE_URL=your_supabase_url
      SUPABASE_KEY=your_supabase_anon_key
      ```

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the Backend Server:**

    ```bash
    cd backend
    npm run dev
    ```

    The backend will start on `http://localhost:5000` (or your configured PORT).

2.  **Start the Frontend Development Server:**
    Open a new terminal window:

    ```bash
    cd frontend
    npm run dev
    ```

    The frontend will typically start on `http://localhost:5173`.

3.  **Access the App:**
    Open your browser and navigate to the URL shown in the frontend terminal (e.g., `http://localhost:5173`).

## 📄 License

[ISC](https://opensource.org/licenses/ISC)
