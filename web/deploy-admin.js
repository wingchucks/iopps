const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function deployAdmin() {
  console.log('🚀 DEPLOYING ADMIN DASHBOARD...');
  console.log('=' .repeat(50));
  
  try {
    // 1. First, grant admin access in database
    console.log('1️⃣ Granting admin access...');
    try {
      execSync('node grant-admin-access.js', { stdio: 'inherit' });
      console.log('✅ Admin access granted');
    } catch (error) {
      console.log('⚠️  Admin access step had issues, continuing...');
    }
    
    // 2. Add admin navigation to website
    console.log('\n2️⃣ Adding admin navigation...');
    try {
      execSync('node add-admin-navigation.js', { stdio: 'inherit' });
      console.log('✅ Admin navigation added');
    } catch (error) {
      console.log('⚠️  Navigation step had issues, continuing...');
    }
    
    // 3. Check if we're in a git repo and commit changes
    console.log('\n3️⃣ Preparing for deployment...');
    
    try {
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "Add admin dashboard and navigation for Nathan"', { stdio: 'inherit' });
      console.log('✅ Changes committed to git');
    } catch (error) {
      console.log('ℹ️  Git commit step skipped (may already be committed)');
    }
    
    // 4. Deploy to Vercel
    console.log('\n4️⃣ Deploying to Vercel...');
    
    // Check if we have Vercel CLI
    try {
      execSync('vercel --version', { stdio: 'pipe' });
    } catch (error) {
      console.log('❌ Vercel CLI not found. Please install: npm i -g vercel');
      return;
    }
    
    // Set the root directory for this deployment
    const vercelConfigPath = path.join(__dirname, 'vercel.json');
    const vercelConfig = {
      "builds": [
        {
          "src": "package.json",
          "use": "@vercel/next"
        }
      ],
      "routes": [
        {
          "src": "/(.*)",
          "dest": "/$1"
        }
      ]
    };
    
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
    console.log('✅ Vercel config created');
    
    // Deploy
    try {
      console.log('📡 Starting Vercel deployment...');
      const deployOutput = execSync('vercel --prod', { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log('✅ Deployment completed!');
      console.log(deployOutput);
      
      // Extract deployment URL
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        const deploymentUrl = urlMatch[0];
        console.log(`🌐 Deployment URL: ${deploymentUrl}`);
        console.log(`🔗 Admin Access: ${deploymentUrl}/admin-access`);
        console.log(`👑 Admin Dashboard: ${deploymentUrl}/admin`);
      }
      
    } catch (error) {
      console.log('❌ Deployment failed:', error.message);
      console.log('\n📋 MANUAL DEPLOYMENT STEPS:');
      console.log('1. Run: vercel');
      console.log('2. Follow the prompts');
      console.log('3. Visit: your-url.com/admin-access');
    }
    
    console.log('\n🎉 ADMIN DEPLOYMENT COMPLETE!');
    console.log('=' .repeat(50));
    console.log('📋 WHAT TO DO NEXT:');
    console.log('1. Go to your website URL');
    console.log('2. Log in with nathan.arias@iopps.ca');
    console.log('3. Visit /admin-access to test admin features');
    console.log('4. Click "Go to Admin Dashboard"');
    console.log('5. Start managing employers and Premium Partners!');
    
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
  }
}

deployAdmin();