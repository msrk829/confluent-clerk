import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  LayoutDashboard, 
  FileText, 
  Shield, 
  Users, 
  LogOut,
  CheckSquare,
  FileSearch
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = user?.is_admin
    ? [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: CheckSquare, label: 'Pending Requests', path: '/admin/requests' },
        { icon: Database, label: 'Topics & ACLs', path: '/admin/kafka' },
        { icon: FileSearch, label: 'Audit Logs', path: '/admin/audit' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'Request Topic', path: '/request/topic' },
        { icon: Shield, label: 'Request ACL', path: '/request/acl' },
        { icon: Users, label: 'My Requests', path: '/requests' },
      ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Database className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sidebar-foreground font-bold text-lg">Kafka Admin</h1>
          <p className="text-sidebar-foreground/60 text-xs">Enterprise Portal</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-4 space-y-3">
        <div className="px-2">
          <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
          <p className="text-sm text-sidebar-foreground font-medium truncate">{user?.username}</p>
          <p className="text-xs text-sidebar-foreground/60">
            {user?.is_admin ? 'Administrator' : 'User'}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
