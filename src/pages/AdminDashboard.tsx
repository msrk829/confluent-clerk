import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Shield, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestApi, kafkaApi, auditApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  pendingRequests: number;
  totalTopics: number;
  activeACLs: number;
  approvedToday: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
}

interface Request {
  id: string;
  user_id: string;
  request_type: 'TOPIC' | 'ACL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  rationale: string;
  details: any;
  admin_user_id?: string;
  rejection_reason?: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes: Record<string, any>;
  timestamp: string;
  ip_address?: string | null;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    totalTopics: 0,
    activeACLs: 0,
    approvedToday: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalPending: 0,
  });
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all requests to calculate statistics
      const allRequests = await requestApi.getAllRequests() as Request[];
      
      // Calculate statistics
      const pendingRequests = allRequests.filter(req => req.status === 'PENDING').length;
      const approvedRequests = allRequests.filter(req => req.status === 'APPROVED');
      const rejectedRequests = allRequests.filter(req => req.status === 'REJECTED');
      
      // Calculate approved today (last 24 hours)
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const approvedToday = approvedRequests.filter(req => 
        req.approved_at && new Date(req.approved_at) >= yesterday
      ).length;

      // Fetch Kafka data
      let totalTopics = 0;
      let activeACLs = 0;
      
      try {
        const [topicsResponse, aclsResponse, auditLogs] = await Promise.all([
          kafkaApi.getTopics(),
          kafkaApi.getACLs(),
          auditApi.getLogs({ limit: 5 })
        ]);

        totalTopics = (topicsResponse as any)?.topics?.length ?? 0;
        const aclList = (aclsResponse as any)?.acls ?? [];
        activeACLs = Array.isArray(aclList) ? aclList.filter((a: any) => (a?.permission || '').toUpperCase() === 'ALLOW').length : 0;
        setRecentActivity((auditLogs as any[]) || []);
      } catch (kafkaError) {
        console.warn('Failed to fetch Kafka data or audit logs:', kafkaError);
        // Keep default values if APIs fail
      }

      setStats({
        pendingRequests,
        totalTopics,
        activeACLs,
        approvedToday,
        totalApproved: approvedRequests.length,
        totalRejected: rejectedRequests.length,
        totalPending: pendingRequests,
      });

      // Set recent pending requests (last 5)
      const recentPending = allRequests
        .filter(req => req.status === 'PENDING')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setRecentRequests(recentPending);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage Kafka cluster, approve requests, and monitor activity
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? '...' : stats.pendingRequests}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Total Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? '...' : stats.totalTopics}</p>
                <p className="text-xs text-muted-foreground mt-1">Across cluster</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Active ACLs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? '...' : stats.activeACLs}</p>
                <p className="text-xs text-muted-foreground mt-1">Permissions set</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Approved Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? '...' : stats.approvedToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>Latest requests requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentRequests.length > 0 ? (
                  <div className="space-y-4">
                    {recentRequests.map((request) => (
                      <div key={request.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {request.request_type === 'TOPIC' ? 'Topic Request' : 'ACL Request'}: {request.details?.topic_name || request.details?.resource_name || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {request.user_id} • {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No pending requests</p>
                    </div>
                  </div>
                )}
                <Link to="/admin/requests">
                  <Button variant="outline" className="w-full">
                    View All Requests
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest audit log entries</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((log) => (
                      <div key={log.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.action.replace(/_/g, ' ')}: {log.changes?.topic_name || log.changes?.resource_name || log.entity_id || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {log.user_id} • {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No recent activity</p>
                    </div>
                  </div>
                )}
                <Link to="/admin/audit">
                  <Button variant="outline" className="w-full">
                    View Audit Logs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Statistics</CardTitle>
              <CardDescription>Request outcomes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">Approved</span>
                  </div>
                  <span className="text-sm font-medium">{loading ? '...' : stats.totalApproved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm">Rejected</span>
                  </div>
                  <span className="text-sm font-medium">{loading ? '...' : stats.totalRejected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="text-sm font-medium">{loading ? '...' : stats.totalPending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
