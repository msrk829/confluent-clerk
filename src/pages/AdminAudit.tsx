import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, RefreshCw, Filter, Calendar, User, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: string;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

const AdminAudit = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual API call when audit service is ready
      // For now, showing placeholder data
      setAuditLogs([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          user_id: 'alice@company.com',
          action: 'LOGIN',
          resource_type: 'AUTH',
          details: 'User logged in successfully',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'SUCCESS'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          user_id: 'bob@company.com',
          action: 'CREATE_TOPIC_REQUEST',
          resource_type: 'REQUEST',
          resource_id: 'req-123',
          details: 'Created topic request for user-events',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'SUCCESS'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          user_id: 'admin@company.com',
          action: 'APPROVE_REQUEST',
          resource_type: 'REQUEST',
          resource_id: 'req-122',
          details: 'Approved ACL request for order-processing topic',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'SUCCESS'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          user_id: 'charlie@company.com',
          action: 'LOGIN_FAILED',
          resource_type: 'AUTH',
          details: 'Failed login attempt - invalid credentials',
          ip_address: '192.168.1.103',
          user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          status: 'FAILURE'
        }
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAuditLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case 'FAILURE':
        return <Badge variant="destructive">Failure</Badge>;
      case 'WARNING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Warning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <User className="w-4 h-4" />;
    if (action.includes('REQUEST')) return <FileSearch className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Audit Logs</h1>
                <p className="text-muted-foreground">Monitor system activities and user actions</p>
              </div>
              <Button onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Filter audit logs by search term, action, or status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search by user, action, or details..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Action</label>
                    <Select value={filterAction} onValueChange={setFilterAction}>
                      <SelectTrigger>
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                        <SelectItem value="CREATE_TOPIC_REQUEST">Create Topic Request</SelectItem>
                        <SelectItem value="CREATE_ACL_REQUEST">Create ACL Request</SelectItem>
                        <SelectItem value="APPROVE_REQUEST">Approve Request</SelectItem>
                        <SelectItem value="REJECT_REQUEST">Reject Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILURE">Failure</SelectItem>
                        <SelectItem value="WARNING">Warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5" />
                  Audit Trail
                </CardTitle>
                <CardDescription>
                  Showing {filteredLogs.length} of {auditLogs.length} audit log entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading audit logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {auditLogs.length === 0 ? 'No audit logs found' : 'No logs match the current filters'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatDate(log.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.user_id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <Badge variant="secondary">{log.action}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.resource_type}</div>
                              {log.resource_id && (
                                <div className="text-sm text-muted-foreground font-mono">{log.resource_id}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                          <TableCell className="max-w-xs truncate" title={log.details}>
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Service Status</CardTitle>
                  <CardDescription>
                    Current status of audit logging service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Activity className="w-4 h-4" />
                    <span>Audit service integration is in development</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Real-time audit logging will be available once the audit service is fully integrated.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAudit;