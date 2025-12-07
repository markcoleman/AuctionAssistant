# AuctionAssistant

A small web app that allows you to easily post items in marketplace.

## Features

- Express.js web server
- TypeScript for type safety
- ESLint and Prettier for code quality
- Jest for testing
- Environment configuration using dotenv

## Project Structure

```
AuctionAssistant/
├── src/              # Source code
├── tests/            # Test files
├── public/           # Static files
├── config/           # Configuration files
├── dist/             # Compiled JavaScript (generated)
└── node_modules/     # Dependencies (generated)
```

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/markcoleman/AuctionAssistant.git
cd AuctionAssistant
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Building

Build the TypeScript code:
```bash
npm run build
```

## Running

Start the production server:
```bash
npm start
```

The server will start on port 3000 by default (configurable via PORT environment variable).

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Code Quality

Run linter:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run lint:fix
```

Check code formatting:
```bash
npm run format:check
```

Auto-format code:
```bash
npm run format
```

## API Endpoints

- `GET /` - Welcome message and API status
- `GET /health` - Health check endpoint

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **Continuous Integration**: Automated testing, linting, type checking, and build verification on every push and PR
- **Dependabot**: Automated dependency updates for npm packages and GitHub Actions
- **Deployment**: Automated deployment workflow (configurable for your hosting provider)

See [.github/WORKFLOWS.md](.github/WORKFLOWS.md) for detailed documentation about the CI/CD setup.

### CI Status

All code changes are automatically validated through our CI pipeline:
- ✅ TypeScript type checking
- ✅ ESLint code quality checks
- ✅ Prettier formatting validation
- ✅ Jest test suite
- ✅ Build verification

## License

ISC

