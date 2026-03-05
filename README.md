# InvoicePro Desktop

A professional, feature-rich desktop invoicing application built with Electron. InvoicePro Desktop helps freelancers and small businesses create, manage, and track invoices efficiently.

## Features

### Core Features ✅
- **📊 Dashboard & Analytics** - Visual statistics with color-coded cards and progress bars
  - Total revenue, invoices, paid, pending, and overdue amounts
  - Recent invoices with quick actions
  - Automatic status updates for overdue invoices

- **📄 Invoice Management** - Complete invoice lifecycle management
  - Create, edit, and manage professional invoices
  - Quick line item entry with item number lookup
  - Auto-calculation of totals and taxes
  - Status tracking (Draft, Pending, Paid, Overdue)

- **💼 Client Management** - Comprehensive client database
  - Customer numbers for quick identification
  - Full contact information storage
  - View client invoice history
  - Quick navigation to client invoices

- **📦 Saved Items Library** - Reusable line items
  - Item numbers for rapid invoice creation
  - Standardized pricing
  - Category organization

- **🔍 Search & Filters** - Powerful data discovery
  - Global search across all entities (Ctrl/Cmd+F)
  - Quick status filters (All, Unpaid, Paid, Overdue)
  - Date range filtering
  - Client-specific filtering

- **⚡ Batch Operations** - Process multiple invoices at once
  - Select multiple invoices with checkboxes
  - Bulk mark as paid
  - Bulk archive or delete

- **📥 PDF Export** - Professional invoice PDFs
  - One-click PDF generation
  - Optimized for single-page layout
  - Company branding included
  - Save anywhere on your system

- **💳 Payment Gateway Integration** - Accept online payments with multiple providers
  - **Stripe** - Credit/debit cards (2.9% + $0.30) - Most popular, feature-rich
  - **PayPal** - PayPal.me links (2.99% + $0.49) - Easiest setup, widely trusted
  - **Square** - Credit/debit cards (2.9% + $0.30) - POS integration available
  - **GoCardless** - ACH/SEPA bank transfers (1% + $0.25) - Lowest fees, bank direct debit
  - **Authorize.Net** - Enterprise gateway (2.9% + $0.30) - Government/B2B contracts
  - One-click payment link generation for each gateway
  - Copy-to-clipboard for easy sharing via email or message
  - 17 payment method options for manual payment tracking
  - Simple setup - no webhooks or complex servers needed
  - PCI-compliant hosted payment pages

- **⌨️ Keyboard Shortcuts** - Lightning-fast navigation
  - Full keyboard shortcut support
  - In-app shortcut reference (Ctrl/Cmd+/)
  - Context-aware shortcuts

- **🗄️ Archive System** - Organize completed work
  - Archive old invoices
  - Restore when needed
  - Keeps database clean

- **⚙️ Settings & Customization**
  - Company information and branding
  - Invoice numbering and formatting
  - Tax rates and payment terms
  - Theme customization

### Advanced Features ✅
- **✅ Email Integration** - Send invoices and quotes directly via email with PDF attachments
- **✅ Payment Gateway Integration** - Five payment gateways with one-click link generation
  - Stripe, PayPal, Square, GoCardless, Authorize.Net
- **✅ Payment Tracking** - Comprehensive payment management
  - Track 17 different payment methods (cash, check, card, ACH, wire, crypto, etc.)
  - Record manual payments with reference numbers and notes
  - Visual payment progress tracking
  - Automatic invoice status updates based on payments
- **✅ Quotes & Estimates** - Create professional quotes and convert to invoices

### Planned Features 📅
- **📅 Recurring Invoices** - Automate recurring billing
- **📅 Expense Tracking** - Track business expenses and generate reports
- **📅 Multi-Currency Support** - Handle international clients
- **📅 Automated Payment Webhooks** - Auto-update invoices when paid

## Quick Start

1. **Install dependencies**: `npm install`
2. **Run the app**: `npm run electron:dev`
3. **Create your first invoice**:
   - Set up company info in Settings
   - Add a client in Clients section
   - Create an invoice in Invoices section
4. **Learn keyboard shortcuts**: Press `Ctrl/Cmd + /`

📖 **[Read the Full User Guide](USER_GUIDE.md)** for detailed instructions on all features.

## Payment Gateway Setup

InvoicePro Desktop supports five payment gateways for online payment processing. Each gateway has different strengths:

### Comparison Table

| Gateway | Best For | Transaction Fees | Setup Difficulty | Payment Methods |
|---------|----------|------------------|------------------|-----------------|
| **Stripe** | Most businesses | 2.9% + $0.30 | Medium | Credit/Debit Cards |
| **PayPal** | Quick setup | 2.99% + $0.49 | Easy | PayPal Balance, Cards |
| **Square** | Retail/POS | 2.9% + $0.30 | Medium | Credit/Debit Cards |
| **GoCardless** | Recurring payments | 1% + $0.25 | Medium | ACH, SEPA Bank Transfer |
| **Authorize.Net** | Enterprise/B2B | 2.9% + $0.30 | Medium | Credit/Debit Cards |

### Quick Setup Guide

