const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan('🔧 GRUDA Legion Post-Install Setup...\n'));

// Create necessary directories
const directories = [
    'logs',
    'temp',
    'uploads',
    'exports'
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(chalk.green(`✅ Created directory: ${dir}`));
    }
});

// Create environment file if it doesn't exist
if (!fs.existsSync('.env')) {
    const envContent = `# GRUDA Legion Configuration
PORT=3000
FRONTEND_PORT=3001
NODE_ENV=production

# AI Service Configuration
ENABLE_PUTER=true
ENABLE_HUGGINGFACE=true
ENABLE_OPENROUTER=true
ENABLE_LOCAL=true

# Security
CORS_ORIGIN=*
RATE_LIMIT=100
`;

    fs.writeFileSync('.env', envContent);
    console.log(chalk.green('✅ Created .env configuration file'));
}

// Set up logging
const logConfig = {
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    installation: 'complete'
};

fs.writeFileSync('logs/install.log', JSON.stringify(logConfig, null, 2));
console.log(chalk.green('✅ Logging configured'));

console.log(chalk.cyan('\n🎉 Post-install setup complete!'));
console.log(chalk.yellow('💡 You can now run: npm start'));
console.log(chalk.yellow('🌐 Access at: http://localhost:3000\n'));
