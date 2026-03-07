# InvoicePro Desktop - Installation & Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning the repository)

## Installation Steps

### 1. Clone or Download the Repository

```bash
git clone https://github.com/JNicometo/Invoicing_app.git
cd Invoicing_app
```

Or download and extract the ZIP file from GitHub.

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- React and React DOM
- Electron
- Tailwind CSS
- Better-SQLite3 (for database)
- Lucide React (icons)
- Date-fns (date formatting)
- And more...

**Note:** If you encounter issues with `better-sqlite3` on Windows, you may need to install the Windows Build Tools:

```bash
npm install --global windows-build-tools
```

### 3. Development Mode

To run the application in development mode:

```bash
npm run electron:dev
```

This command will:
1. Start the React development server on `http://localhost:3000`
2. Wait for the server to be ready
3. Launch the Electron application

The app will open automatically, and you'll have hot-reload enabled for React components.

### 4. Build for Production

To build the application for production:

```bash
# Build for current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

The built application will be in the `dist/` directory.

## Project Structure

```
invoicepro-desktop/
├── database/              # Database layer
│   ├── schema.sql        # Database schema
│   └── db.js            # Database operations
├── public/               # Public assets
│   ├── index.html       # HTML template
│   └── manifest.json    # App manifest
├── src/
│   ├── components/      # React components
│   │   ├── Dashboard.jsx
│   │   ├── InvoiceList.jsx
│   │   ├── InvoiceForm.jsx
│   │   ├── InvoicePreview.jsx
│   │   ├── ClientManagement.jsx
│   │   ├── SavedItems.jsx
│   │   ├── Archive.jsx
│   │   └── Settings.jsx
│   ├── hooks/          # Custom React hooks
│   │   └── useDatabase.js
│   ├── utils/          # Utility functions
│   │   ├── formatting.js
│   │   └── validation.js
│   ├── App.jsx         # Main app component
│   ├── index.js        # React entry point
│   └── index.css       # Global styles
├── electron.js         # Electron main process
├── preload.js          # Electron preload script
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
```

## Features

### Core Features
- **Dashboard** - Overview of your business metrics
- **Invoice Management** - Create, edit, and manage invoices
- **Client Management** - Store and organize client information
- **Saved Items** - Reusable line items for faster invoice creation
- **Archive** - Archive and restore old invoices
- **Settings** - Customize company info, invoice settings, and themes

### Database
- Local SQLite database stored in your user data directory
- All data stays on your computer
- No internet connection required

### Invoice Features
- Professional invoice templates
- PDF preview and export
- Multiple status tracking (Draft, Pending, Paid, Overdue)
- Automatic invoice numbering
- Tax calculations
- Custom payment terms

## Configuration

### Company Settings
1. Open the application
2. Navigate to **Settings** → **Company Info**
3. Fill in your company details:
   - Company name and contact info
   - Address
   - Logo URL (optional)
4. Click **Save Settings**

### Invoice Settings
1. Go to **Settings** → **Invoice Settings**
2. Configure:
   - Invoice number prefix
   - Tax rate
   - Default payment terms
   - Bank/payment details
3. Click **Save Settings**

## Usage

### Creating an Invoice

1. Click **Invoices** in the sidebar
2. Click **New Invoice**
3. Select a client or create a new one
4. Add line items (you can use saved items for faster entry)
5. Review the calculated totals
6. Add notes and payment terms if needed
7. Click **Create Invoice**

### Managing Clients

1. Click **Clients** in the sidebar
2. Click **New Client** to add a client
3. Fill in client information
4. View client statistics (total invoiced, paid, outstanding)
5. Edit or delete clients as needed

### Using Saved Items

1. Click **Saved Items** in the sidebar
2. Click **New Item**
3. Enter description, rate, and category
4. Use these items when creating invoices for faster data entry

## Troubleshooting

### Database Issues

If you encounter database errors:
1. Close the application
2. Delete the database file:
   - **Windows:** `%APPDATA%/invoicepro-desktop/invoicepro.db`
   - **macOS:** `~/Library/Application Support/invoicepro-desktop/invoicepro.db`
   - **Linux:** `~/.config/invoicepro-desktop/invoicepro.db`
3. Restart the application (a new database will be created)

### Build Issues

If `better-sqlite3` fails to build:

**Windows:**
```bash
npm install --global windows-build-tools
npm rebuild better-sqlite3
```

**macOS:**
```bash
xcode-select --install
npm rebuild better-sqlite3
```

**Linux:**
```bash
sudo apt-get install build-essential python3
npm rebuild better-sqlite3
```

### React Scripts Issues

If you get `react-scripts` errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building React App Only
```bash
npm run build
```

## Support

For issues, questions, or contributions:
- GitHub Issues: [https://github.com/JNicometo/Invoicing_app/issues](https://github.com/JNicometo/Invoicing_app/issues)
- Documentation: [https://github.com/JNicometo/Invoicing_app/wiki](https://github.com/JNicometo/Invoicing_app/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [Lucide Icons](https://lucide.dev/)
