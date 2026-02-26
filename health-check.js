const axios = require('axios');
const chalk = require('chalk');

async function runHealthCheck() {
    console.log(chalk.cyan('🏥 GRUDA Legion Health Check\n'));
    
    const checks = [
        { name: 'Server Status', url: 'http://localhost:3000/health' },
        { name: 'API Status', url: 'http://localhost:3000/api/status' },
        { name: 'Frontend Access', url: 'http://localhost:3001' }
    ];
    
    let healthy = 0;
    let unhealthy = 0;
    
    for (const check of checks) {
        try {
            console.log(chalk.yellow(`Checking ${check.name}...`));
            
            const response = await axios.get(check.url, {
                timeout: 5000,
                validateStatus: (status) => status < 500
            });
            
            if (response.status === 200) {
                console.log(chalk.green(`✅ ${check.name} - HEALTHY`));
                console.log(chalk.gray(`   Status: ${response.status}`));
                
                if (response.data) {
                    if (response.data.status) {
                        console.log(chalk.gray(`   Response: ${response.data.status}`));
                    }
                    if (response.data.uptime) {
                        console.log(chalk.gray(`   Uptime: ${Math.floor(response.data.uptime / 1000)}s`));
                    }
                }
                
                healthy++;
            } else {
                console.log(chalk.yellow(`⚠️ ${check.name} - WARNING`));
                console.log(chalk.gray(`   Status: ${response.status}`));
                unhealthy++;
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ ${check.name} - UNHEALTHY`));
            console.log(chalk.gray(`   Error: ${error.message}`));
            unhealthy++;
        }
        
        console.log('');
    }
    
    console.log(chalk.cyan('📊 Health Check Results:'));
    console.log(chalk.green(`✅ Healthy: ${healthy}`));
    console.log(chalk.red(`❌ Unhealthy: ${unhealthy}`));
    console.log(chalk.blue(`📋 Total: ${checks.length}\n`));
    
    if (unhealthy === 0) {
        console.log(chalk.green('🎉 All services are healthy! GRUDA Legion is running perfectly.'));
        return true;
    } else {
        console.log(chalk.yellow('⚠️ Some services are not responding. Check the logs for details.'));
        return false;
    }
}

// Run health check if called directly
if (require.main === module) {
    runHealthCheck()
        .then((healthy) => {
            process.exit(healthy ? 0 : 1);
        })
        .catch((error) => {
            console.error(chalk.red('Health check failed:'), error);
            process.exit(1);
        });
}

module.exports = { runHealthCheck };