**Stripe**
1. Sign up at [stripe.com](https://stripe.com)
2. Navigate to Developers → API keys
3. Copy your Secret Key and Publishable Key
4. Paste into Settings → Payment Gateways → Stripe
5. Enable Stripe integration

**PayPal**
1. Get your PayPal.me username from [paypal.me](https://paypal.me)
2. Paste into Settings → Payment Gateways → PayPal
3. Enable PayPal integration

**Square**
1. Sign up at [squareup.com](https://squareup.com)
2. Go to Developer Dashboard → Applications
3. Copy your Access Token and Location ID
4. Paste into Settings → Payment Gateways → Square
5. Enable Square integration

**GoCardless**
1. Sign up at [gocardless.com](https://gocardless.com)
2. Navigate to Developers → Access Tokens
3. Copy your Access Token
4. Paste into Settings → Payment Gateways → GoCardless
5. Enable GoCardless integration

**Authorize.Net**
1. Sign up at [authorize.net](https://authorize.net)
2. Get your API Login ID and Transaction Key from Account → API Credentials
3. Paste into Settings → Payment Gateways → Authorize.Net
4. Select sandbox (testing) or production environment
5. Enable Authorize.Net integration

### Using Payment Links

1. Open an invoice in Invoice Preview
2. Click the payment gateway button (e.g., "Stripe Payment Link")
3. Copy the generated payment link
4. Send the link to your client via email or message
5. Client clicks the link and completes payment
6. Manually record the payment in the invoice when confirmed

## Screenshots
*Coming soon*

## Installation

### For Users

#### Windows
1. Download the latest `.exe` installer from [Releases](https://github.com/JNicometo/Invoicing_app/releases)
2. Run the installer
3. Launch InvoicePro Desktop from your Start Menu

#### macOS
1. Download the latest `.dmg` file from [Releases](https://github.com/JNicometo/Invoicing_app/releases)
2. Open the `.dmg` file
3. Drag InvoicePro Desktop to your Applications folder
4. Launch from Applications

#### Linux
1. Download the latest `.AppImage` or `.deb` from [Releases](https://github.com/JNicometo/Invoicing_app/releases)
2. For AppImage:
   ```bash
   chmod +x InvoicePro-Desktop-*.AppImage
   ./InvoicePro-Desktop-*.AppImage
   ```
3. For .deb:
   ```bash
   sudo dpkg -i invoicepro-desktop_*.deb
   ```

### For Developers

#### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

#### Setup
```bash
# Clone the repository
git clone https://github.com/JNicometo/Invoicing_app.git
cd Invoicing_app

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Development

### Project Structure
```
invoicepro-desktop/
├── .github/
│   ├── workflows/           # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/      # Issue templates
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Preload script
│   ├── renderer/            # UI components
│   └── utils/               # Utility functions
├── assets/                  # Icons and images
├── tests/                   # Test files
├── package.json
└── README.md
```

### Available Scripts
- `npm start` - Run the application
- `npm run electron:dev` - Run in development mode with live reload
- `npm run build` - Build for all platforms
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS
- `npm run build:linux` - Build for Linux
- `npm run fix-db` - Fix database schema (adds missing columns)
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Technology Stack
- **Framework**: Electron + React 18
- **UI Components**: React with Hooks
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: SQLite3 (via better-sqlite3)
- **PDF Generation**: Electron printToPDF API
- **Build Tool**: Vite
- **Build**: electron-builder
- **Testing**: Jest (planned)
- **CI/CD**: GitHub Actions

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'feat: add some feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a Pull Request

## Roadmap

### Completed ✅
- ✅ Project setup and repository initialization
- ✅ Complete invoice management system
- ✅ Client management with customer numbers
- ✅ Saved items library with item numbers
- ✅ Dashboard with visual statistics and charts
- ✅ PDF export functionality (optimized layout)
- ✅ Invoice numbering fix (proper sequential numbering)
- ✅ Archive system
- ✅ Global search functionality
- ✅ Quick filters and date range filtering
- ✅ Batch operations
- ✅ Keyboard shortcuts
- ✅ Automatic overdue status tracking
- ✅ Payment gateway integration (5 gateways)
  - ✅ Stripe integration (credit/debit cards)
  - ✅ PayPal.me integration (PayPal payments)
  - ✅ Square integration (credit/debit cards + POS)
  - ✅ GoCardless integration (ACH/SEPA bank transfers)
  - ✅ Authorize.Net integration (enterprise/B2B)
- ✅ Payment tracking system (17 payment methods)
- ✅ Email integration for invoices and quotes
- ✅ Quotes and estimates with conversion to invoices
- ✅ Comprehensive code documentation and comments

### In Progress 🚧
- 🚧 CI/CD pipeline with GitHub Actions
- 🚧 Automated testing setup
- 🚧 Application packaging for distribution

### Planned 📅
- 📅 Recurring invoices (automated)
- 📅 Expense tracking
- 📅 Multi-currency support
- 📅 Automated payment webhooks
- 📅 Mobile companion app
- 📅 Advanced reporting

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

Built applications will be in the `dist/` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Issues

**Database Column Errors**
```bash
npm run fix-db
```

**better-sqlite3 Module Error**
```bash
npm uninstall better-sqlite3
npm install better-sqlite3
npx electron-rebuild -f -w better-sqlite3
```

For more troubleshooting help, see the [User Guide - Troubleshooting Section](USER_GUIDE.md#troubleshooting).

## Support

- **User Guide**: [Complete User Guide](USER_GUIDE.md)
- **Documentation**: [Wiki](https://github.com/JNicometo/Invoicing_app/wiki)
- **Issues**: [GitHub Issues](https://github.com/JNicometo/Invoicing_app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JNicometo/Invoicing_app/discussions)

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Icons from [Heroicons](https://heroicons.com/)
- Inspired by the needs of freelancers and small businesses

## Security

If you discover a security vulnerability, please email [your-email@example.com]. Do not create a public issue.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.

---

Made with ❤️ for freelancers and small businesses
