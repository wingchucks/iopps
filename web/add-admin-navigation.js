const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function addAdminNavigation() {
  console.log('🔧 ADDING ADMIN NAVIGATION TO WEBSITE...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check if app directory structure exists
    const appDir = path.join(__dirname, 'app');
    const srcAppDir = path.join(__dirname, 'src', 'app');
    
    let layoutPath = null;
    
    if (fs.existsSync(path.join(appDir, 'layout.js'))) {
      layoutPath = path.join(appDir, 'layout.js');
    } else if (fs.existsSync(path.join(srcAppDir, 'layout.js'))) {
      layoutPath = path.join(srcAppDir, 'layout.js');
    } else if (fs.existsSync(path.join(__dirname, 'layout.js'))) {
      layoutPath = path.join(__dirname, 'layout.js');
    }
    
    console.log(`📍 Looking for layout file...`);
    
    if (layoutPath) {
      console.log(`✅ Found layout at: ${layoutPath}`);
      
      // Read the current layout
      let layoutContent = fs.readFileSync(layoutPath, 'utf8');
      
      // Check if AdminNavigation is already imported
      if (!layoutContent.includes('AdminNavigation')) {
        console.log('📝 Adding AdminNavigation to layout...');
        
        // Add import at the top
        const importLine = "import AdminNavigation from '@/components/AdminNavigation';";
        
        if (layoutContent.includes("import")) {
          // Add after other imports
          const lines = layoutContent.split('\n');
          let insertIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import')) {
              insertIndex = i + 1;
            }
          }
          
          if (insertIndex !== -1) {
            lines.splice(insertIndex, 0, importLine);
            layoutContent = lines.join('\n');
          }
        } else {
          // Add at the beginning
          layoutContent = importLine + '\n\n' + layoutContent;
        }
        
        // Add AdminNavigation component after opening body tag or in main content
        if (layoutContent.includes('<body')) {
          layoutContent = layoutContent.replace(
            /<body([^>]*)>/,
            '<body$1>\n        <AdminNavigation />'
          );
        } else if (layoutContent.includes('<main')) {
          layoutContent = layoutContent.replace(
            /<main([^>]*)>/,
            '<AdminNavigation />\n        <main$1>'
          );
        } else if (layoutContent.includes('{children}')) {
          layoutContent = layoutContent.replace(
            '{children}',
            '<AdminNavigation />\n        {children}'
          );
        }
        
        // Write back to file
        fs.writeFileSync(layoutPath, layoutContent);
        console.log('✅ Layout updated with AdminNavigation');
      } else {
        console.log('ℹ️  AdminNavigation already in layout');
      }
    } else {
      console.log('⚠️  No layout file found, creating root layout...');
      
      // Create a basic root layout with admin navigation
      const rootLayoutContent = `import AdminNavigation from '@/components/AdminNavigation';
import './globals.css';

export const metadata = {
  title: 'IOPPS - Indigenous Career Platform',
  description: 'Connecting Indigenous talent with meaningful career opportunities',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AdminNavigation />
        {children}
      </body>
    </html>
  );
}`;
      
      const newLayoutPath = path.join(appDir, 'layout.js');
      
      // Make sure app directory exists
      if (!fs.existsSync(appDir)) {
        fs.mkdirSync(appDir, { recursive: true });
      }
      
      fs.writeFileSync(newLayoutPath, rootLayoutContent);
      console.log(`✅ Created root layout at: ${newLayoutPath}`);
    }
    
    // 2. Create a direct admin access page at /admin-access for quick testing
    const adminAccessContent = `'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAccess() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to access admin features.</p>
            <Link href="/login">
              <Button>Log In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isNathan = user.email === 'nathan.arias@iopps.ca';
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Admin Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p><strong>User:</strong> {user.email}</p>
              <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
              <p><strong>UID:</strong> {user.uid}</p>
            </div>
            
            {isNathan ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-semibold">✅ Nathan Arias Detected</p>
                  <p className="text-green-700 text-sm">You should have admin access.</p>
                </div>
                
                <div className="flex gap-2">
                  <Link href="/admin">
                    <Button>Go to Admin Dashboard</Button>
                  </Link>
                  
                  <Link href="/admin/employers">
                    <Button variant="outline">Manage Employers</Button>
                  </Link>
                  
                  <Link href="/admin/premium-partners">
                    <Button variant="outline">Premium Partners</Button>
                  </Link>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 font-semibold">Need to grant database admin access?</p>
                  <p className="text-blue-700 text-sm">Run: <code>node grant-admin-access.js</code></p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-semibold">❌ Admin Access Denied</p>
                <p className="text-red-700 text-sm">You don't have admin privileges.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}`;
    
    const adminAccessPath = path.join(appDir, 'admin-access', 'page.js');
    
    // Make sure directory exists
    if (!fs.existsSync(path.dirname(adminAccessPath))) {
      fs.mkdirSync(path.dirname(adminAccessPath), { recursive: true });
    }
    
    fs.writeFileSync(adminAccessPath, adminAccessContent);
    console.log(`✅ Created admin access page at: /admin-access`);
    
    console.log('\n🎉 ADMIN NAVIGATION SETUP COMPLETE!');
    console.log('=' .repeat(50));
    console.log('📋 NEXT STEPS:');
    console.log('1. Run: node grant-admin-access.js');
    console.log('2. Deploy to Vercel');
    console.log('3. Visit: https://your-site.com/admin-access');
    console.log('4. Click "Go to Admin Dashboard"');
    
  } catch (error) {
    console.error('❌ Error adding admin navigation:', error.message);
  }
}

addAdminNavigation();