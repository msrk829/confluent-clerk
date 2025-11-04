import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Shield, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { requestApi, kafkaApi, userApi } from '@/services/api';

interface DashboardStats {
  topicsCount: number;
  pendingRequestsCount: number;
  activeAclsCount: number;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    topicsCount: 0,
    pendingRequestsCount: 0,
    activeAclsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch user requests to count pending ones
        const userRequests = await requestApi.getUserRequests();
        const pendingCount = Array.isArray(userRequests) 
          ? userRequests.filter((req: any) => req.status === 'PENDING').length 
          : 0;

        // Fetch user topics (ACL-filtered on backend if available)
        const topicsResponse = await userApi.getTopics() as { topics?: any[] };
        const topicsCount = topicsResponse?.topics?.length || 0;

        // Populate ACL count by filtering ACL list for current user
        let activeAclsCount = 0;
        try {
          // Prefer backend user-specific ACL endpoint if available
          let aclsResponse: any;
          try {
            aclsResponse = await userApi.getACLs();
          } catch {
            // Fallback to cluster ACLs (admin protected in backend); if accessible, filter client-side
            aclsResponse = await kafkaApi.getACLs();
          }
          const acls = (aclsResponse as any)?.acls || [];
          const username = (user?.username || '').toLowerCase();
          activeAclsCount = acls.filter((acl: any) => {
            const principal = (acl.principal || '').toLowerCase();
            return username && principal.includes(username);
          }).length;
        } catch (aclErr) {
          // Keep default 0 on error
          console.warn('Failed to fetch ACLs for user dashboard:', aclErr);
        }

        setStats({
          topicsCount,
          pendingRequestsCount: pendingCount,
          activeAclsCount,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
            <p className="text-muted-foreground">
              Manage your Kafka topics and ACL permissions
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Topics</CardTitle>
                <CardDescription>Topics you have access to</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? '...' : stats.topicsCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Requests</CardTitle>
                <CardDescription>Awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? '...' : stats.pendingRequestsCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active ACLs</CardTitle>
                <CardDescription>Current permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? '...' : stats.activeAclsCount}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/request/topic">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Request New Topic</CardTitle>
                        <CardDescription className="mt-1">
                          Create a new Kafka topic with custom configuration
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/request/acl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Request ACL Permission</CardTitle>
                        <CardDescription className="mt-1">
                          Request access to topics or consumer groups
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link to="/requests">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">View Request History</CardTitle>
                        <CardDescription className="mt-1">
                          Track status of all your submitted requests
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
