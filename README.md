# CRMPlus

A full-featured Customer Relationship Management (CRM) web application built with **React**, **C# / .NET Core**, and **SQL Server**.

---

## Features

### Accounts & Contacts
- Manage **Account** and **Contact** entities with full CRUD operations
- Link contacts to accounts
- Log **activities** against accounts and contacts — notes, emails, and more

### User & Team Management
- Create and manage **Users** and **Teams**
- Role-based access control
- **Timesheet approval workflow** — employees submit timesheets; line managers review, approve, or reject them

### Timesheets & Work Items
- Create **timesheets** with associated work items
- Line manager review / approve / reject workflow
- Track time logged against specific work items and projects

### Projects & Work Items
- Manage **Projects** and nested **Work Items**
- Assign work items to users
- **Schedule** work items with due dates and priorities
- Dashboard view of all assigned work items
- Real-time **progress tracking** per work item

### Product Catalog
- Maintain a **Product Catalog** with pricing
- Associate products and prices with quotes and invoices

### Quotes & Invoices
- Generate **Quotes** from product catalog line items
- Convert quotes to **Invoices**
- Track invoice status (draft, sent, paid)

### Authentication
- User login via **email and password**
- Secure credential storage (hashed passwords)
- JWT-based session management

### Audit History
- Optional **audit history** per entity — track who created, modified, or deleted records and when
- Configurable at the entity level

### Dashboard
- Personalised dashboard showing **assigned work items**
- At-a-glance status of timesheets pending approval
- Quick access to recent accounts, contacts, and open invoices

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (TypeScript) |
| Backend | C# / .NET Core Web API |
| Database | SQL Server |
| Auth | JWT (JSON Web Tokens) |
| ORM | Entity Framework Core |

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- SQL Server (local or Azure SQL)

### Backend

```bash
cd src/api
dotnet restore
dotnet ef database update   # run migrations
dotnet run
```

### Frontend

```bash
cd src/client
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:5000` (API).

---

## Project Structure

```
CRMPlus/
├── src/
│   ├── api/                  # .NET Core Web API
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Data/             # EF Core DbContext & migrations
│   └── client/               # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── api/          # API client / service layer
│       └── public/
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT
